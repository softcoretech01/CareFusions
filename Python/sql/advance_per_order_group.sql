-- ============================================================================
-- ONE ADVANCE BILL PER ORDERING EVENT
-- ============================================================================
-- A doctor who ticks a lab test and a scan and presses "Update EMR" once has
-- made one decision. It becomes two service orders (the execution gate needs one
-- per source order), and PRO approval was raising an advance bill against EACH,
-- so the patient was handed two bills for one visit and the billing desk saw two
-- near-identical rows -- ₹200 and ₹100 for Durai, ₹250 and ₹1,999.97 for Madhu.
--
-- Service_Order.OrderGroupNo already identifies the ordering event. The advance
-- bill now carries it too, and the "one live bill" uniqueness moves from the
-- ORDER to the GROUP.
--
-- Additive and idempotent.
--
-- Apply with:
--   Python/venv/Scripts/python.exe Python/apply_sql.py sql/advance_per_order_group.sql
-- ============================================================================

ALTER TABLE hospital.Billing_Advance
    ADD COLUMN IF NOT EXISTS OrderGroupNo VARCHAR(60) NULL AFTER ServiceOrderId;

ALTER TABLE hospital.Billing_Advance
    ADD INDEX IF NOT EXISTS idx_advance_order_group (OrderGroupNo);


-- Backfill from the service order each bill was raised against.
UPDATE hospital.Billing_Advance adv
JOIN hospital.Service_Order so ON so.ServiceOrderId = adv.ServiceOrderId
SET adv.OrderGroupNo = COALESCE(so.OrderGroupNo, so.OrderNo)
WHERE adv.OrderGroupNo IS NULL;

-- Any bill whose order has since vanished keys on itself, so it is a group of one.
UPDATE hospital.Billing_Advance
SET OrderGroupNo = AdvanceNo
WHERE OrderGroupNo IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- Uniqueness moves from the order to the group.
--
-- The old ux_billing_advance_live_order (one live bill per ServiceOrderId) is
-- what made the duplicate bills legal; the new key makes a second live bill for
-- the same ordering event a duplicate-key error rather than an ordinary outcome.
--
-- MariaDB has no partial index, so "live rows only" is folded into a generated
-- column: it holds the group for a live bill and NULL otherwise, and NULLs are
-- exempt from UNIQUE.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.Billing_Advance
    ADD COLUMN IF NOT EXISTS LiveGroupKey VARCHAR(60)
        AS (CASE WHEN Status <> 'CANCELLED' AND IsDeleted = 0
                 THEN OrderGroupNo END) VIRTUAL;
