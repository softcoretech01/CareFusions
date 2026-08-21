-- ============================================================
-- Unified Inventory / Procurement / Pharmacy — PHASE 1
-- Purpose : One canonical Type/Category tree.
--           Master_Category.InventoryType becomes the single
--           classification used by every layer, with values
--               MEDICINE | MEDICAL_ITEM | NON_MEDICAL
--           and Master_MedicineCategory is merged into it so
--           there is exactly ONE category system (spec §4, §43).
--
-- Safety  : ADDITIVE + IDEMPOTENT.
--           * Backfill only touches rows whose InventoryType is
--             NULL or a legacy value; a value an operator has
--             already set to a canonical value is never changed.
--           * The medicine-category merge inserts only names that
--             do not already exist (case-insensitive).
--           * No row is deleted. Master_MedicineCategory is left
--             in place and is retired in Phase 12, after the
--             screens stop reading it.
--           Backups: sql/unified_inventory_phase0.sql
--
-- Legacy mapping applied (recorded from the Phase 0 audit):
--   Medical Consumables  NULL      -> MEDICAL_ITEM
--   Surgical Items       NULL      -> MEDICAL_ITEM
--   Lab Reagents         NULL      -> MEDICAL_ITEM
--   Equipment            NULL      -> MEDICAL_ITEM   (provisional)
--   Stationery           NULL      -> NON_MEDICAL
--   Medicines            'Medical' -> MEDICINE
--   Vaccines             'Medical' -> MEDICINE
-- ============================================================

-- ── 1. Canonical backfill for categories carrying a drug meaning ──
UPDATE admin.Master_Category
   SET InventoryType = 'MEDICINE'
 WHERE IsDeleted = 0
   AND (InventoryType IS NULL OR InventoryType NOT IN ('MEDICINE', 'MEDICAL_ITEM', 'NON_MEDICAL'))
   AND CategoryName IN ('Medicines', 'Vaccines', 'Medicine', 'Drugs', 'Pharmaceuticals');

-- ── 2. Canonical backfill for non-clinical categories ────────────
UPDATE admin.Master_Category
   SET InventoryType = 'NON_MEDICAL'
 WHERE IsDeleted = 0
   AND (InventoryType IS NULL OR InventoryType NOT IN ('MEDICINE', 'MEDICAL_ITEM', 'NON_MEDICAL'))
   AND CategoryName IN ('Stationery', 'Cleaning', 'Office Supplies', 'General Supplies',
                        'Housekeeping', 'Printing');

-- ── 3. Everything else that classifies stock is a medical item ───
-- Deliberately last and deliberately narrow: it only fires on rows the two
-- statements above did not classify. A genuinely new category created after
-- this migration is rejected on write by SpMasterCategory unless the operator
-- picks a type, so this never becomes a silent catch-all.
UPDATE admin.Master_Category
   SET InventoryType = 'MEDICAL_ITEM'
 WHERE IsDeleted = 0
   AND (InventoryType IS NULL OR InventoryType NOT IN ('MEDICINE', 'MEDICAL_ITEM', 'NON_MEDICAL'));

-- ── 4. Merge Master_MedicineCategory into the one category tree ──
-- Medicines are batch- and expiry-tracked, which is why the merged rows carry
-- those flags. Names already present (e.g. 'Vaccines') are skipped, so no
-- duplicate category is created.
SET @uim_next_cat := (
    SELECT COALESCE(MAX(CAST(SUBSTRING(CategoryCode, 5) AS UNSIGNED)), 0)
      FROM admin.Master_Category
);

INSERT INTO admin.Master_Category
       (CategoryCode, CategoryName, InventoryType, Description,
        StockRequired, BatchTracking, ExpiryTracking, BarcodeRequired,
        Remarks, Status, CreatedBy)
SELECT CONCAT('CAT-', LPAD(@uim_next_cat := @uim_next_cat + 1, 3, '0')),
       mc.CategoryName,
       'MEDICINE',
       'Migrated from Master_MedicineCategory',
       1, 1, 1, 0,
       'Unified inventory migration (Phase 1)',
       'Active',
       'UIM-Phase1'
  FROM admin.Master_MedicineCategory mc
 WHERE NOT EXISTS (
        SELECT 1 FROM admin.Master_Category c
         WHERE LOWER(c.CategoryName) = LOWER(mc.CategoryName)
           AND c.IsDeleted = 0
       );

-- ── 5. Medicines need the same two-level tree items already have ──
ALTER TABLE admin.Master_Medicine
    ADD COLUMN IF NOT EXISTS SubCategory VARCHAR(100) NULL AFTER Category;
