-- ============================================================
-- Unified Inventory / Procurement / Pharmacy — PHASE 11
-- Purpose : The pharmacy counter stops keeping its own stock.
--           POS reads and writes inventory.Inventory_Stock at the
--           Pharmacy Store, batch by batch, through the same
--           movement engine every other stock transaction uses.
--
--           hospital.Pharmacy_Stock is no longer the source of
--           truth. It is left in place (and backed up) for one
--           release; nothing reads it after this phase.
--
-- Safety  : ADDITIVE + IDEMPOTENT.
--           * Sale lines gain ItemType + BatchNo so a sale records
--             exactly which lot left the shelf - required for
--             recalls and for returning stock to the right batch.
--           * SpPharmacyStock now projects the ledger but keeps
--             its original column names, so the POS, dashboard and
--             reports keep working unchanged.
--           * The stock guard and the direct Pharmacy_Stock UPDATE
--             are removed from SpPharmacySale: allocation and the
--             negative-stock guard now live in the inventory engine
--             (SpInvStockPost), so there is one implementation.
-- ============================================================

-- ── 1. A sale line records the exact lot it came from ───────────
ALTER TABLE hospital.Pharmacy_SaleItem
    ADD COLUMN IF NOT EXISTS ItemType VARCHAR(20) NOT NULL DEFAULT 'MEDICINE' AFTER MedicineId;

ALTER TABLE hospital.Pharmacy_SaleItem
    ADD COLUMN IF NOT EXISTS BatchNo VARCHAR(50) NULL AFTER MedicineName;

-- ── 2. Counter-sale price for medical items ─────────────────────
-- Medicines already carry SellingPrice. Medical items are sellable at the
-- counter but the item master only held purchase rates, so a counter price had
-- nowhere to live. NULL means "not sold at the counter", which is what keeps
-- an unpriced item out of the POS list rather than selling it at cost.
ALTER TABLE admin.Master_Item
    ADD COLUMN IF NOT EXISTS SellingPrice DECIMAL(14,4) NULL AFTER StandardRate;
