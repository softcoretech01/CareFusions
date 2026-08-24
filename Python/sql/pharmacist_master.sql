-- ==============================================================================
-- Pharmacist Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_Pharmacist Table
CREATE TABLE IF NOT EXISTS Master_Pharmacist (
    PharmacistId        INT AUTO_INCREMENT PRIMARY KEY,
    PharmacistCode      VARCHAR(20) NOT NULL UNIQUE,
    EmployeeCode        VARCHAR(50) NOT NULL,
    PharmacistName      VARCHAR(100) NOT NULL,
    LicenseNumber       VARCHAR(100) NOT NULL,
    Qualification       VARCHAR(100),
    HospitalName        VARCHAR(150),
    BranchName          VARCHAR(150),
    PharmacyName        VARCHAR(150),
    Mobile              VARCHAR(20) NOT NULL,
    Email               VARCHAR(150),
    Address             VARCHAR(255),
    JoiningDate         DATE,
    ExperienceYears     INT,
    Shift               VARCHAR(50),
    EmploymentType      VARCHAR(50),
    
    Photo               VARCHAR(500),
    LicenseCertificate  VARCHAR(500),
    IdProof             VARCHAR(500),
    
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,
    
    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterPharmacist Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterPharmacist //

CREATE PROCEDURE SpMasterPharmacist (
    IN p_Opt                VARCHAR(20),
    IN p_PharmacistId       INT,
    
    IN p_PharmacistName     VARCHAR(100),
    IN p_LicenseNumber      VARCHAR(100),
    IN p_Qualification      VARCHAR(100),
    IN p_HospitalName       VARCHAR(150),
    IN p_BranchName         VARCHAR(150),
    IN p_PharmacyName       VARCHAR(150),
    IN p_Mobile             VARCHAR(20),
    IN p_Email              VARCHAR(150),
    IN p_Address            VARCHAR(255),
    IN p_JoiningDate        DATE,
    IN p_ExperienceYears    INT,
    IN p_Shift              VARCHAR(50),
    IN p_EmploymentType     VARCHAR(50),
    
    IN p_Photo              VARCHAR(500),
    IN p_LicenseCertificate VARCHAR(500),
    IN p_IdProof            VARCHAR(500),
    
    IN p_Status             VARCHAR(20),
    IN p_Remarks            TEXT,
    IN p_CreatedBy          VARCHAR(100),
    IN p_ModifiedBy         VARCHAR(100),
    
    IN p_Search             VARCHAR(255)
)
BEGIN
    DECLARE v_PharmacistCode VARCHAR(20);
    DECLARE v_NextId INT;
    DECLARE v_PharmacistId INT;

    -- ==================================================================
    -- GET (All)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT 
            PharmacistId, PharmacistCode, PharmacistName, LicenseNumber, Qualification,
            HospitalName, BranchName, PharmacyName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, EmploymentType,
            Photo, LicenseCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Pharmacist
        WHERE IsDeleted = 0
        ORDER BY PharmacistId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT 
            PharmacistId, PharmacistCode, PharmacistName, LicenseNumber, Qualification,
            HospitalName, BranchName, PharmacyName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, EmploymentType,
            Photo, LicenseCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Pharmacist
        WHERE PharmacistId = p_PharmacistId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT 
            PharmacistId, PharmacistCode, PharmacistName, LicenseNumber, Qualification,
            HospitalName, BranchName, PharmacyName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, EmploymentType,
            Photo, LicenseCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Pharmacist
        WHERE IsDeleted = 0
          AND (PharmacistName LIKE CONCAT('%', p_Search, '%') OR PharmacistCode LIKE CONCAT('%', p_Search, '%') OR LicenseNumber LIKE CONCAT('%', p_Search, '%'))
        ORDER BY PharmacistId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        -- Generate Code (e.g., PHA-001)
        SELECT IFNULL(MAX(PharmacistId), 0) + 1 INTO v_NextId FROM Master_Pharmacist;
        SET v_PharmacistCode = CONCAT('PHA-', LPAD(v_NextId, 3, '0'));
        
        INSERT INTO Master_Pharmacist (
            PharmacistCode, PharmacistName, LicenseNumber, Qualification,
            HospitalName, BranchName, PharmacyName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, EmploymentType,
            Photo, LicenseCertificate, IdProof,
            Status, Remarks, CreatedDate, CreatedBy, IsDeleted
        ) VALUES (
            v_PharmacistCode, p_PharmacistName, p_LicenseNumber, p_Qualification,
            p_HospitalName, p_BranchName, p_PharmacyName, p_Mobile, p_Email, p_Address,
            p_JoiningDate, p_ExperienceYears, p_Shift, p_EmploymentType,
            p_Photo, p_LicenseCertificate, p_IdProof,
            p_Status, p_Remarks, CURRENT_TIMESTAMP, p_CreatedBy, 0
        );
        
        -- Return the newly inserted row ID
        SELECT LAST_INSERT_ID() AS PharmacistId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Pharmacist
        SET 
            PharmacistName     = p_PharmacistName,
            LicenseNumber      = p_LicenseNumber,
            Qualification      = p_Qualification,
            HospitalName       = p_HospitalName,
            BranchName         = p_BranchName,
            PharmacyName       = p_PharmacyName,
            Mobile             = p_Mobile,
            Email              = p_Email,
            Address            = p_Address,
            JoiningDate        = p_JoiningDate,
            ExperienceYears    = p_ExperienceYears,
            Shift              = p_Shift,
            EmploymentType     = p_EmploymentType,
            Photo              = p_Photo,
            LicenseCertificate = p_LicenseCertificate,
            IdProof            = p_IdProof,
            Status             = p_Status,
            Remarks            = p_Remarks,
            ModifiedDate       = CURRENT_TIMESTAMP,
            ModifiedBy         = p_ModifiedBy
        WHERE PharmacistId = p_PharmacistId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Pharmacist
        SET 
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE PharmacistId = p_PharmacistId;
        
    END IF;

END //

DELIMITER ;
