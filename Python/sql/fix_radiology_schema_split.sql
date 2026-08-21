-- Move radiology orders out of the orphaned `admin` copies and into `hospital`.
--
-- Why this exists: radiology_orders.sql used to reference Rad_Order /
-- Rad_OrderTest unqualified. Run from a connection whose default schema is
-- `admin` (which is what Python/.env sets, DB_NAME=admin), that created a
-- second set of tables under admin.* and seeded them there. Nothing reads
-- those: the API writes hospital.Rad_Order explicitly, and hospital.SpRadOrders
-- resolves its bare table names against its own schema, hospital. So the RIS
-- Scan Worklist queried an empty hospital.Rad_Order and showed nothing.
--
-- Safe to re-run: both inserts skip rows that already exist. The admin.* tables
-- are left untouched here -- verify the worklist first, then drop them with the
-- (commented out) statements at the bottom.

USE hospital;

INSERT INTO hospital.Rad_Order
    (OrderId, OrderNumber, Category, VisitType, Uhid, PatientName, OrderedBy,
     OrderedAt, Status, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate)
SELECT
    a.OrderId, a.OrderNumber, a.Category, a.VisitType, a.Uhid, a.PatientName,
    a.OrderedBy, a.OrderedAt, a.Status, a.CreatedBy, a.CreatedDate,
    a.ModifiedBy, a.ModifiedDate
FROM admin.Rad_Order a
WHERE NOT EXISTS (
    SELECT 1 FROM hospital.Rad_Order h WHERE h.OrderNumber = a.OrderNumber
);

INSERT INTO hospital.Rad_OrderTest
    (OrderTestId, OrderId, TestId, TestCode, TestName, BodyPart, Status,
     ResultValue, ResultFile, IsCritical, CompletedAt, VerifiedAt, VerifiedBy,
     AcknowledgedAt, AcknowledgedBy)
SELECT
    a.OrderTestId, a.OrderId, a.TestId, a.TestCode, a.TestName, a.BodyPart,
    a.Status, a.ResultValue, a.ResultFile, a.IsCritical, a.CompletedAt,
    a.VerifiedAt, a.VerifiedBy, a.AcknowledgedAt, a.AcknowledgedBy
FROM admin.Rad_OrderTest a
WHERE NOT EXISTS (
    SELECT 1 FROM hospital.Rad_OrderTest h WHERE h.OrderTestId = a.OrderTestId
);

-- Keep the auto-increment ahead of the ids just copied in.
ALTER TABLE hospital.Rad_Order
    AUTO_INCREMENT = 1000;
ALTER TABLE hospital.Rad_OrderTest
    AUTO_INCREMENT = 1000;

SELECT 'hospital.Rad_Order'     AS TableName, COUNT(*) AS Rows FROM hospital.Rad_Order
UNION ALL
SELECT 'hospital.Rad_OrderTest', COUNT(*) FROM hospital.Rad_OrderTest;

-- Once the Scan Worklist shows the orders, retire the orphans:
-- DROP TABLE admin.Rad_OrderTest;
-- DROP TABLE admin.Rad_Order;
