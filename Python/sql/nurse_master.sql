-- ==============================================================================
-- Nurse Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_Nurse Table
CREATE TABLE IF NOT EXISTS Master_Nurse (
    NurseId             INT AUTO_INCREMENT PRIMARY KEY,
    NurseCode           VARCHAR(20) NOT NULL UNIQUE,
    EmployeeCode        VARCHAR(50) NOT NULL,
    NurseName           VARCHAR(100) NOT NULL,
    Gender              VARCHAR(20),
    DateOfBirth         DATE,
    Qualification       VARCHAR(100),
    RegistrationNumber  VARCHAR(100) NOT NULL,
    DepartmentName      VARCHAR(100),
    Designation         VARCHAR(100),
    HospitalName        VARCHAR(150),
    BranchName          VARCHAR(150),
    Mobile              VARCHAR(20) NOT NULL,
    AlternateMobile     VARCHAR(20),
    Email               VARCHAR(150),
    Address             VARCHAR(255),
    City                VARCHAR(100),
    State               VARCHAR(100),
    Country             VARCHAR(100),
    PostalCode          VARCHAR(20),
    JoiningDate         DATE,
    Shift               VARCHAR(50),
    ReportingManager    VARCHAR(100),
    EmploymentType      VARCHAR(50),
    ExperienceYears     INT,
    
    ProfilePhoto        VARCHAR(500),
    NursingLicense      VARCHAR(500),
    QualificationCertificate VARCHAR(500),
    IdProof             VARCHAR(500),
    
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,
    
    CreatedBy           VARCHAR(100) DEFAULT 'System',
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0,
    
    INDEX idx_nurse_status (Status),
    INDEX idx_nurse_code (NurseCode),
    INDEX idx_nurse_name (NurseName)
);

-- 2. SpMasterNurse Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterNurse //

