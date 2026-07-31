-- ==============================================================================
-- Patient Category Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_PatientCategory Table
CREATE TABLE IF NOT EXISTS Master_PatientCategory (
    PatientCategoryId   INT AUTO_INCREMENT PRIMARY KEY,
    CategoryCode        VARCHAR(50) NOT NULL UNIQUE,
    CategoryName        VARCHAR(100) NOT NULL,
    Description         VARCHAR(255),
    BillingType         VARCHAR(50) NOT NULL,
    DefaultDiscount     DECIMAL(5, 2) DEFAULT 0,
    CreditLimit         DECIMAL(10, 2) DEFAULT 0,
    ApprovalRequired    TINYINT(1) DEFAULT 0,
    InsuranceApplicable TINYINT(1) DEFAULT 0,
    CorporateApplicable TINYINT(1) DEFAULT 0,
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,

    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterPatientCategory Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterPatientCategory //

CREATE PROCEDURE SpMasterPatientCategory (
    IN p_Opt                    VARCHAR(20),
    IN p_PatientCategoryId      INT,

    IN p_CategoryCode           VARCHAR(50),
    IN p_CategoryName           VARCHAR(100),
    IN p_Description            VARCHAR(255),
    IN p_BillingType            VARCHAR(50),
    IN p_DefaultDiscount        DECIMAL(5, 2),
    IN p_CreditLimit            DECIMAL(10, 2),
    IN p_ApprovalRequired       TINYINT(1),
    IN p_InsuranceApplicable    TINYINT(1),
    IN p_CorporateApplicable    TINYINT(1),

    IN p_Status                 VARCHAR(20),
    IN p_Remarks                TEXT,
    IN p_CreatedBy              VARCHAR(100),
    IN p_ModifiedBy             VARCHAR(100),

    IN p_Search                 VARCHAR(255)
)
BEGIN
    -- ==================================================================
    -- GET (All active)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT
            PatientCategoryId, CategoryCode, CategoryName, Description,
            BillingType, DefaultDiscount, CreditLimit, ApprovalRequired,
            InsuranceApplicable, CorporateApplicable,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_PatientCategory
        WHERE IsDeleted = 0
        ORDER BY PatientCategoryId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            PatientCategoryId, CategoryCode, CategoryName, Description,
            BillingType, DefaultDiscount, CreditLimit, ApprovalRequired,
            InsuranceApplicable, CorporateApplicable,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_PatientCategory
        WHERE PatientCategoryId = p_PatientCategoryId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            PatientCategoryId, CategoryCode, CategoryName, Description,
            BillingType, DefaultDiscount, CreditLimit, ApprovalRequired,
            InsuranceApplicable, CorporateApplicable,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_PatientCategory
        WHERE IsDeleted = 0
          AND (
            CategoryName LIKE CONCAT('%', p_Search, '%') OR
            CategoryCode LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY PatientCategoryId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_PatientCategory (
            CategoryCode, CategoryName, Description, BillingType, DefaultDiscount,
            CreditLimit, ApprovalRequired, InsuranceApplicable, CorporateApplicable,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_CategoryCode, p_CategoryName, p_Description, p_BillingType, p_DefaultDiscount,
            p_CreditLimit, p_ApprovalRequired, p_InsuranceApplicable, p_CorporateApplicable,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS PatientCategoryId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_PatientCategory
        SET
            CategoryCode        = p_CategoryCode,
            CategoryName        = p_CategoryName,
            Description         = p_Description,
            BillingType         = p_BillingType,
            DefaultDiscount     = p_DefaultDiscount,
            CreditLimit         = p_CreditLimit,
            ApprovalRequired    = p_ApprovalRequired,
            InsuranceApplicable = p_InsuranceApplicable,
            CorporateApplicable = p_CorporateApplicable,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE PatientCategoryId = p_PatientCategoryId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_PatientCategory
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE PatientCategoryId = p_PatientCategoryId;

    END IF;

END //

DELIMITER ;
