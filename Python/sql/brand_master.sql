-- ============================================================
-- Brand Master - SQL Script
-- Database : admin
-- Table    : Master_Brand
-- SP       : SpMasterBrand
-- Screen   : /admin/masters/brand
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Brand
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Brand (
    BrandId     INT           NOT NULL AUTO_INCREMENT,
    BrandCode   VARCHAR(20)   NOT NULL,               -- Auto-generated: BRD-001
    BrandName   VARCHAR(100)  NOT NULL,
    Description VARCHAR(500)  NULL,
    Status      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy   VARCHAR(100)  NULL,
    CreatedDate DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy   VARCHAR(100)  NULL,
    UpdatedDate DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted   TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Brand PRIMARY KEY (BrandId),
    CONSTRAINT UQ_Brand_Code   UNIQUE (BrandCode),
    -- NOTE: BrandName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Brand_Name     (BrandName),
    KEY IDX_Brand_Status   (Status),
    KEY IDX_Brand_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterBrand
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: BrandName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_BRAND_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterBrand;

DELIMITER $$

CREATE PROCEDURE SpMasterBrand(
    IN  p_Opt          VARCHAR(20),
    IN  p_BrandId      INT,
    IN  p_BrandName    VARCHAR(100),
    IN  p_Description   VARCHAR(500),
    IN  p_Status       VARCHAR(20),
    IN  p_CreatedBy    VARCHAR(100),
    IN  p_UpdatedBy    VARCHAR(100),
    IN  p_Search       VARCHAR(255),
    IN  p_StatusFilter VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            BrandId, BrandCode, BrandName, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Brand
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR BrandCode LIKE CONCAT('%', p_Search, '%')
            OR BrandName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY BrandId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            BrandId, BrandCode, BrandName, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Brand
        WHERE BrandId = p_BrandId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('BRD-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(BrandCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS BrandCode
        FROM Master_Brand;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_Brand WHERE BrandName = p_BrandName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_BRAND_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(BrandCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_Brand;

            SET v_Code = CONCAT('BRD-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Brand (BrandCode, BrandName, Description, Status, CreatedBy)
            VALUES (v_Code, p_BrandName, p_Description, p_Status, p_CreatedBy);

            SELECT LAST_INSERT_ID() AS BrandId, v_Code AS BrandCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Brand WHERE BrandName = p_BrandName AND IsDeleted = 0 AND BrandId <> p_BrandId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_BRAND_NAME';
        END IF;

        UPDATE Master_Brand
        SET
            BrandName   = p_BrandName,
            Description = p_Description,
            Status      = p_Status,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE BrandId = p_BrandId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Brand
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE BrandId = p_BrandId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Brand
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE BrandId = p_BrandId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
