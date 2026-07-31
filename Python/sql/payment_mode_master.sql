-- ============================================================
-- Payment Mode Master - SQL Script
-- Database : admin
-- Table    : Master_PaymentMode
-- SP       : SpMasterPaymentMode
-- Screen   : /admin/masters/payment-mode
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_PaymentMode
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_PaymentMode (
    PaymentModeId       INT           NOT NULL AUTO_INCREMENT,
    PaymentCode         VARCHAR(20)   NOT NULL,               -- Auto-generated: PAY-001
    PaymentMode         VARCHAR(100)  NOT NULL,
    Description         VARCHAR(500)  NULL,

    -- Configuration
    TransactionRequired TINYINT(1)    NOT NULL DEFAULT 0,
    SupportsRefund      TINYINT(1)    NOT NULL DEFAULT 0,
    IsDefault           TINYINT(1)    NOT NULL DEFAULT 0,

    -- System Information
    Status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks             TEXT          NULL,

    -- Audit
    CreatedBy           VARCHAR(100)  NULL,
    CreatedDate         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100)  NULL,
    UpdatedDate         DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_PaymentMode PRIMARY KEY (PaymentModeId),
    CONSTRAINT UQ_PaymentMode_Code   UNIQUE (PaymentCode),
    -- NOTE: PaymentMode (name) is NOT a hard UNIQUE constraint. Uniqueness is
    -- enforced inside the SP for non-deleted rows only, so a soft-deleted mode
    -- name can be reused.

    KEY IDX_PaymentMode_Name      (PaymentMode),
    KEY IDX_PaymentMode_Status    (Status),
    KEY IDX_PaymentMode_IsDefault (IsDefault),
    KEY IDX_PaymentMode_IsDeleted (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterPaymentMode
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: PaymentMode must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_PAYMENT_MODE'.
-- Single default: setting IsDefault=1 auto-clears the default flag on all other
-- non-deleted rows (only one default mode can exist).
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterPaymentMode;

DELIMITER $$

CREATE PROCEDURE SpMasterPaymentMode(
    IN  p_Opt                 VARCHAR(20),
    IN  p_PaymentModeId       INT,
    IN  p_PaymentMode         VARCHAR(100),
    IN  p_Description         VARCHAR(500),
    IN  p_TransactionRequired TINYINT,
    IN  p_SupportsRefund      TINYINT,
    IN  p_IsDefault           TINYINT,
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             TEXT,
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    -- --------------------------------------------------------
    -- GET
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            PaymentModeId, PaymentCode, PaymentMode, Description,
            TransactionRequired, SupportsRefund, IsDefault,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_PaymentMode
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR PaymentCode LIKE CONCAT('%', p_Search, '%')
            OR PaymentMode LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY PaymentModeId ASC;

    -- --------------------------------------------------------
    -- GETBYID
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            PaymentModeId, PaymentCode, PaymentMode, Description,
            TransactionRequired, SupportsRefund, IsDefault,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_PaymentMode
        WHERE PaymentModeId = p_PaymentModeId
          AND IsDeleted = 0;

    -- --------------------------------------------------------
    -- NEXTCODE
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('PAY-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(PaymentCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS PaymentCode
        FROM Master_PaymentMode;

    -- --------------------------------------------------------
    -- INSERT (auto PAY-001, reject duplicate active name)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_PaymentMode
                WHERE PaymentMode = p_PaymentMode AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PAYMENT_MODE';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(PaymentCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_PaymentMode;

            SET v_Code = CONCAT('PAY-', LPAD(v_NextNum, 3, '0'));

            -- Enforce single default
            IF p_IsDefault = 1 THEN
                UPDATE Master_PaymentMode SET IsDefault = 0 WHERE IsDeleted = 0;
            END IF;

            INSERT INTO Master_PaymentMode (
                PaymentCode, PaymentMode, Description,
                TransactionRequired, SupportsRefund, IsDefault,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_PaymentMode, p_Description,
                p_TransactionRequired, p_SupportsRefund, p_IsDefault,
                p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS PaymentModeId, v_Code AS PaymentCode;
        END;

    -- --------------------------------------------------------
    -- UPDATE (reject a name used by ANOTHER active row)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_PaymentMode
            WHERE PaymentMode = p_PaymentMode
              AND IsDeleted = 0
              AND PaymentModeId <> p_PaymentModeId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PAYMENT_MODE';
        END IF;

        -- Enforce single default (clear others first)
        IF p_IsDefault = 1 THEN
            UPDATE Master_PaymentMode
            SET IsDefault = 0
            WHERE IsDeleted = 0 AND PaymentModeId <> p_PaymentModeId;
        END IF;

        UPDATE Master_PaymentMode
        SET
            PaymentMode         = p_PaymentMode,
            Description         = p_Description,
            TransactionRequired = p_TransactionRequired,
            SupportsRefund      = p_SupportsRefund,
            IsDefault           = p_IsDefault,
            Status              = p_Status,
            Remarks             = p_Remarks,
            UpdatedBy           = p_UpdatedBy,
            UpdatedDate         = CURRENT_TIMESTAMP
        WHERE PaymentModeId = p_PaymentModeId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- TOGGLESTATUS
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_PaymentMode
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE PaymentModeId = p_PaymentModeId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE (soft)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_PaymentMode
        SET
            IsDeleted   = 1,
            IsDefault   = 0,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE PaymentModeId = p_PaymentModeId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
