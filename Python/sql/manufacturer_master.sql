-- ============================================================
-- Manufacturer Master - SQL Script
-- Database : admin
-- Table    : Master_Manufacturer
-- SP       : SpMasterManufacturer
-- Screen   : /admin/masters/manufacturer
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Manufacturer
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Manufacturer (
    ManufacturerId   INT           NOT NULL AUTO_INCREMENT,
    ManufacturerCode VARCHAR(20)   NOT NULL,               -- Auto-generated: MFG-001
    ManufacturerName VARCHAR(150)  NOT NULL,
    ContactDetails   VARCHAR(150)  NULL,
    Address          VARCHAR(255)  NULL,
    Country          VARCHAR(100)  NULL,
    Status           ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy        VARCHAR(100)  NULL,
    CreatedDate      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy        VARCHAR(100)  NULL,
    UpdatedDate      DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted        TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Manufacturer PRIMARY KEY (ManufacturerId),
    CONSTRAINT UQ_Manufacturer_Code   UNIQUE (ManufacturerCode),
    -- NOTE: ManufacturerName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Manufacturer_Name     (ManufacturerName),
    KEY IDX_Manufacturer_Country  (Country),
    KEY IDX_Manufacturer_Status   (Status),
    KEY IDX_Manufacturer_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterManufacturer
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: ManufacturerName must be unique among NON-DELETED rows.
-- Violations raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_MANUFACTURER_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterManufacturer;

DELIMITER $$

CREATE PROCEDURE SpMasterManufacturer(
    IN  p_Opt              VARCHAR(20),
    IN  p_ManufacturerId   INT,
    IN  p_ManufacturerName VARCHAR(150),
    IN  p_ContactDetails   VARCHAR(150),
    IN  p_Address          VARCHAR(255),
    IN  p_Country          VARCHAR(100),
    IN  p_Status           VARCHAR(20),
    IN  p_CreatedBy        VARCHAR(100),
    IN  p_UpdatedBy        VARCHAR(100),
    IN  p_Search           VARCHAR(255),
    IN  p_StatusFilter     VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            ManufacturerId, ManufacturerCode, ManufacturerName, ContactDetails, Address, Country, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Manufacturer
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR ManufacturerCode LIKE CONCAT('%', p_Search, '%')
            OR ManufacturerName LIKE CONCAT('%', p_Search, '%')
            OR ContactDetails   LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY ManufacturerId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ManufacturerId, ManufacturerCode, ManufacturerName, ContactDetails, Address, Country, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Manufacturer
        WHERE ManufacturerId = p_ManufacturerId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('MFG-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(ManufacturerCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS ManufacturerCode
        FROM Master_Manufacturer;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_Manufacturer WHERE ManufacturerName = p_ManufacturerName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_MANUFACTURER_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(ManufacturerCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_Manufacturer;

            SET v_Code = CONCAT('MFG-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Manufacturer (
                ManufacturerCode, ManufacturerName, ContactDetails, Address, Country, Status, CreatedBy
            ) VALUES (
                v_Code, p_ManufacturerName, p_ContactDetails, p_Address, p_Country, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS ManufacturerId, v_Code AS ManufacturerCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Manufacturer WHERE ManufacturerName = p_ManufacturerName AND IsDeleted = 0 AND ManufacturerId <> p_ManufacturerId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_MANUFACTURER_NAME';
        END IF;

        UPDATE Master_Manufacturer
        SET
            ManufacturerName = p_ManufacturerName,
            ContactDetails   = p_ContactDetails,
            Address          = p_Address,
            Country          = p_Country,
            Status           = p_Status,
            UpdatedBy        = p_UpdatedBy,
            UpdatedDate      = CURRENT_TIMESTAMP
        WHERE ManufacturerId = p_ManufacturerId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Manufacturer
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ManufacturerId = p_ManufacturerId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Manufacturer
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ManufacturerId = p_ManufacturerId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
