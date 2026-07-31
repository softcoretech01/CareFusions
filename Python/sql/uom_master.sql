-- ============================================================
-- UOM (Unit of Measure) Master - SQL Script
-- Database : admin
-- Table    : Master_Uom
-- SP       : SpMasterUom
-- Screen   : /admin/masters/uom
--
-- NOTE: Unlike other masters, UomCode is a MEANINGFUL user-entered mnemonic
-- (EA, KG, BOX) — it is NOT auto-generated. Both UomCode and UomName must be
-- unique among non-deleted rows.
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Uom
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Uom (
    UomId       INT           NOT NULL AUTO_INCREMENT,
    UomCode     VARCHAR(20)   NOT NULL,               -- User-entered: EA, KG, BOX
    UomName     VARCHAR(100)  NOT NULL,
    ShortName   VARCHAR(20)   NOT NULL,
    Status      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy   VARCHAR(100)  NULL,
    CreatedDate DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy   VARCHAR(100)  NULL,
    UpdatedDate DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted   TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Uom PRIMARY KEY (UomId),
    -- NOTE: UomCode/UomName are NOT hard UNIQUE constraints. Uniqueness is
    -- enforced in the SP for non-deleted rows only (so a deleted code/name
    -- can be reused).

    KEY IDX_Uom_Code     (UomCode),
    KEY IDX_Uom_Name     (UomName),
    KEY IDX_Uom_Status   (Status),
    KEY IDX_Uom_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterUom
-- p_Opt: GET | GETBYID | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   duplicate UomCode -> SQLSTATE '45000' MESSAGE_TEXT = 'DUPLICATE_UOM_CODE'
--   duplicate UomName -> SQLSTATE '45000' MESSAGE_TEXT = 'DUPLICATE_UOM_NAME'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterUom;

DELIMITER $$

CREATE PROCEDURE SpMasterUom(
    IN  p_Opt          VARCHAR(20),
    IN  p_UomId        INT,
    IN  p_UomCode      VARCHAR(20),
    IN  p_UomName      VARCHAR(100),
    IN  p_ShortName    VARCHAR(20),
    IN  p_Status       VARCHAR(20),
    IN  p_CreatedBy    VARCHAR(100),
    IN  p_UpdatedBy    VARCHAR(100),
    IN  p_Search       VARCHAR(255),
    IN  p_StatusFilter VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            UomId, UomCode, UomName, ShortName, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Uom
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR UomCode   LIKE CONCAT('%', p_Search, '%')
            OR UomName   LIKE CONCAT('%', p_Search, '%')
            OR ShortName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY UomId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            UomId, UomCode, UomName, ShortName, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Uom
        WHERE UomId = p_UomId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'INSERT' THEN
        IF EXISTS (SELECT 1 FROM Master_Uom WHERE UomCode = p_UomCode AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_UOM_CODE';
        END IF;
        IF EXISTS (SELECT 1 FROM Master_Uom WHERE UomName = p_UomName AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_UOM_NAME';
        END IF;

        INSERT INTO Master_Uom (
            UomCode, UomName, ShortName, Status, CreatedBy
        ) VALUES (
            p_UomCode, p_UomName, p_ShortName, p_Status, p_CreatedBy
        );

        SELECT LAST_INSERT_ID() AS UomId;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Uom WHERE UomCode = p_UomCode AND IsDeleted = 0 AND UomId <> p_UomId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_UOM_CODE';
        END IF;
        IF EXISTS (SELECT 1 FROM Master_Uom WHERE UomName = p_UomName AND IsDeleted = 0 AND UomId <> p_UomId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_UOM_NAME';
        END IF;

        UPDATE Master_Uom
        SET
            UomCode     = p_UomCode,
            UomName     = p_UomName,
            ShortName   = p_ShortName,
            Status      = p_Status,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE UomId = p_UomId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Uom
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE UomId = p_UomId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Uom
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE UomId = p_UomId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
