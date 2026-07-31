-- ============================================================
-- Cash Counter Master - SQL Script
-- Database : admin
-- Table    : Master_CashCounter
-- SP       : SpMasterCashCounter
-- Screen   : /admin/masters/cash-counter
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_CashCounter
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_CashCounter (
    CashCounterId    INT           NOT NULL AUTO_INCREMENT,
    CounterCode      VARCHAR(20)   NOT NULL,               -- Auto-generated: CTR-001
    CounterName      VARCHAR(150)  NOT NULL,
    Hospital         VARCHAR(150)  NOT NULL,
    Branch           VARCHAR(150)  NOT NULL,
    AssignedUser     VARCHAR(150)  NOT NULL,
    OpeningBalance   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    MaximumCashLimit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    Status           ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks          TEXT          NULL,

    -- Audit
    CreatedBy        VARCHAR(100)  NULL,
    CreatedDate      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy        VARCHAR(100)  NULL,
    UpdatedDate      DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted        TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_CashCounter PRIMARY KEY (CashCounterId),
    CONSTRAINT UQ_CashCounter_Code   UNIQUE (CounterCode),
    -- NOTE: CounterName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_CashCounter_Name     (CounterName),
    KEY IDX_CashCounter_Branch   (Branch),
    KEY IDX_CashCounter_Status   (Status),
    KEY IDX_CashCounter_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterCashCounter
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: CounterName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_COUNTER_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterCashCounter;

DELIMITER $$

CREATE PROCEDURE SpMasterCashCounter(
    IN  p_Opt              VARCHAR(20),
    IN  p_CashCounterId    INT,
    IN  p_CounterName      VARCHAR(150),
    IN  p_Hospital         VARCHAR(150),
    IN  p_Branch           VARCHAR(150),
    IN  p_AssignedUser     VARCHAR(150),
    IN  p_OpeningBalance   DECIMAL(15,2),
    IN  p_MaximumCashLimit DECIMAL(15,2),
    IN  p_Status           VARCHAR(20),
    IN  p_Remarks          TEXT,
    IN  p_CreatedBy        VARCHAR(100),
    IN  p_UpdatedBy        VARCHAR(100),
    IN  p_Search           VARCHAR(255),
    IN  p_BranchFilter     VARCHAR(150),
    IN  p_StatusFilter     VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            CashCounterId, CounterCode, CounterName, Hospital, Branch, AssignedUser,
            OpeningBalance, MaximumCashLimit, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_CashCounter
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR CounterCode  LIKE CONCAT('%', p_Search, '%')
            OR CounterName  LIKE CONCAT('%', p_Search, '%')
            OR AssignedUser LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_BranchFilter IS NULL OR p_BranchFilter = '' OR Branch = p_BranchFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY CashCounterId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            CashCounterId, CounterCode, CounterName, Hospital, Branch, AssignedUser,
            OpeningBalance, MaximumCashLimit, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_CashCounter
        WHERE CashCounterId = p_CashCounterId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('CTR-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(CounterCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS CounterCode
        FROM Master_CashCounter;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_CashCounter WHERE CounterName = p_CounterName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COUNTER_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(CounterCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_CashCounter;

            SET v_Code = CONCAT('CTR-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_CashCounter (
                CounterCode, CounterName, Hospital, Branch, AssignedUser,
                OpeningBalance, MaximumCashLimit, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_CounterName, p_Hospital, p_Branch, p_AssignedUser,
                p_OpeningBalance, p_MaximumCashLimit, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS CashCounterId, v_Code AS CounterCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_CashCounter WHERE CounterName = p_CounterName AND IsDeleted = 0 AND CashCounterId <> p_CashCounterId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COUNTER_NAME';
        END IF;

        UPDATE Master_CashCounter
        SET
            CounterName      = p_CounterName,
            Hospital         = p_Hospital,
            Branch           = p_Branch,
            AssignedUser     = p_AssignedUser,
            OpeningBalance   = p_OpeningBalance,
            MaximumCashLimit = p_MaximumCashLimit,
            Status           = p_Status,
            Remarks          = p_Remarks,
            UpdatedBy        = p_UpdatedBy,
            UpdatedDate      = CURRENT_TIMESTAMP
        WHERE CashCounterId = p_CashCounterId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_CashCounter
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CashCounterId = p_CashCounterId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_CashCounter
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CashCounterId = p_CashCounterId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
