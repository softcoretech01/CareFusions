-- ============================================================
-- TPA (Third Party Administrator) Master - SQL Script
-- Database : admin
-- Table    : Master_Tpa
-- SP       : SpMasterTpa
-- Screen   : /admin/masters/tpa
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Tpa
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Tpa (
    TpaId               INT           NOT NULL AUTO_INCREMENT,
    TpaCode             VARCHAR(20)   NOT NULL,               -- Auto-generated: TPA-001
    TpaName             VARCHAR(150)  NOT NULL,
    InsuranceProvider   VARCHAR(150)  NOT NULL,
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

    -- Claim Processing
    ClaimProcessingTime INT           NULL,                   -- Days
    CashlessApproval    TINYINT(1)    NOT NULL DEFAULT 0,
    OnlineClaimPortal   VARCHAR(255)  NULL,

    -- System Information
    Status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks             TEXT          NULL,

    -- Audit
    CreatedBy           VARCHAR(100)  NULL,
    CreatedDate         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100)  NULL,
    UpdatedDate         DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Tpa PRIMARY KEY (TpaId),
    CONSTRAINT UQ_Tpa_Code   UNIQUE (TpaCode),
    -- NOTE: TpaName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Tpa_Name     (TpaName),
    KEY IDX_Tpa_Provider (InsuranceProvider),
    KEY IDX_Tpa_Status   (Status),
    KEY IDX_Tpa_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterTpa
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: TpaName must be unique among NON-DELETED rows. Violations raise
-- SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_TPA_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterTpa;

DELIMITER $$

CREATE PROCEDURE SpMasterTpa(
    IN  p_Opt                 VARCHAR(20),
    IN  p_TpaId               INT,
    IN  p_TpaName             VARCHAR(150),
    IN  p_InsuranceProvider   VARCHAR(150),
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
    IN  p_ClaimProcessingTime INT,
    IN  p_CashlessApproval    TINYINT,
    IN  p_OnlineClaimPortal   VARCHAR(255),
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             TEXT,
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_ProviderFilter      VARCHAR(150),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            TpaId, TpaCode, TpaName, InsuranceProvider, RegistrationNumber, Description,
            ContactPerson, PhoneNumber, AlternatePhone, Email, Website,
            AddressLine1, AddressLine2, Country, State, City, PostalCode,
            ClaimProcessingTime, CashlessApproval, OnlineClaimPortal,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Tpa
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR TpaCode       LIKE CONCAT('%', p_Search, '%')
            OR TpaName       LIKE CONCAT('%', p_Search, '%')
            OR ContactPerson LIKE CONCAT('%', p_Search, '%')
            OR PhoneNumber   LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_ProviderFilter IS NULL OR p_ProviderFilter = '' OR InsuranceProvider = p_ProviderFilter)
          AND (p_StatusFilter   IS NULL OR p_StatusFilter   = '' OR Status            = p_StatusFilter)
        ORDER BY TpaId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            TpaId, TpaCode, TpaName, InsuranceProvider, RegistrationNumber, Description,
            ContactPerson, PhoneNumber, AlternatePhone, Email, Website,
            AddressLine1, AddressLine2, Country, State, City, PostalCode,
            ClaimProcessingTime, CashlessApproval, OnlineClaimPortal,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Tpa
        WHERE TpaId = p_TpaId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('TPA-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(TpaCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS TpaCode
        FROM Master_Tpa;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_Tpa
                WHERE TpaName = p_TpaName AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TPA_NAME';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(TpaCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_Tpa;

            SET v_Code = CONCAT('TPA-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Tpa (
                TpaCode, TpaName, InsuranceProvider, RegistrationNumber, Description,
                ContactPerson, PhoneNumber, AlternatePhone, Email, Website,
                AddressLine1, AddressLine2, Country, State, City, PostalCode,
                ClaimProcessingTime, CashlessApproval, OnlineClaimPortal,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_TpaName, p_InsuranceProvider, p_RegistrationNumber, p_Description,
                p_ContactPerson, p_PhoneNumber, p_AlternatePhone, p_Email, p_Website,
                p_AddressLine1, p_AddressLine2, p_Country, p_State, p_City, p_PostalCode,
                p_ClaimProcessingTime, p_CashlessApproval, p_OnlineClaimPortal,
                p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS TpaId, v_Code AS TpaCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Tpa
            WHERE TpaName = p_TpaName
              AND IsDeleted = 0
              AND TpaId <> p_TpaId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TPA_NAME';
        END IF;

        UPDATE Master_Tpa
        SET
            TpaName             = p_TpaName,
            InsuranceProvider   = p_InsuranceProvider,
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
            ClaimProcessingTime = p_ClaimProcessingTime,
            CashlessApproval    = p_CashlessApproval,
            OnlineClaimPortal   = p_OnlineClaimPortal,
            Status              = p_Status,
            Remarks             = p_Remarks,
            UpdatedBy           = p_UpdatedBy,
            UpdatedDate         = CURRENT_TIMESTAMP
        WHERE TpaId = p_TpaId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Tpa
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE TpaId = p_TpaId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Tpa
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE TpaId = p_TpaId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
