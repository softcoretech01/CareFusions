-- ============================================================
-- Currency Master - SQL Script
-- Database : admin
-- Table    : Master_Currency
-- SP       : SpMasterCurrency
-- Screen   : /admin/masters/currency
--
-- NOTE: CurrencyCode is a MEANINGFUL user-entered ISO code (INR, USD) — it is
-- NOT auto-generated. Both CurrencyCode and CurrencyName must be unique among
-- non-deleted rows.
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Currency
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Currency (
    CurrencyId   INT           NOT NULL AUTO_INCREMENT,
    CurrencyCode VARCHAR(10)   NOT NULL,               -- User-entered: INR, USD
    CurrencyName VARCHAR(100)  NOT NULL,
    Symbol       VARCHAR(10)   NOT NULL,
    Status       ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy    VARCHAR(100)  NULL,
    CreatedDate  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy    VARCHAR(100)  NULL,
    UpdatedDate  DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted    TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Currency PRIMARY KEY (CurrencyId),
    -- NOTE: CurrencyCode/CurrencyName are NOT hard UNIQUE constraints. Uniqueness
    -- is enforced in the SP for non-deleted rows only (so a deleted code/name
    -- can be reused).

    KEY IDX_Currency_Code     (CurrencyCode),
    KEY IDX_Currency_Name     (CurrencyName),
    KEY IDX_Currency_Status   (Status),
    KEY IDX_Currency_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterCurrency
-- p_Opt: GET | GETBYID | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   duplicate CurrencyCode -> SQLSTATE '45000' MESSAGE_TEXT = 'DUPLICATE_CURRENCY_CODE'
--   duplicate CurrencyName -> SQLSTATE '45000' MESSAGE_TEXT = 'DUPLICATE_CURRENCY_NAME'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterCurrency;

DELIMITER $$

CREATE PROCEDURE SpMasterCurrency(
    IN  p_Opt          VARCHAR(20),
    IN  p_CurrencyId   INT,
    IN  p_CurrencyCode VARCHAR(10),
    IN  p_CurrencyName VARCHAR(100),
    IN  p_Symbol       VARCHAR(10),
    IN  p_Status       VARCHAR(20),
    IN  p_CreatedBy    VARCHAR(100),
    IN  p_UpdatedBy    VARCHAR(100),
    IN  p_Search       VARCHAR(255),
    IN  p_StatusFilter VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            CurrencyId, CurrencyCode, CurrencyName, Symbol, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Currency
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR CurrencyCode LIKE CONCAT('%', p_Search, '%')
            OR CurrencyName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY CurrencyId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            CurrencyId, CurrencyCode, CurrencyName, Symbol, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Currency
        WHERE CurrencyId = p_CurrencyId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'INSERT' THEN
        IF EXISTS (SELECT 1 FROM Master_Currency WHERE CurrencyCode = p_CurrencyCode AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_CURRENCY_CODE';
        END IF;
        IF EXISTS (SELECT 1 FROM Master_Currency WHERE CurrencyName = p_CurrencyName AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_CURRENCY_NAME';
        END IF;

        INSERT INTO Master_Currency (
            CurrencyCode, CurrencyName, Symbol, Status, CreatedBy
        ) VALUES (
            p_CurrencyCode, p_CurrencyName, p_Symbol, p_Status, p_CreatedBy
        );

        SELECT LAST_INSERT_ID() AS CurrencyId;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Currency WHERE CurrencyCode = p_CurrencyCode AND IsDeleted = 0 AND CurrencyId <> p_CurrencyId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_CURRENCY_CODE';
        END IF;
        IF EXISTS (SELECT 1 FROM Master_Currency WHERE CurrencyName = p_CurrencyName AND IsDeleted = 0 AND CurrencyId <> p_CurrencyId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_CURRENCY_NAME';
        END IF;

        UPDATE Master_Currency
        SET
            CurrencyCode = p_CurrencyCode,
            CurrencyName = p_CurrencyName,
            Symbol       = p_Symbol,
            Status       = p_Status,
            UpdatedBy    = p_UpdatedBy,
            UpdatedDate  = CURRENT_TIMESTAMP
        WHERE CurrencyId = p_CurrencyId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Currency
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CurrencyId = p_CurrencyId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Currency
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CurrencyId = p_CurrencyId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
