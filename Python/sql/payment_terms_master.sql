-- ============================================================
-- Payment Terms Master - SQL Script
-- Database : admin
-- Table    : Master_PaymentTerm
-- SP       : SpMasterPaymentTerm
-- Screen   : /admin/masters/payment-terms
--
-- NOTE: This master has NO code column (matches the UI). PaymentTermName is the
-- business key and must be unique among non-deleted rows.
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_PaymentTerm
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_PaymentTerm (
    PaymentTermId   INT           NOT NULL AUTO_INCREMENT,
    PaymentTermName VARCHAR(100)  NOT NULL,
    CreditDays      INT           NOT NULL DEFAULT 0,
    Description     VARCHAR(500)  NULL,
    Status          ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy       VARCHAR(100)  NULL,
    CreatedDate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy       VARCHAR(100)  NULL,
    UpdatedDate     DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted       TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_PaymentTerm PRIMARY KEY (PaymentTermId),
    -- NOTE: PaymentTermName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_PaymentTerm_Name     (PaymentTermName),
    KEY IDX_PaymentTerm_Status   (Status),
    KEY IDX_PaymentTerm_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterPaymentTerm
-- p_Opt: GET | GETBYID | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: PaymentTermName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_PAYMENTTERM_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterPaymentTerm;

DELIMITER $$

CREATE PROCEDURE SpMasterPaymentTerm(
    IN  p_Opt             VARCHAR(20),
    IN  p_PaymentTermId   INT,
    IN  p_PaymentTermName VARCHAR(100),
    IN  p_CreditDays      INT,
    IN  p_Description     VARCHAR(500),
    IN  p_Status          VARCHAR(20),
    IN  p_CreatedBy       VARCHAR(100),
    IN  p_UpdatedBy       VARCHAR(100),
    IN  p_Search          VARCHAR(255),
    IN  p_StatusFilter    VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            PaymentTermId, PaymentTermName, CreditDays, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_PaymentTerm
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR PaymentTermName LIKE CONCAT('%', p_Search, '%')
            OR Description     LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY PaymentTermId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            PaymentTermId, PaymentTermName, CreditDays, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_PaymentTerm
        WHERE PaymentTermId = p_PaymentTermId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'INSERT' THEN
        IF EXISTS (SELECT 1 FROM Master_PaymentTerm WHERE PaymentTermName = p_PaymentTermName AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PAYMENTTERM_NAME';
        END IF;

        INSERT INTO Master_PaymentTerm (
            PaymentTermName, CreditDays, Description, Status, CreatedBy
        ) VALUES (
            p_PaymentTermName, p_CreditDays, p_Description, p_Status, p_CreatedBy
        );

        SELECT LAST_INSERT_ID() AS PaymentTermId;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_PaymentTerm WHERE PaymentTermName = p_PaymentTermName AND IsDeleted = 0 AND PaymentTermId <> p_PaymentTermId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PAYMENTTERM_NAME';
        END IF;

        UPDATE Master_PaymentTerm
        SET
            PaymentTermName = p_PaymentTermName,
            CreditDays      = p_CreditDays,
            Description     = p_Description,
            Status          = p_Status,
            UpdatedBy       = p_UpdatedBy,
            UpdatedDate     = CURRENT_TIMESTAMP
        WHERE PaymentTermId = p_PaymentTermId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_PaymentTerm
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE PaymentTermId = p_PaymentTermId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_PaymentTerm
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE PaymentTermId = p_PaymentTermId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
