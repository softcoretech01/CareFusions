-- ============================================================
-- Insurance Provider Master - SQL Script
-- Database : admin
-- Table    : Master_InsuranceProvider
-- SP       : SpMasterInsuranceProvider
-- Screen   : /admin/masters/insurance-provider
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_InsuranceProvider
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_InsuranceProvider (
    InsuranceProviderId INT           NOT NULL AUTO_INCREMENT,
    ProviderCode        VARCHAR(20)   NOT NULL,               -- Auto-generated: INS-001
    ProviderName        VARCHAR(150)  NOT NULL,
    InsuranceType       ENUM('Health Insurance','Corporate Insurance',
                             'Government Health Scheme','Accident Insurance',
                             'Employee Health Plan','International Insurance') NOT NULL,
    RegistrationNumber  VARCHAR(50)   NULL,
    Description         VARCHAR(500)  NULL,

    -- Contact Information
    ContactPerson       VARCHAR(100)  NOT NULL,
    PhoneNumber         VARCHAR(20)   NOT NULL,
    AlternatePhone      VARCHAR(20)   NULL,
    Email               VARCHAR(150)  NOT NULL,
    Website             VARCHAR(255)  NULL,

    -- Address Information
    AddressLine1        VARCHAR(255)  NOT NULL,
    AddressLine2        VARCHAR(255)  NULL,
    Country             VARCHAR(100)  NOT NULL,
    State               VARCHAR(100)  NOT NULL,
    City                VARCHAR(100)  NOT NULL,
    PostalCode          VARCHAR(20)   NOT NULL,

    -- Claim Configuration
    ClaimPortalUrl      VARCHAR(255)  NULL,
    CashlessFacility    TINYINT(1)    NOT NULL DEFAULT 0,
    PreAuthRequired     TINYINT(1)    NOT NULL DEFAULT 1,
    ClaimSettlementDays INT           NULL,

    -- System Information
    Status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks             TEXT          NULL,

    -- Audit
    CreatedBy           VARCHAR(100)  NULL,
    CreatedDate         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100)  NULL,
    UpdatedDate         DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_InsuranceProvider PRIMARY KEY (InsuranceProviderId),
    CONSTRAINT UQ_InsuranceProvider_Code   UNIQUE (ProviderCode),
    -- NOTE: ProviderName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_InsuranceProvider_Name     (ProviderName),
    KEY IDX_InsuranceProvider_Type     (InsuranceType),
    KEY IDX_InsuranceProvider_Status   (Status),
    KEY IDX_InsuranceProvider_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterInsuranceProvider
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: ProviderName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_PROVIDER_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterInsuranceProvider;

DELIMITER $$

