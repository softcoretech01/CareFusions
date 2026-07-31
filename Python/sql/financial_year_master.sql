-- ============================================================
-- Financial Year Master - SQL Script
-- Database : admin
-- Table    : Master_FinancialYear
-- SP       : SpMasterFinancialYear
-- Screen   : /admin/masters/financial-year
--
-- NOTE: Code-less master (FinancialYear name is the business key). Status is
-- Open/Closed. Only ONE year may be the current financial year at a time.
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_FinancialYear
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_FinancialYear (
    FinancialYearId        INT           NOT NULL AUTO_INCREMENT,
    FinancialYear          VARCHAR(50)   NOT NULL,          -- e.g. FY 2024-2025
    StartDate              DATE          NOT NULL,
    EndDate                DATE          NOT NULL,
    IsCurrentFinancialYear TINYINT(1)    NOT NULL DEFAULT 0,
    AllowBackdatedEntry    TINYINT(1)    NOT NULL DEFAULT 0,
    ClosingDate            DATE          NULL,
    Status                 ENUM('Open','Closed') NOT NULL DEFAULT 'Open',
    Remarks                TEXT          NULL,

    -- Audit
    CreatedBy              VARCHAR(100)  NULL,
    CreatedDate            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy              VARCHAR(100)  NULL,
    UpdatedDate            DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted              TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_FinancialYear PRIMARY KEY (FinancialYearId),
    -- NOTE: FinancialYear uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_FinancialYear_Name     (FinancialYear),
    KEY IDX_FinancialYear_Current  (IsCurrentFinancialYear),
    KEY IDX_FinancialYear_Status   (Status),
    KEY IDX_FinancialYear_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterFinancialYear
-- p_Opt: GET | GETBYID | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: FinancialYear must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_FINANCIALYEAR'.
-- Single current: setting IsCurrentFinancialYear=1 clears it on all other
-- non-deleted rows.
-- TOGGLESTATUS flips Open <-> Closed.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterFinancialYear;

DELIMITER $$

CREATE PROCEDURE SpMasterFinancialYear(
    IN  p_Opt                    VARCHAR(20),
    IN  p_FinancialYearId        INT,
    IN  p_FinancialYear          VARCHAR(50),
    IN  p_StartDate              DATE,
    IN  p_EndDate                DATE,
    IN  p_IsCurrentFinancialYear TINYINT,
    IN  p_AllowBackdatedEntry    TINYINT,
    IN  p_ClosingDate            DATE,
    IN  p_Status                 VARCHAR(20),
    IN  p_Remarks                TEXT,
    IN  p_CreatedBy              VARCHAR(100),
    IN  p_UpdatedBy              VARCHAR(100),
    IN  p_Search                 VARCHAR(255),
    IN  p_StatusFilter           VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            FinancialYearId, FinancialYear, StartDate, EndDate, IsCurrentFinancialYear,
            AllowBackdatedEntry, ClosingDate, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_FinancialYear
        WHERE IsDeleted = 0
          AND (p_Search IS NULL OR p_Search = '' OR FinancialYear LIKE CONCAT('%', p_Search, '%'))
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY StartDate DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            FinancialYearId, FinancialYear, StartDate, EndDate, IsCurrentFinancialYear,
            AllowBackdatedEntry, ClosingDate, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_FinancialYear
        WHERE FinancialYearId = p_FinancialYearId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'INSERT' THEN
        IF EXISTS (SELECT 1 FROM Master_FinancialYear WHERE FinancialYear = p_FinancialYear AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_FINANCIALYEAR';
        END IF;

        IF p_IsCurrentFinancialYear = 1 THEN
            UPDATE Master_FinancialYear SET IsCurrentFinancialYear = 0 WHERE IsDeleted = 0;
        END IF;

        INSERT INTO Master_FinancialYear (
            FinancialYear, StartDate, EndDate, IsCurrentFinancialYear,
            AllowBackdatedEntry, ClosingDate, Status, Remarks, CreatedBy
        ) VALUES (
            p_FinancialYear, p_StartDate, p_EndDate, p_IsCurrentFinancialYear,
            p_AllowBackdatedEntry, p_ClosingDate, p_Status, p_Remarks, p_CreatedBy
        );

        SELECT LAST_INSERT_ID() AS FinancialYearId;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_FinancialYear WHERE FinancialYear = p_FinancialYear AND IsDeleted = 0 AND FinancialYearId <> p_FinancialYearId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_FINANCIALYEAR';
        END IF;

        IF p_IsCurrentFinancialYear = 1 THEN
            UPDATE Master_FinancialYear SET IsCurrentFinancialYear = 0
            WHERE IsDeleted = 0 AND FinancialYearId <> p_FinancialYearId;
        END IF;

        UPDATE Master_FinancialYear
        SET
            FinancialYear          = p_FinancialYear,
            StartDate              = p_StartDate,
            EndDate                = p_EndDate,
            IsCurrentFinancialYear = p_IsCurrentFinancialYear,
            AllowBackdatedEntry    = p_AllowBackdatedEntry,
            ClosingDate            = p_ClosingDate,
            Status                 = p_Status,
            Remarks                = p_Remarks,
            UpdatedBy              = p_UpdatedBy,
            UpdatedDate            = CURRENT_TIMESTAMP
        WHERE FinancialYearId = p_FinancialYearId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_FinancialYear
        SET
            Status      = CASE WHEN Status = 'Open' THEN 'Closed' ELSE 'Open' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE FinancialYearId = p_FinancialYearId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_FinancialYear
        SET
            IsDeleted              = 1,
            IsCurrentFinancialYear = 0,
            UpdatedBy              = p_UpdatedBy,
            UpdatedDate            = CURRENT_TIMESTAMP
        WHERE FinancialYearId = p_FinancialYearId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
