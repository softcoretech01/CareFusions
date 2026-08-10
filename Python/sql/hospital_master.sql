-- ============================================================
-- Hospital Master - SQL Script
-- Database : admin
-- Table    : Master_Hospital
-- SP       : SpMasterHospital
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Hospital
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Hospital (
    HospitalId      INT             NOT NULL AUTO_INCREMENT,
    HospitalCode    VARCHAR(50)     NOT NULL,
    HospitalName    VARCHAR(255)    NOT NULL,
    LegalName       VARCHAR(255)    NOT NULL,
    RegistrationNo  VARCHAR(100)    NOT NULL,
    GstVatNo        VARCHAR(100)    NULL,
    PanTinNo        VARCHAR(100)    NULL,
    ContactNumber   VARCHAR(20)     NOT NULL,
    AlternateNumber VARCHAR(20)     NULL,
    Email           VARCHAR(255)    NOT NULL,
    Website         VARCHAR(255)    NULL,
    Address1        VARCHAR(500)    NOT NULL,
    Address2        VARCHAR(500)    NULL,
    Country         VARCHAR(100)    NOT NULL,
    State           VARCHAR(100)    NOT NULL,
    City            VARCHAR(100)    NOT NULL,
    PostalCode      VARCHAR(20)     NOT NULL,
    Currency        ENUM('USD','EUR','GBP','INR') NOT NULL DEFAULT 'USD',
    FinancialYear   VARCHAR(20)     NOT NULL,
    TimeZone        VARCHAR(100)    NOT NULL,
    Status          ENUM('Active','Inactive')     NOT NULL DEFAULT 'Active',
    Remarks         TEXT            NULL,
    CreatedDate     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedDate    DATETIME        NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted       TINYINT(1)      NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Hospital PRIMARY KEY (HospitalId),
    CONSTRAINT UQ_Master_Hospital_Code   UNIQUE (HospitalCode),
    CONSTRAINT UQ_Master_Hospital_Name   UNIQUE (HospitalName),
    CONSTRAINT UQ_Master_Hospital_RegNo  UNIQUE (RegistrationNo)
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS IDX_Master_Hospital_City     ON Master_Hospital (City);
CREATE INDEX IF NOT EXISTS IDX_Master_Hospital_Status   ON Master_Hospital (Status);
CREATE INDEX IF NOT EXISTS IDX_Master_Hospital_Deleted  ON Master_Hospital (IsDeleted);


-- ============================================================
-- STORED PROCEDURE: SpMasterHospital
-- p_Opt values:
--   'GET'      -> Fetch all active records (optional search)
--   'GETBYID'  -> Fetch single record by HospitalId
--   'INSERT'   -> Insert new record
--   'UPDATE'   -> Update existing record
--   'DELETE'   -> Soft delete (IsDeleted=1, Status='Inactive')
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterHospital;

DELIMITER $$

CREATE PROCEDURE SpMasterHospital(
    IN  p_Opt           VARCHAR(20),
    IN  p_HospitalId    INT,
    IN  p_HospitalCode  VARCHAR(50),
    IN  p_HospitalName  VARCHAR(255),
    IN  p_LegalName     VARCHAR(255),
    IN  p_RegistrationNo VARCHAR(100),
    IN  p_GstVatNo      VARCHAR(100),
    IN  p_PanTinNo      VARCHAR(100),
    IN  p_ContactNumber VARCHAR(20),
    IN  p_AlternateNumber VARCHAR(20),
    IN  p_Email         VARCHAR(255),
    IN  p_Website       VARCHAR(255),
    IN  p_Address1      VARCHAR(500),
    IN  p_Address2      VARCHAR(500),
    IN  p_Country       VARCHAR(100),
    IN  p_State         VARCHAR(100),
    IN  p_City          VARCHAR(100),
    IN  p_PostalCode    VARCHAR(20),
    IN  p_Currency      VARCHAR(10),
    IN  p_FinancialYear VARCHAR(20),
    IN  p_TimeZone      VARCHAR(100),
    IN  p_Status        VARCHAR(20),
    IN  p_Remarks       TEXT,
    IN  p_Search        VARCHAR(255)
)
BEGIN

    -- --------------------------------------------------------
    -- GET: Fetch all non-deleted records with optional search
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            HospitalId,
            HospitalCode,
            HospitalName,
            LegalName,
            RegistrationNo,
            GstVatNo,
            PanTinNo,
            ContactNumber,
            AlternateNumber,
            Email,
            Website,
            Address1,
            Address2,
            Country,
            State,
            City,
            PostalCode,
            Currency,
            FinancialYear,
            TimeZone,
            Status,
            Remarks,
            CreatedDate,
            ModifiedDate
        FROM Master_Hospital
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR HospitalCode  LIKE CONCAT('%', p_Search, '%')
            OR HospitalName  LIKE CONCAT('%', p_Search, '%')
            OR City          LIKE CONCAT('%', p_Search, '%')
            OR State         LIKE CONCAT('%', p_Search, '%')
            OR Status        LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY HospitalId DESC;

    -- --------------------------------------------------------
    -- GETBYID: Fetch single record by HospitalId
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            HospitalId,
            HospitalCode,
            HospitalName,
            LegalName,
            RegistrationNo,
            GstVatNo,
            PanTinNo,
            ContactNumber,
            AlternateNumber,
            Email,
            Website,
            Address1,
            Address2,
            Country,
            State,
            City,
            PostalCode,
            Currency,
            FinancialYear,
            TimeZone,
            Status,
            Remarks,
            CreatedDate,
            ModifiedDate
        FROM Master_Hospital
        WHERE HospitalId = p_HospitalId
          AND IsDeleted = 0;

    -- --------------------------------------------------------
    -- GETNEXTCODE: Generate next code
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETNEXTCODE' THEN
        SELECT CONCAT('HOS-', LPAD(COALESCE(MAX(HospitalId), 0) + 1, 3, '0')) AS NextCode
        FROM Master_Hospital;

    -- --------------------------------------------------------
    -- INSERT: Create new hospital record
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_Hospital (
            HospitalCode, HospitalName, LegalName, RegistrationNo,
            GstVatNo, PanTinNo, ContactNumber, AlternateNumber,
            Email, Website, Address1, Address2,
            Country, State, City, PostalCode,
            Currency, FinancialYear, TimeZone, Status, Remarks
        ) VALUES (
            p_HospitalCode, p_HospitalName, p_LegalName, p_RegistrationNo,
            p_GstVatNo, p_PanTinNo, p_ContactNumber, p_AlternateNumber,
            p_Email, p_Website, p_Address1, p_Address2,
            p_Country, p_State, p_City, p_PostalCode,
            p_Currency, p_FinancialYear, p_TimeZone, p_Status, p_Remarks
        );
        SELECT LAST_INSERT_ID() AS HospitalId;

    -- --------------------------------------------------------
    -- UPDATE: Update existing hospital record
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Hospital
        SET
            HospitalName    = p_HospitalName,
            LegalName       = p_LegalName,
            RegistrationNo  = p_RegistrationNo,
            GstVatNo        = p_GstVatNo,
            PanTinNo        = p_PanTinNo,
            ContactNumber   = p_ContactNumber,
            AlternateNumber = p_AlternateNumber,
            Email           = p_Email,
            Website         = p_Website,
            Address1        = p_Address1,
            Address2        = p_Address2,
            Country         = p_Country,
            State           = p_State,
            City            = p_City,
            PostalCode      = p_PostalCode,
            Currency        = p_Currency,
            FinancialYear   = p_FinancialYear,
            TimeZone        = p_TimeZone,
            Status          = p_Status,
            Remarks         = p_Remarks,
            ModifiedDate    = CURRENT_TIMESTAMP
        WHERE HospitalId = p_HospitalId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE: Soft delete - mark as deleted and inactive
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Hospital
        SET
            IsDeleted    = 1,
            Status       = 'Inactive',
            ModifiedDate = CURRENT_TIMESTAMP
        WHERE HospitalId = p_HospitalId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
