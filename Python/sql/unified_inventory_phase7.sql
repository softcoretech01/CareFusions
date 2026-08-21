-- ============================================================
-- Unified Inventory / Procurement / Pharmacy — PHASE 7
-- Purpose : Inventory type travels the procurement chain
--               PR -> RFQ -> Quotation -> PO -> GRN -> Return
--           so a line can never change which master owns it
--           part way through the flow (spec §11).
--
--           PR header : InventoryType   (one type per requisition)
--           Every line: ItemType        (the owning master for ItemId)
--
-- Safety  : ADDITIVE + IDEMPOTENT. Columns are nullable, so every
--           existing PR, PO, GRN and return keeps working untouched.
--           Historical rows are backfilled from the item each line
--           already points at - never guessed. A line whose item can
--           no longer be resolved is left NULL and reported rather
--           than being assigned a type (spec §33).
-- ============================================================

-- ── 1. Columns ──────────────────────────────────────────────────
ALTER TABLE inventory.PurchaseRequisition
    ADD COLUMN IF NOT EXISTS InventoryType VARCHAR(20) NULL AFTER Department;

ALTER TABLE inventory.PurchaseRequisitionItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NULL AFTER ItemId;

ALTER TABLE inventory.PurchaseOrderItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NULL AFTER ItemId;

ALTER TABLE inventory.GoodsReceiptItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NULL AFTER ItemId;

-- ── 2. Backfill lines from the item they already reference ──────
-- Every pre-migration line was raised against Master_Item (medicines could not
-- be requisitioned at all), so the type is whatever that item's category says.
UPDATE inventory.PurchaseRequisitionItem l
  JOIN admin.Master_Item i ON i.ItemId = l.ItemId
   SET l.ItemType = i.InventoryType
 WHERE l.ItemType IS NULL AND i.InventoryType IS NOT NULL;

UPDATE inventory.PurchaseOrderItem l
  JOIN admin.Master_Item i ON i.ItemId = l.ItemId
   SET l.ItemType = i.InventoryType
 WHERE l.ItemType IS NULL AND i.InventoryType IS NOT NULL;

UPDATE inventory.GoodsReceiptItem l
  JOIN admin.Master_Item i ON i.ItemId = l.ItemId
   SET l.ItemType = i.InventoryType
 WHERE l.ItemType IS NULL AND i.InventoryType IS NOT NULL;

-- ── 3. A PR's header type follows its own lines ─────────────────
-- Only where the lines agree on one type. A legacy PR with mixed lines keeps
-- a NULL header and is listed by the runner for a human to decide.
UPDATE inventory.PurchaseRequisition pr
   SET pr.InventoryType = (
        SELECT MIN(l.ItemType) FROM inventory.PurchaseRequisitionItem l
         WHERE l.PrId = pr.PrId AND l.ItemType IS NOT NULL)
 WHERE pr.InventoryType IS NULL
   AND (SELECT COUNT(DISTINCT l.ItemType) FROM inventory.PurchaseRequisitionItem l
         WHERE l.PrId = pr.PrId AND l.ItemType IS NOT NULL) = 1;

-- ── 4. Remaining document lines (Phase 9) ───────────────────────
-- RFQ, vendor quotation and purchase return lines carry the type too, so it
-- survives every hop of PR -> RFQ -> Quotation -> PO -> GRN -> Return.
ALTER TABLE inventory.RequestForQuotationItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NULL AFTER ItemId;

ALTER TABLE inventory.VendorQuotationItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NULL AFTER ItemId;

ALTER TABLE inventory.PurchaseReturnItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NULL AFTER ItemId;

UPDATE inventory.RequestForQuotationItem l
  JOIN admin.Master_Item i ON i.ItemId = l.ItemId
   SET l.ItemType = i.InventoryType
 WHERE l.ItemType IS NULL AND i.InventoryType IS NOT NULL;

UPDATE inventory.VendorQuotationItem l
  JOIN admin.Master_Item i ON i.ItemId = l.ItemId
   SET l.ItemType = i.InventoryType
 WHERE l.ItemType IS NULL AND i.InventoryType IS NOT NULL;

UPDATE inventory.PurchaseReturnItem l
  JOIN admin.Master_Item i ON i.ItemId = l.ItemId
   SET l.ItemType = i.InventoryType
 WHERE l.ItemType IS NULL AND i.InventoryType IS NOT NULL;
