-- ============================================================
-- Tax (GST) Master - SQL Script
-- Database : admin
-- Table    : Master_Tax
-- SP       : SpMasterTax
-- Screen   : /admin/masters/tax
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Tax
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Tax (
    TaxId          INT           NOT NULL AUTO_INCREMENT,
    TaxCode        VARCHAR(20)   NOT NULL,               -- Auto-generated: GST-18
    GstPercentage  INT           NOT NULL,               -- 0 - 100 (whole %)
    Cgst           DECIMAL(5,2)  NOT NULL,               -- = GstPercentage / 2
    Sgst           DECIMAL(5,2)  NOT NULL,               -- = GstPercentage / 2
    Igst           DECIMAL(5,2)  NOT NULL,               -- = GstPercentage
    EffectiveDate  DATE          NOT NULL,
    Status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy      VARCHAR(100)  NULL,
    CreatedDate    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy      VARCHAR(100)  NULL,
    UpdatedDate    DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted      TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Tax PRIMARY KEY (TaxId),
    -- NOTE: Neither TaxCode nor GstPercentage is a hard UNIQUE constraint.
    -- TaxCode is derived from GstPercentage, so a soft-deleted 'GST-12' would
    -- otherwise block re-creating that rate. Uniqueness of GstPercentage is
    -- enforced in the SP for non-deleted rows only.

    KEY IDX_Tax_Code       (TaxCode),
    KEY IDX_Tax_Percentage (GstPercentage),
    KEY IDX_Tax_Status     (Status),
    KEY IDX_Tax_IsDeleted  (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterTax
-- p_Opt: GET | GETBYID | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- TaxCode + CGST/SGST/IGST are DERIVED from GstPercentage (single source of
-- truth). Duplicate active GstPercentage raises SQLSTATE '45000' with
-- MESSAGE_TEXT = 'DUPLICATE_GST_PERCENTAGE'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterTax;

DELIMITER $$

CREATE PROCEDURE SpMasterTax(
    IN  p_Opt           VARCHAR(20),
    IN  p_TaxId         INT,
    IN  p_GstPercentage INT,
    IN  p_EffectiveDate DATE,
    IN  p_Status        VARCHAR(20),
    IN  p_CreatedBy     VARCHAR(100),
    IN  p_UpdatedBy     VARCHAR(100),
    IN  p_Search        VARCHAR(255),
    IN  p_StatusFilter  VARCHAR(20)
)
BEGIN

    -- --------------------------------------------------------
    -- GET
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            TaxId, TaxCode, GstPercentage, Cgst, Sgst, Igst, EffectiveDate, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Tax
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR TaxCode LIKE CONCAT('%', p_Search, '%') COLLATE utf8mb4_general_ci
            OR CAST(GstPercentage AS CHAR) LIKE CONCAT('%', p_Search, '%') COLLATE utf8mb4_general_ci
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY GstPercentage ASC;

    -- --------------------------------------------------------
    -- GETBYID
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            TaxId, TaxCode, GstPercentage, Cgst, Sgst, Igst, EffectiveDate, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Tax
        WHERE TaxId = p_TaxId
          AND IsDeleted = 0;

    -- --------------------------------------------------------
    -- INSERT (auto code + splits, reject duplicate active %)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Tax
            WHERE GstPercentage = p_GstPercentage AND IsDeleted = 0
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_GST_PERCENTAGE';
        END IF;

        INSERT INTO Master_Tax (
            TaxCode, GstPercentage, Cgst, Sgst, Igst, EffectiveDate, Status, CreatedBy
        ) VALUES (
            CONCAT('GST-', LPAD(p_GstPercentage, 2, '0')),
            p_GstPercentage,
            p_GstPercentage / 2.0,
            p_GstPercentage / 2.0,
            p_GstPercentage,
            p_EffectiveDate, p_Status, p_CreatedBy
        );

        SELECT LAST_INSERT_ID() AS TaxId;

    -- --------------------------------------------------------
    -- UPDATE (reject a % used by ANOTHER active row)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Tax
            WHERE GstPercentage = p_GstPercentage
              AND IsDeleted = 0
              AND TaxId <> p_TaxId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_GST_PERCENTAGE';
        END IF;

        UPDATE Master_Tax
        SET
            TaxCode       = CONCAT('GST-', LPAD(p_GstPercentage, 2, '0')),
            GstPercentage = p_GstPercentage,
            Cgst          = p_GstPercentage / 2.0,
            Sgst          = p_GstPercentage / 2.0,
            Igst          = p_GstPercentage,
            EffectiveDate = p_EffectiveDate,
            Status        = p_Status,
            UpdatedBy     = p_UpdatedBy,
            UpdatedDate   = CURRENT_TIMESTAMP
        WHERE TaxId = p_TaxId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- TOGGLESTATUS
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Tax
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE TaxId = p_TaxId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE (soft)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Tax
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE TaxId = p_TaxId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
