-- ============================================================================
-- SERVICE ORDER GROUPING
-- ============================================================================
-- One click of "Update EMR" in the OPD consultation is ONE clinical ordering
-- event. If the doctor ticked two lab tests and one scan, the PRO desk should
-- see one order to review, not three.
--
-- It saw three. The frontend sends the batch as one Lab_Order (n tests) and one
-- Rad_Order (m tests); each of those creates its own Service_Order, so a single
-- EMR update produced a LAB order and a RADIOLOGY order. Both then appeared as
-- separate rows once approved. UHID-2026-0015 has five such rows for what were
-- three ordering events.
--
-- The Service_Order per source order has to stay: the execution gate resolves a
-- lab test to its item through `Service_Order.OrderNo = Lab_Order.OrderNumber`,
-- and one service order spanning both a Lab_Order and a Rad_Order would have no
-- single order number to match. So the batch gets its own identifier instead,
-- and the PRO screens group on it.
--
-- Additive and idempotent; re-running is a no-op.
--
-- Apply with:  Python/venv/Scripts/python.exe Python/apply_sql.py sql/service_order_grouping.sql
-- ============================================================================

ALTER TABLE hospital.Service_Order
    ADD COLUMN IF NOT EXISTS OrderGroupNo VARCHAR(60) NULL AFTER OrderNo;

ALTER TABLE hospital.Service_Order
    ADD INDEX IF NOT EXISTS idx_so_order_group (OrderGroupNo);


-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill.
--
-- Orders raised before this column existed carry no batch id, so it is inferred
-- from when they were written: the lab order and the radiology order from one
-- EMR update are inserted in the same request and land on the same second.
-- (Service orders 23 and 24 are both stamped 16:24:50; 25 and 26 both 16:25:25.)
--
-- Grouping is deliberately narrow -- same patient, same source module, same
-- second -- because a wrong merge is worse than a missed one: it would put two
-- genuinely separate ordering events on one review row.
--
-- Orders that group with nothing simply become a group of one, keyed by their
-- own order number, which is exactly the previous behaviour.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE hospital.Service_Order so
JOIN (
    SELECT UHID, SourceModule, CreatedAt,
           MIN(OrderNo) AS GroupNo
    FROM hospital.Service_Order
    WHERE IsDeleted = 0 AND OrderGroupNo IS NULL
    GROUP BY UHID, SourceModule, CreatedAt
) g
  ON  g.UHID         = so.UHID
  AND g.SourceModule = so.SourceModule
  AND g.CreatedAt    = so.CreatedAt
SET so.OrderGroupNo = g.GroupNo
WHERE so.IsDeleted = 0 AND so.OrderGroupNo IS NULL;


-- Anything still unset (soft-deleted rows) is its own group, so no query has to
-- special-case NULL.
UPDATE hospital.Service_Order
SET OrderGroupNo = OrderNo
WHERE OrderGroupNo IS NULL;
