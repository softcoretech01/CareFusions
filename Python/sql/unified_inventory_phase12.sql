-- ============================================================
-- Unified Inventory / Procurement / Pharmacy — PHASE 12
-- Purpose : An OP prescription line points at the medicine it
--           prescribes, instead of only naming it.
--
--           Trn_OpdVisitPrescription stored MedicineName as free
--           text. That cannot be dispensed reliably, priced
--           reliably, or reported on: two medicines whose generic
--           names differ only in strength are indistinguishable,
--           and a renamed master row orphans every past line.
--           IPD already does this correctly (IpdMedication has a
--           MedicineId FK); this brings OPD in line.
--
-- Safety  : ADDITIVE + IDEMPOTENT.
--           * MedicineId is NULLABLE. Existing lines keep working
--             and are still shown by name.
--           * Backfill matches ONLY where a name resolves to
--             exactly one active medicine. An ambiguous or unknown
--             name is left NULL rather than guessed (spec §33).
--           * MedicineName is kept as a snapshot of what was
--             written at the time, which must not change when the
--             master is later edited.
-- ============================================================

ALTER TABLE hospital.Trn_OpdVisitPrescription
    ADD COLUMN IF NOT EXISTS MedicineId INT NULL AFTER Type;

CREATE INDEX IDX_OpdRx_Medicine ON hospital.Trn_OpdVisitPrescription (MedicineId);

-- Backfill: only unambiguous matches. A name matching zero or several active
-- medicines stays NULL and continues to display as text.
UPDATE hospital.Trn_OpdVisitPrescription PR
   SET PR.MedicineId = (
        SELECT m.MedicineId FROM admin.Master_Medicine m
         WHERE m.IsDeleted = 0
           AND (LOWER(m.GenericName) = LOWER(PR.MedicineName)
                OR LOWER(TRIM(CONCAT(m.GenericName, ' ', COALESCE(m.Strength, ''))))
                   = LOWER(PR.MedicineName))
         LIMIT 1)
 WHERE PR.MedicineId IS NULL
   AND (SELECT COUNT(*) FROM admin.Master_Medicine m
         WHERE m.IsDeleted = 0
           AND (LOWER(m.GenericName) = LOWER(PR.MedicineName)
                OR LOWER(TRIM(CONCAT(m.GenericName, ' ', COALESCE(m.Strength, ''))))
                   = LOWER(PR.MedicineName))) = 1;
