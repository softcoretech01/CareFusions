-- ============================================================
-- Vendor Master - SQL Script
-- Database : admin
-- Table    : Master_Vendor
-- SP       : SpMasterVendor
-- Screen   : /admin/masters/vendor
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Vendor
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Vendor (
    VendorId          INT           NOT NULL AUTO_INCREMENT,
    VendorCode        VARCHAR(20)   NOT NULL,               -- Auto-generated: VEN-001
    VendorName        VARCHAR(150)  NOT NULL,
    ContactPerson     VARCHAR(100)  NOT NULL,
    MobileNumber      VARCHAR(20)   NOT NULL,
    Email             VARCHAR(150)  NOT NULL,

    -- Statutory / Tax
    GstNumber         VARCHAR(20)   NULL,
    PanNumber         VARCHAR(15)   NULL,
    DrugLicenseNumber VARCHAR(50)   NULL,

    -- Address
    Address           VARCHAR(255)  NOT NULL,
    City              VARCHAR(100)  NOT NULL,
    State             VARCHAR(100)  NOT NULL,
    Country           VARCHAR(100)  NOT NULL,
    PinCode           VARCHAR(20)   NOT NULL,

    -- Payment
    PaymentTerms      VARCHAR(50)   NULL,
    CreditDays        INT           NULL,

    -- System Information
    Status            ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy         VARCHAR(100)  NULL,
    CreatedDate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy         VARCHAR(100)  NULL,
    UpdatedDate       DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted         TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Vendor PRIMARY KEY (VendorId),
    CONSTRAINT UQ_Vendor_Code   UNIQUE (VendorCode),
    -- NOTE: VendorName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Vendor_Name     (VendorName),
    KEY IDX_Vendor_City     (City),
    KEY IDX_Vendor_Status   (Status),
    KEY IDX_Vendor_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterVendor
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: VendorName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_VENDOR_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterVendor;

DELIMITER $$

CREATE PROCEDURE SpMasterVendor(
    IN  p_Opt               VARCHAR(20),
    IN  p_VendorId          INT,
    IN  p_VendorName        VARCHAR(150),
    IN  p_ContactPerson     VARCHAR(100),
    IN  p_MobileNumber      VARCHAR(20),
    IN  p_Email             VARCHAR(150),
    IN  p_GstNumber         VARCHAR(20),
    IN  p_PanNumber         VARCHAR(15),
    IN  p_DrugLicenseNumber VARCHAR(50),
    IN  p_Address           VARCHAR(255),
    IN  p_City              VARCHAR(100),
    IN  p_State             VARCHAR(100),
    IN  p_Country           VARCHAR(100),
    IN  p_PinCode           VARCHAR(20),
    IN  p_PaymentTerms      VARCHAR(50),
    IN  p_CreditDays        INT,
    IN  p_Status            VARCHAR(20),
    IN  p_CreatedBy         VARCHAR(100),
    IN  p_UpdatedBy         VARCHAR(100),
    IN  p_Search            VARCHAR(255),
    IN  p_StatusFilter      VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            VendorId, VendorCode, VendorName, ContactPerson, MobileNumber, Email,
            GstNumber, PanNumber, DrugLicenseNumber, Address, City, State, Country, PinCode,
            PaymentTerms, CreditDays, Status, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Vendor
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR VendorCode    LIKE CONCAT('%', p_Search, '%')
            OR VendorName    LIKE CONCAT('%', p_Search, '%')
            OR ContactPerson LIKE CONCAT('%', p_Search, '%')
            OR MobileNumber  LIKE CONCAT('%', p_Search, '%')
            OR City          LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY VendorId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            VendorId, VendorCode, VendorName, ContactPerson, MobileNumber, Email,
            GstNumber, PanNumber, DrugLicenseNumber, Address, City, State, Country, PinCode,
            PaymentTerms, CreditDays, Status, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Vendor
        WHERE VendorId = p_VendorId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('VEN-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(VendorCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS VendorCode
        FROM Master_Vendor;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_Vendor
                WHERE VendorName = p_VendorName AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_VENDOR_NAME';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(VendorCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_Vendor;

            SET v_Code = CONCAT('VEN-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Vendor (
                VendorCode, VendorName, ContactPerson, MobileNumber, Email,
                GstNumber, PanNumber, DrugLicenseNumber, Address, City, State, Country, PinCode,
                PaymentTerms, CreditDays, Status, CreatedBy
            ) VALUES (
                v_Code, p_VendorName, p_ContactPerson, p_MobileNumber, p_Email,
                p_GstNumber, p_PanNumber, p_DrugLicenseNumber, p_Address, p_City, p_State, p_Country, p_PinCode,
                p_PaymentTerms, p_CreditDays, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS VendorId, v_Code AS VendorCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Vendor
            WHERE VendorName = p_VendorName
              AND IsDeleted = 0
              AND VendorId <> p_VendorId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_VENDOR_NAME';
        END IF;

        UPDATE Master_Vendor
        SET
            VendorName        = p_VendorName,
            ContactPerson     = p_ContactPerson,
            MobileNumber      = p_MobileNumber,
            Email             = p_Email,
            GstNumber         = p_GstNumber,
            PanNumber         = p_PanNumber,
            DrugLicenseNumber = p_DrugLicenseNumber,
            Address           = p_Address,
            City              = p_City,
            State             = p_State,
            Country           = p_Country,
            PinCode           = p_PinCode,
            PaymentTerms      = p_PaymentTerms,
            CreditDays        = p_CreditDays,
            Status            = p_Status,
            UpdatedBy         = p_UpdatedBy,
            UpdatedDate       = CURRENT_TIMESTAMP
        WHERE VendorId = p_VendorId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Vendor
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE VendorId = p_VendorId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Vendor
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE VendorId = p_VendorId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