CREATE PROCEDURE SpMasterInsuranceProvider(
    IN  p_Opt                 VARCHAR(20),
    IN  p_InsuranceProviderId INT,
    IN  p_ProviderName        VARCHAR(150),
    IN  p_InsuranceType       VARCHAR(50),
    IN  p_RegistrationNumber  VARCHAR(50),
    IN  p_Description         VARCHAR(500),
    IN  p_ContactPerson       VARCHAR(100),
    IN  p_PhoneNumber         VARCHAR(20),
    IN  p_AlternatePhone      VARCHAR(20),
    IN  p_Email               VARCHAR(150),
    IN  p_Website             VARCHAR(255),
    IN  p_AddressLine1        VARCHAR(255),
    IN  p_AddressLine2        VARCHAR(255),
    IN  p_Country             VARCHAR(100),
    IN  p_State               VARCHAR(100),
    IN  p_City                VARCHAR(100),
    IN  p_PostalCode          VARCHAR(20),
    IN  p_ClaimPortalUrl      VARCHAR(255),
    IN  p_CashlessFacility    TINYINT,
    IN  p_PreAuthRequired     TINYINT,
    IN  p_ClaimSettlementDays INT,
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             TEXT,
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_TypeFilter          VARCHAR(50),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            InsuranceProviderId, ProviderCode, ProviderName, InsuranceType,
            RegistrationNumber, Description, ContactPerson, PhoneNumber, AlternatePhone,
            Email, Website, AddressLine1, AddressLine2, Country, State, City, PostalCode,
            ClaimPortalUrl, CashlessFacility, PreAuthRequired, ClaimSettlementDays,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_InsuranceProvider
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR ProviderCode  LIKE CONCAT('%', p_Search, '%')
            OR ProviderName  LIKE CONCAT('%', p_Search, '%')
            OR ContactPerson LIKE CONCAT('%', p_Search, '%')
            OR PhoneNumber   LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_TypeFilter   IS NULL OR p_TypeFilter   = '' OR InsuranceType = p_TypeFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status        = p_StatusFilter)
        ORDER BY InsuranceProviderId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            InsuranceProviderId, ProviderCode, ProviderName, InsuranceType,
            RegistrationNumber, Description, ContactPerson, PhoneNumber, AlternatePhone,
            Email, Website, AddressLine1, AddressLine2, Country, State, City, PostalCode,
            ClaimPortalUrl, CashlessFacility, PreAuthRequired, ClaimSettlementDays,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_InsuranceProvider
        WHERE InsuranceProviderId = p_InsuranceProviderId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('INS-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(ProviderCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS ProviderCode
        FROM Master_InsuranceProvider;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_InsuranceProvider
                WHERE ProviderName = p_ProviderName AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PROVIDER_NAME';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(ProviderCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_InsuranceProvider;

            SET v_Code = CONCAT('INS-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_InsuranceProvider (
                ProviderCode, ProviderName, InsuranceType, RegistrationNumber, Description,
                ContactPerson, PhoneNumber, AlternatePhone, Email, Website,
                AddressLine1, AddressLine2, Country, State, City, PostalCode,
                ClaimPortalUrl, CashlessFacility, PreAuthRequired, ClaimSettlementDays,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_ProviderName, p_InsuranceType, p_RegistrationNumber, p_Description,
                p_ContactPerson, p_PhoneNumber, p_AlternatePhone, p_Email, p_Website,
                p_AddressLine1, p_AddressLine2, p_Country, p_State, p_City, p_PostalCode,
                p_ClaimPortalUrl, p_CashlessFacility, p_PreAuthRequired, p_ClaimSettlementDays,
                p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS InsuranceProviderId, v_Code AS ProviderCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_InsuranceProvider
            WHERE ProviderName = p_ProviderName
              AND IsDeleted = 0
              AND InsuranceProviderId <> p_InsuranceProviderId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PROVIDER_NAME';
        END IF;

        UPDATE Master_InsuranceProvider
        SET
            ProviderName        = p_ProviderName,
            InsuranceType       = p_InsuranceType,
            RegistrationNumber  = p_RegistrationNumber,
            Description         = p_Description,
            ContactPerson       = p_ContactPerson,
            PhoneNumber         = p_PhoneNumber,
            AlternatePhone      = p_AlternatePhone,
            Email               = p_Email,
            Website             = p_Website,
            AddressLine1        = p_AddressLine1,
            AddressLine2        = p_AddressLine2,
            Country             = p_Country,
            State               = p_State,
            City                = p_City,
            PostalCode          = p_PostalCode,
            ClaimPortalUrl      = p_ClaimPortalUrl,
            CashlessFacility    = p_CashlessFacility,
            PreAuthRequired     = p_PreAuthRequired,
            ClaimSettlementDays = p_ClaimSettlementDays,
            Status              = p_Status,
            Remarks             = p_Remarks,
            UpdatedBy           = p_UpdatedBy,
            UpdatedDate         = CURRENT_TIMESTAMP
        WHERE InsuranceProviderId = p_InsuranceProviderId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_InsuranceProvider
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE InsuranceProviderId = p_InsuranceProviderId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_InsuranceProvider
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE InsuranceProviderId = p_InsuranceProviderId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
