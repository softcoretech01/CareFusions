-- ============================================================
-- Laboratory / Investigations - SQL Script
-- Database : hospital  (operational data, alongside IPD + Pharmacy)
-- Tables   : hospital.Lab_Order, hospital.Lab_OrderTest, hospital.Lab_QcLog
-- SPs      : hospital.SpLabOrderDerive, hospital.SpLabOrder, hospital.SpLabQc
-- Screens  : /lab/* (Dashboard, Test Orders, Critical Alerts, QC, Reports)
--            and /radiology/* — both share these tables via Category.
--
-- Relationships (FK):
--   Lab_OrderTest.OrderId -> hospital.Lab_Order.OrderId   (ON DELETE CASCADE)
--   Lab_OrderTest.TestId  -> admin.Master_LabTest.TestId  (cross-schema, NULL
--                            allowed for radiology/free-text tests)
--
-- Lab and Radiology orders live in one table discriminated by Category,
-- mirroring the frontend's shared InvestigationContext. Object names are fully
-- qualified so this deploys correctly under init_db.py (which strips USE).
-- ============================================================
CREATE DATABASE IF NOT EXISTS hospital;

-- ── Order header ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Lab_Order (
    OrderId       INT          NOT NULL AUTO_INCREMENT,
    OrderNumber   VARCHAR(20)  NOT NULL,                 -- LAB-YYYYNNNN / RAD-YYYYNNNN
    Category      VARCHAR(20)  NOT NULL DEFAULT 'Lab',   -- Lab | Radiology
    VisitType     VARCHAR(10)  NOT NULL DEFAULT 'OP',    -- OP | IP
    Uhid          VARCHAR(30)  NOT NULL,
    PatientName   VARCHAR(150) NOT NULL,
    OrderedBy     VARCHAR(150) NULL,
    OrderedAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Priority      VARCHAR(20)  NOT NULL DEFAULT 'Routine',
    ClinicalNotes VARCHAR(500) NULL,
    Status        VARCHAR(30)  NOT NULL DEFAULT 'Pending',  -- derived from its tests
    CreatedBy     VARCHAR(100) NULL,
    CreatedDate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy    VARCHAR(100) NULL,
    ModifiedDate  DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Lab_Order PRIMARY KEY (OrderId),
    CONSTRAINT UQ_Lab_Order_Number UNIQUE (OrderNumber),
    KEY IDX_Lab_Order_Uhid (Uhid),
    KEY IDX_Lab_Order_Category (Category),
    KEY IDX_Lab_Order_OrderedAt (OrderedAt),
    KEY IDX_Lab_Order_Status (Status)
);

-- ── Ordered test (line) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Lab_OrderTest (
    OrderTestId    INT          NOT NULL AUTO_INCREMENT,
    OrderId        INT          NOT NULL,
    TestId         INT          NULL,                    -- FK to the master when known
    TestCode       VARCHAR(50)  NULL,                    -- snapshot at order time
    TestName       VARCHAR(200) NOT NULL,                -- snapshot at order time
    NormalRange    VARCHAR(100) NULL,                    -- snapshot: drives critical flagging
    Unit           VARCHAR(50)  NULL,                    -- snapshot
    Status         VARCHAR(30)  NOT NULL DEFAULT 'Pending',
    ResultValue    VARCHAR(255) NULL,
    ResultFile     VARCHAR(500) NULL,
    IsAbnormal     TINYINT(1)   NOT NULL DEFAULT 0,
    IsCritical     TINYINT(1)   NOT NULL DEFAULT 0,
    CollectedAt    DATETIME     NULL,
    AcceptedAt     DATETIME     NULL,
    CompletedAt    DATETIME     NULL,
    VerifiedAt     DATETIME     NULL,
    VerifiedBy     VARCHAR(150) NULL,
    AcknowledgedAt DATETIME     NULL,                    -- critical-alert acknowledgement
    AcknowledgedBy VARCHAR(150) NULL,
    CONSTRAINT PK_Lab_OrderTest PRIMARY KEY (OrderTestId),
    CONSTRAINT FK_Lab_OrderTest_Order FOREIGN KEY (OrderId)
        REFERENCES hospital.Lab_Order (OrderId) ON DELETE CASCADE,
    CONSTRAINT FK_Lab_OrderTest_Test FOREIGN KEY (TestId)
        REFERENCES admin.Master_LabTest (TestId),
    KEY IDX_Lab_OrderTest_Order (OrderId),
    KEY IDX_Lab_OrderTest_Critical (IsCritical)
);

-- ── Quality-control log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Lab_QcLog (
    QcId          INT          NOT NULL AUTO_INCREMENT,
    QcNumber      VARCHAR(20)  NOT NULL,                 -- QC-YYYYNNNN
    Category      VARCHAR(20)  NOT NULL DEFAULT 'Lab',
    QcDate        DATE         NOT NULL,
    MachineName   VARCHAR(150) NOT NULL,
    TestName      VARCHAR(200) NOT NULL,
    ExpectedValue DECIMAL(12,3) NOT NULL,
    ActualValue   DECIMAL(12,3) NOT NULL,
    Deviation     DECIMAL(12,3) NOT NULL,
    Status        VARCHAR(10)  NOT NULL,                 -- Pass | Fail
    Remarks       VARCHAR(500) NULL,
    RunBy         VARCHAR(150) NULL,
    CreatedDate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_Lab_QcLog PRIMARY KEY (QcId),
    CONSTRAINT UQ_Lab_QcLog_Number UNIQUE (QcNumber),
    KEY IDX_Lab_QcLog_Date (QcDate)
);


-- ── Integrity fix: TestCode UNIQUE was declared in test_master.sql but never
--    applied to the live table (only PRIMARY existed), which allows duplicate
--    test codes and breaks INSERT IGNORE seeding. Added idempotently.
DROP PROCEDURE IF EXISTS admin.SpTmpAddLabTestUq;
DELIMITER $$
CREATE PROCEDURE admin.SpTmpAddLabTestUq()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = 'admin' AND TABLE_NAME = 'Master_LabTest'
          AND INDEX_NAME = 'UQ_Master_LabTest_Code'
    ) THEN
        ALTER TABLE admin.Master_LabTest
            ADD CONSTRAINT UQ_Master_LabTest_Code UNIQUE (TestCode);
    END IF;
END$$
DELIMITER ;
CALL admin.SpTmpAddLabTestUq();
DROP PROCEDURE IF EXISTS admin.SpTmpAddLabTestUq;


-- ── Demo seed: realistic lab tests with parseable numeric ranges ─────
-- NormalRange drives automatic abnormal/critical flagging, replacing the
-- frontend's hardcoded "value < 7 or > 18 is critical" stub.
INSERT IGNORE INTO admin.Master_LabTest
    (TestCode, TestName, TestCategory, Department, SampleType, NormalRange, Unit,
     TestMethod, TurnaroundTime, TestPrice, Gst, RequiresApproval, CriticalValueAlert, Status, CreatedBy)
VALUES
    ('CBC',   'Complete Blood Count (CBC)', 'Hematology',   'Pathology',    'Blood', '4.5 - 11.0',  '10^3/uL', 'Automated Analyser', '2 hours',  350.00, 0, 0, 1, 'Active', 'Seed'),
    ('HB',    'Hemoglobin',                 'Hematology',   'Pathology',    'Blood', '12.0 - 15.5', 'g/dL',    'Photometric',        '1 hour',   150.00, 0, 0, 1, 'Active', 'Seed'),
    ('FBS',   'Fasting Blood Sugar',        'Biochemistry', 'Biochemistry', 'Blood', '70 - 100',    'mg/dL',   'GOD-POD',            '2 hours',  120.00, 0, 0, 1, 'Active', 'Seed'),
    ('LIPID', 'Lipid Profile',              'Biochemistry', 'Biochemistry', 'Blood', '0 - 200',     'mg/dL',   'Enzymatic',          '4 hours',  800.00, 0, 0, 0, 'Active', 'Seed'),
    ('CREAT', 'Serum Creatinine',           'Biochemistry', 'Biochemistry', 'Blood', '0.7 - 1.3',   'mg/dL',   'Jaffe',              '3 hours',  250.00, 0, 0, 1, 'Active', 'Seed'),
    ('TROP',  'Troponin I',                 'Biochemistry', 'Biochemistry', 'Blood', '0.0 - 0.4',   'ng/mL',   'Immunoassay',        '1 hour',   1200.00, 0, 1, 1, 'Active', 'Seed'),
    ('TSH',   'Thyroid Profile',            'Immunology',   'Pathology',    'Blood', '0.4 - 4.0',   'mIU/L',   'CLIA',               '6 hours',  600.00, 0, 0, 0, 'Active', 'Seed'),
    ('URIN',  'Urine Routine',              'Clinical Pathology', 'Pathology', 'Urine', NULL,       NULL,      'Microscopy',         '2 hours',  200.00, 0, 0, 0, 'Active', 'Seed');


-- ============================================================
-- SP: SpLabOrderDerive — recompute an order's status from its tests.
-- Mirrors the frontend's updateOrderStatusBasedOnTests so the server is the
-- single source of truth for order status.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpLabOrderDerive;
DELIMITER $$
CREATE PROCEDURE hospital.SpLabOrderDerive(IN p_OrderId INT)
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_verified INT DEFAULT 0;
    DECLARE v_completed INT DEFAULT 0;
    DECLARE v_collected INT DEFAULT 0;

    SELECT COUNT(*),
           COALESCE(SUM(Status = 'Verified'), 0),
           COALESCE(SUM(Status IN ('Completed', 'Verified')), 0),
           COALESCE(SUM(Status IN ('Sample Collected', 'Sample Accepted', 'Processing')), 0)
      INTO v_total, v_verified, v_completed, v_collected
    FROM hospital.Lab_OrderTest WHERE OrderId = p_OrderId;

    UPDATE hospital.Lab_Order
    SET Status = CASE
            WHEN v_total = 0            THEN 'Pending'
            WHEN v_verified = v_total   THEN 'Verified'
            WHEN v_completed = v_total  THEN 'Completed'
            WHEN v_completed > 0        THEN 'Partial'
            WHEN v_collected = v_total  THEN 'Sample Collected'
            ELSE 'Pending'
        END
    WHERE OrderId = p_OrderId;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpLabOrder
-- LIST | LISTTESTS | GETBYID | TESTS | CREATE | SETSTATUS | SETRESULT
-- | VERIFY | ACK | DELETE
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpLabOrder;
DELIMITER $$
CREATE PROCEDURE hospital.SpLabOrder(
    IN p_Opt VARCHAR(20),
    IN p_OrderId INT,
    IN p_OrderTestId INT,
    IN p_Category VARCHAR(20),
    IN p_VisitType VARCHAR(10),
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_OrderedBy VARCHAR(150),
    IN p_Priority VARCHAR(20),
    IN p_ClinicalNotes VARCHAR(500),
    IN p_Status VARCHAR(30),
    IN p_ResultValue VARCHAR(255),
    IN p_ResultFile VARCHAR(500),
    IN p_IsAbnormal TINYINT,
    IN p_IsCritical TINYINT,
    IN p_Tests LONGTEXT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_User VARCHAR(150)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT * FROM hospital.Lab_Order
        WHERE (p_Category IS NULL OR Category = p_Category)
          AND (p_Uhid     IS NULL OR Uhid = p_Uhid)
          AND (p_FromDate IS NULL OR DATE(OrderedAt) >= p_FromDate)
          AND (p_ToDate   IS NULL OR DATE(OrderedAt) <= p_ToDate)
        ORDER BY OrderId DESC;

    ELSEIF p_Opt = 'LISTTESTS' THEN
        -- All lines for the filtered orders in one round trip (avoids N+1).
        SELECT t.* FROM hospital.Lab_OrderTest t
        JOIN hospital.Lab_Order o ON o.OrderId = t.OrderId
        WHERE (p_Category IS NULL OR o.Category = p_Category)
          AND (p_Uhid     IS NULL OR o.Uhid = p_Uhid)
          AND (p_FromDate IS NULL OR DATE(o.OrderedAt) >= p_FromDate)
          AND (p_ToDate   IS NULL OR DATE(o.OrderedAt) <= p_ToDate)
        ORDER BY t.OrderId DESC, t.OrderTestId;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT * FROM hospital.Lab_Order WHERE OrderId = p_OrderId;

    ELSEIF p_Opt = 'TESTS' THEN
        SELECT * FROM hospital.Lab_OrderTest WHERE OrderId = p_OrderId ORDER BY OrderTestId;

    ELSEIF p_Opt = 'CREATE' THEN
        SET @yr = YEAR(CURDATE());
        SET @prefix = IF(p_Category = 'Radiology', 'RAD-', 'LAB-');
        SELECT COALESCE(MAX(CAST(SUBSTRING(OrderNumber, 9) AS UNSIGNED)), 0) + 1 INTO @roll
        FROM hospital.Lab_Order
        WHERE OrderNumber LIKE CONCAT(@prefix, @yr, '%');
        SET @ordno = CONCAT(@prefix, @yr, LPAD(@roll, 4, '0'));

        INSERT INTO hospital.Lab_Order
            (OrderNumber, Category, VisitType, Uhid, PatientName, OrderedBy, Priority, ClinicalNotes, Status, CreatedBy)
        VALUES
            (@ordno, COALESCE(p_Category, 'Lab'), COALESCE(p_VisitType, 'OP'), p_Uhid, p_PatientName,
             p_OrderedBy, COALESCE(p_Priority, 'Routine'), p_ClinicalNotes, 'Pending', p_User);
        SET @oid = LAST_INSERT_ID();

        -- Lines come from a JSON array; NormalRange/Unit fall back to the
        -- master so result flagging works even when the caller omits them.
        INSERT INTO hospital.Lab_OrderTest (OrderId, TestId, TestCode, TestName, NormalRange, Unit, Status)
        SELECT @oid, jt.TestId, COALESCE(jt.TestCode, m.TestCode), jt.TestName,
               COALESCE(jt.NormalRange, m.NormalRange), COALESCE(jt.Unit, m.Unit), 'Pending'
        FROM JSON_TABLE(p_Tests, '$[*]' COLUMNS (
            TestId      INT          PATH '$.testId',
            TestCode    VARCHAR(50)  PATH '$.testCode',
            TestName    VARCHAR(200) PATH '$.testName',
            NormalRange VARCHAR(100) PATH '$.normalRange',
            Unit        VARCHAR(50)  PATH '$.unit'
        )) jt
        LEFT JOIN admin.Master_LabTest m ON m.TestId = jt.TestId;

        SELECT @oid AS OrderId, @ordno AS OrderNumber;

    ELSEIF p_Opt = 'SETSTATUS' THEN
        UPDATE hospital.Lab_OrderTest
        SET Status      = p_Status,
            CollectedAt = IF(p_Status = 'Sample Collected', NOW(), CollectedAt),
            AcceptedAt  = IF(p_Status = 'Sample Accepted',  NOW(), AcceptedAt),
            CompletedAt = IF(p_Status = 'Completed',        NOW(), CompletedAt)
        WHERE OrderTestId = p_OrderTestId;

        SELECT OrderId INTO @oid FROM hospital.Lab_OrderTest WHERE OrderTestId = p_OrderTestId;
        CALL hospital.SpLabOrderDerive(@oid);
        SELECT @oid AS OrderId;

    ELSEIF p_Opt = 'SETRESULT' THEN
        -- Saving a result completes the test (mirrors the frontend behaviour).
        UPDATE hospital.Lab_OrderTest
        SET ResultValue = p_ResultValue,
            ResultFile  = COALESCE(p_ResultFile, ResultFile),
            IsAbnormal  = COALESCE(p_IsAbnormal, 0),
            IsCritical  = COALESCE(p_IsCritical, 0),
            Status      = 'Completed',
            CompletedAt = NOW()
        WHERE OrderTestId = p_OrderTestId;

        SELECT OrderId INTO @oid FROM hospital.Lab_OrderTest WHERE OrderTestId = p_OrderTestId;
        CALL hospital.SpLabOrderDerive(@oid);
        SELECT @oid AS OrderId;

    ELSEIF p_Opt = 'VERIFY' THEN
        UPDATE hospital.Lab_OrderTest
        SET Status = 'Verified', VerifiedAt = NOW(), VerifiedBy = p_User
        WHERE OrderTestId = p_OrderTestId;

        SELECT OrderId INTO @oid FROM hospital.Lab_OrderTest WHERE OrderTestId = p_OrderTestId;
        CALL hospital.SpLabOrderDerive(@oid);
        SELECT @oid AS OrderId;

    ELSEIF p_Opt = 'ACK' THEN
        -- Persist critical-alert acknowledgement (was client-only state).
        UPDATE hospital.Lab_OrderTest
        SET AcknowledgedAt = NOW(), AcknowledgedBy = p_User
        WHERE OrderTestId = p_OrderTestId;
        SELECT p_OrderTestId AS OrderTestId;

    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM hospital.Lab_Order WHERE OrderId = p_OrderId;
        SELECT p_OrderId AS OrderId;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpLabQc  (LIST | INSERT)
-- Deviation and Pass/Fail are computed server-side.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpLabQc;
DELIMITER $$
CREATE PROCEDURE hospital.SpLabQc(
    IN p_Opt VARCHAR(20),
    IN p_Category VARCHAR(20),
    IN p_QcDate DATE,
    IN p_MachineName VARCHAR(150),
    IN p_TestName VARCHAR(200),
    IN p_ExpectedValue DECIMAL(12,3),
    IN p_ActualValue DECIMAL(12,3),
    IN p_Remarks VARCHAR(500),
    IN p_User VARCHAR(150)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT * FROM hospital.Lab_QcLog
        WHERE (p_Category IS NULL OR Category = p_Category)
        ORDER BY QcDate DESC, QcId DESC;

    ELSEIF p_Opt = 'INSERT' THEN
        SET @yr = YEAR(CURDATE());
        SELECT COALESCE(MAX(CAST(SUBSTRING(QcNumber, 8) AS UNSIGNED)), 0) + 1 INTO @roll
        FROM hospital.Lab_QcLog WHERE QcNumber LIKE CONCAT('QC-', @yr, '%');
        SET @qcno = CONCAT('QC-', @yr, LPAD(@roll, 4, '0'));

        SET @dev = p_ActualValue - p_ExpectedValue;

        INSERT INTO hospital.Lab_QcLog
            (QcNumber, Category, QcDate, MachineName, TestName, ExpectedValue, ActualValue, Deviation, Status, Remarks, RunBy)
        VALUES
            (@qcno, COALESCE(p_Category, 'Lab'), p_QcDate, p_MachineName, p_TestName,
             p_ExpectedValue, p_ActualValue, @dev, IF(ABS(@dev) > 1.0, 'Fail', 'Pass'), p_Remarks, p_User);

        SELECT * FROM hospital.Lab_QcLog WHERE QcId = LAST_INSERT_ID();
    END IF;
END$$
DELIMITER ;
