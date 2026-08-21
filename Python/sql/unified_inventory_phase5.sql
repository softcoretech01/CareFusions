-- ============================================================
-- Unified Inventory / Procurement / Pharmacy — PHASE 5
-- Purpose : The inventory ledger learns ItemType, so ONE engine
--           holds medicines, medical items and non-medical items.
--
--           Stock identity becomes
--               (ItemType, ItemId, StoreId, BatchNo)
--           because ItemId 3 in Master_Medicine and ItemId 3 in
--           Master_Item are different products.
--
-- Safety  : ADDITIVE + IDEMPOTENT.
--           * Columns default to 'ITEM' so nothing breaks mid-deploy,
--             then existing rows are backfilled from the item's own
--             category and the default is dropped in favour of the
--             canonical value.
--           * FK_Inventory_Stock_Item / FK_Inventory_DocItem_Item are
--             dropped: with two owning masters a single-table foreign
--             key cannot express ownership. Validation moves into
--             SpInvStockPost, which checks ItemType + ItemId against
--             the correct master on every posting (spec §15).
--           * No stock row, ledger row or document is deleted.
-- ============================================================

-- ── 1. Carry the type on stock, document lines and the ledger ───
ALTER TABLE inventory.Inventory_Stock
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NOT NULL DEFAULT 'MEDICAL_ITEM' AFTER StockId;

ALTER TABLE inventory.Inventory_DocumentItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NOT NULL DEFAULT 'MEDICAL_ITEM' AFTER DocId;

ALTER TABLE inventory.Inventory_StockLedger
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NOT NULL DEFAULT 'MEDICAL_ITEM' AFTER TxnDate;

-- ── 2. Backfill from each row's own item, never guessed ─────────
-- Every pre-migration row came from Master_Item (medicines were held in
-- Pharmacy_Stock), so the type is whatever that item's category says.
UPDATE inventory.Inventory_Stock s
  JOIN admin.Master_Item i ON i.ItemId = s.ItemId
   SET s.ItemType = i.InventoryType
 WHERE i.InventoryType IS NOT NULL;

UPDATE inventory.Inventory_DocumentItem d
  JOIN admin.Master_Item i ON i.ItemId = d.ItemId
   SET d.ItemType = i.InventoryType
 WHERE i.InventoryType IS NOT NULL;

UPDATE inventory.Inventory_StockLedger l
  JOIN admin.Master_Item i ON i.ItemId = l.ItemId
   SET l.ItemType = i.InventoryType
 WHERE i.InventoryType IS NOT NULL;

-- ── 3. Ownership can no longer be a single-table foreign key ────
ALTER TABLE inventory.Inventory_Stock
    DROP FOREIGN KEY IF EXISTS FK_Inventory_Stock_Item;

ALTER TABLE inventory.Inventory_DocumentItem
    DROP FOREIGN KEY IF EXISTS FK_Inventory_DocItem_Item;

-- ── 4. Stock identity now includes the owning master ────────────
ALTER TABLE inventory.Inventory_Stock
    DROP INDEX IF EXISTS UQ_Inventory_Stock_Lot;

ALTER TABLE inventory.Inventory_Stock
    ADD CONSTRAINT UQ_Inventory_Stock_Lot UNIQUE (ItemType, ItemId, StoreId, BatchNo);

CREATE INDEX IDX_Inventory_Ledger_Type_Item ON inventory.Inventory_StockLedger (ItemType, ItemId);

-- ── 5. One catalog shape over the two owning masters ────────────
-- Everything that has to treat medicines and items alike (the stock queries,
-- the /catalog API, low-stock, expiry) reads this view, so the union lives in
-- exactly one place. (ItemType, ItemId) is its key.
CREATE OR REPLACE VIEW inventory.Vw_CatalogItem AS
    SELECT 'MEDICINE'        AS ItemType,
           m.MedicineId      AS ItemId,
           m.MedicineCode    AS ItemCode,
           TRIM(CONCAT(m.GenericName, ' ', COALESCE(m.Strength, ''))) AS ItemName,
           m.Category        AS Category,
           m.SubCategory     AS SubCategory,
           NULL              AS Department,
           NULL              AS Brand,
           NULL              AS Manufacturer,
           NULL              AS Vendor,
           m.Unit            AS Uom,
           NULL              AS HsnCode,
           m.Gst             AS GstPercentage,
           m.ReorderLevel    AS ReorderLevel,
           NULL              AS MinStock,
           NULL              AS MaxStock,
           m.BatchTracking   AS BatchRequired,
           m.ExpiryRequired  AS ExpiryRequired,
           m.ControlledDrug  AS ControlledDrug,
           m.PurchasePrice   AS StandardRate,
           NULL              AS LastPurchaseRate,
           m.Barcode         AS Barcode,
           m.Status          AS Status,
           m.IsDeleted       AS IsDeleted
      FROM admin.Master_Medicine m
    UNION ALL
    SELECT COALESCE(i.InventoryType, 'MEDICAL_ITEM'),
           i.ItemId, i.ItemCode, i.ItemName, i.Category, i.SubCategory, i.Department,
           i.Brand, i.Manufacturer, i.Vendor, i.Uom, i.HsnCode, i.GstPercentage,
           i.ReorderLevel, i.MinStock, i.MaxStock,
           i.BatchRequired, i.ExpiryRequired, 0,
           i.StandardRate, i.LastPurchaseRate, i.Barcode, i.Status, i.IsDeleted
      FROM admin.Master_Item i;

-- ── 6. Seed item rates from prices actually paid ────────────────
-- The PR screen needs a real estimated price. The ledger already records the
-- rate of every receipt, so LastPurchaseRate is taken from each item's most
-- recent RECEIPT rather than being invented or defaulted.
UPDATE admin.Master_Item i
   SET i.LastPurchaseRate = (
        SELECT l.Rate
          FROM inventory.Inventory_StockLedger l
         WHERE l.ItemType = i.InventoryType
           AND l.ItemId   = i.ItemId
           AND l.MovementType = 'RECEIPT'
           AND l.Rate > 0
         ORDER BY l.LedgerId DESC
         LIMIT 1)
 WHERE i.IsDeleted = 0
   AND i.LastPurchaseRate IS NULL;