CREATE PROCEDURE SpMasterNurse (
    IN p_Opt                VARCHAR(20),
    IN p_NurseId            INT,
    
    IN p_EmployeeCode       VARCHAR(50),
    IN p_NurseName          VARCHAR(100),
    IN p_Gender             VARCHAR(20),
    IN p_DateOfBirth        DATE,
    IN p_Qualification      VARCHAR(100),
    IN p_RegistrationNumber VARCHAR(100),
    IN p_DepartmentName     VARCHAR(100),
    IN p_Designation        VARCHAR(100),
    IN p_HospitalName       VARCHAR(150),
    IN p_BranchName         VARCHAR(150),
    IN p_Mobile             VARCHAR(20),
    IN p_AlternateMobile    VARCHAR(20),
    IN p_Email              VARCHAR(150),
    IN p_Address            VARCHAR(255),
    IN p_City               VARCHAR(100),
    IN p_State              VARCHAR(100),
    IN p_Country            VARCHAR(100),
    IN p_PostalCode         VARCHAR(20),
    IN p_JoiningDate        DATE,
    IN p_Shift              VARCHAR(50),
    IN p_ReportingManager   VARCHAR(100),
    IN p_EmploymentType     VARCHAR(50),
    IN p_ExperienceYears    INT,
    
    IN p_ProfilePhoto       VARCHAR(500),
    IN p_NursingLicense     VARCHAR(500),
    IN p_QualificationCertificate VARCHAR(500),
    IN p_IdProof            VARCHAR(500),
    
    IN p_Status             VARCHAR(20),
    IN p_Remarks            TEXT,
    IN p_CreatedBy          VARCHAR(100),
    IN p_ModifiedBy         VARCHAR(100),
    
    IN p_Search             VARCHAR(255)
)
BEGIN
    DECLARE v_NurseCode VARCHAR(20);
    DECLARE v_NextId INT;
    DECLARE v_NurseId INT;

    -- ==================================================================
    -- GET (All)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT 
            NurseId, NurseCode, EmployeeCode, NurseName, Gender, DateOfBirth, Qualification,
            RegistrationNumber, DepartmentName, Designation, HospitalName, BranchName,
            Mobile, AlternateMobile, Email, Address, City, State, Country, PostalCode,
            JoiningDate, Shift, ReportingManager, EmploymentType, ExperienceYears,
            ProfilePhoto, NursingLicense, QualificationCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Nurse
        WHERE IsDeleted = 0
        ORDER BY NurseId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT 
            NurseId, NurseCode, EmployeeCode, NurseName, Gender, DateOfBirth, Qualification,
            RegistrationNumber, DepartmentName, Designation, HospitalName, BranchName,
            Mobile, AlternateMobile, Email, Address, City, State, Country, PostalCode,
            JoiningDate, Shift, ReportingManager, EmploymentType, ExperienceYears,
            ProfilePhoto, NursingLicense, QualificationCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Nurse
        WHERE NurseId = p_NurseId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT 
            NurseId, NurseCode, EmployeeCode, NurseName, Gender, DateOfBirth, Qualification,
            RegistrationNumber, DepartmentName, Designation, HospitalName, BranchName,
            Mobile, AlternateMobile, Email, Address, City, State, Country, PostalCode,
            JoiningDate, Shift, ReportingManager, EmploymentType, ExperienceYears,
            ProfilePhoto, NursingLicense, QualificationCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Nurse
        WHERE IsDeleted = 0
          AND (NurseName LIKE CONCAT('%', p_Search, '%') OR NurseCode LIKE CONCAT('%', p_Search, '%'))
        ORDER BY NurseId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        -- Generate Code (e.g., NUR-001)
        SELECT IFNULL(MAX(NurseId), 0) + 1 INTO v_NextId FROM Master_Nurse;
        SET v_NurseCode = CONCAT('NUR-', LPAD(v_NextId, 3, '0'));

        INSERT INTO Master_Nurse (
            NurseCode, EmployeeCode, NurseName, Gender, DateOfBirth, Qualification,
            RegistrationNumber, DepartmentName, Designation, HospitalName, BranchName,
            Mobile, AlternateMobile, Email, Address, City, State, Country, PostalCode,
            JoiningDate, Shift, ReportingManager, EmploymentType, ExperienceYears,
            ProfilePhoto, NursingLicense, QualificationCertificate, IdProof,
            Status, Remarks, CreatedDate, CreatedBy, IsDeleted
        ) VALUES (
            v_NurseCode, p_EmployeeCode, p_NurseName, p_Gender, p_DateOfBirth, p_Qualification,
            p_RegistrationNumber, p_DepartmentName, p_Designation, p_HospitalName, p_BranchName,
            p_Mobile, p_AlternateMobile, p_Email, p_Address, p_City, p_State, p_Country, p_PostalCode,
            p_JoiningDate, p_Shift, p_ReportingManager, p_EmploymentType, p_ExperienceYears,
            p_ProfilePhoto, p_NursingLicense, p_QualificationCertificate, p_IdProof,
            p_Status, p_Remarks, CURRENT_TIMESTAMP, p_CreatedBy, 0
        );
        
        SET v_NurseId = LAST_INSERT_ID();
        SELECT NurseId FROM Master_Nurse WHERE NurseId = v_NurseId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Nurse
        SET 
            EmployeeCode       = p_EmployeeCode,
            NurseName          = p_NurseName,
            Gender             = p_Gender,
            DateOfBirth        = p_DateOfBirth,
            Qualification      = p_Qualification,
            RegistrationNumber = p_RegistrationNumber,
            DepartmentName     = p_DepartmentName,
            Designation        = p_Designation,
            HospitalName       = p_HospitalName,
            BranchName         = p_BranchName,
            Mobile             = p_Mobile,
            AlternateMobile    = p_AlternateMobile,
            Email              = p_Email,
            Address            = p_Address,
            City               = p_City,
            State              = p_State,
            Country            = p_Country,
            PostalCode         = p_PostalCode,
            JoiningDate        = p_JoiningDate,
            Shift              = p_Shift,
            ReportingManager   = p_ReportingManager,
            EmploymentType     = p_EmploymentType,
            ExperienceYears    = p_ExperienceYears,
            ProfilePhoto       = p_ProfilePhoto,
            NursingLicense     = p_NursingLicense,
            QualificationCertificate = p_QualificationCertificate,
            IdProof            = p_IdProof,
            Status             = p_Status,
            Remarks            = p_Remarks,
            ModifiedDate       = CURRENT_TIMESTAMP,
            ModifiedBy         = p_ModifiedBy
        WHERE NurseId = p_NurseId AND IsDeleted = 0;

    -- ==================================================================
    -- DELETE
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Nurse
        SET IsDeleted = 1, ModifiedDate = CURRENT_TIMESTAMP
        WHERE NurseId = p_NurseId;

    END IF;
END //

DELIMITER ;
