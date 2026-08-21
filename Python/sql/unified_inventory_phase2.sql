-- ============================================================
-- Unified Inventory / Procurement / Pharmacy — PHASE 2
-- Purpose : The Item master learns which type it owns, and gains
--           the rate columns the PR screen needs so an estimated
--           price can come from data instead of a hardcoded 100.
--
-- Safety  : ADDITIVE + IDEMPOTENT. Columns are added only if
--           absent; the backfill derives InventoryType from the
--           item's own category (Phase 1 classified those), so
--           nothing is guessed. No row is deleted.
--
-- Ownership rule enforced from here on (SpMasterItem):
--   MEDICINE      -> admin.Master_Medicine   (prescribable drugs)
--   MEDICAL_ITEM  -> admin.Master_Item       (clinical consumables)
--   NON_MEDICAL   -> admin.Master_Item       (everything else)
-- ============================================================

-- ── 1. Type ownership + purchase rates ──────────────────────────
ALTER TABLE admin.Master_Item
    ADD COLUMN IF NOT EXISTS InventoryType VARCHAR(50) NULL AFTER ItemName;

ALTER TABLE admin.Master_Item
    ADD COLUMN IF NOT EXISTS StandardRate DECIMAL(14,4) NULL AFTER ItemDescription;

ALTER TABLE admin.Master_Item
    ADD COLUMN IF NOT EXISTS LastPurchaseRate DECIMAL(14,4) NULL AFTER StandardRate;

-- ── 2. Backfill the type from each item's own category ──────────
-- Derived, never assigned: an item filed under a MEDICAL_ITEM category is a
-- medical item. Rows whose category is missing from Master_Category are left
-- NULL and reported by the runner rather than being defaulted (spec §33).
UPDATE admin.Master_Item i
  JOIN admin.Master_Category c
    ON c.CategoryName = i.Category
   AND c.IsDeleted = 0
   SET i.InventoryType = c.InventoryType
 WHERE i.InventoryType IS NULL
    OR i.InventoryType NOT IN ('MEDICINE', 'MEDICAL_ITEM', 'NON_MEDICAL');

-- ── 3. Index for the type-filtered lists the UI now issues ──────
CREATE INDEX IDX_Item_InventoryType ON admin.Master_Item (InventoryType);
