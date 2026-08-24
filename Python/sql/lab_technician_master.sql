-- ==============================================================================
-- Lab Technician Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_LabTechnician Table
CREATE TABLE IF NOT EXISTS Master_LabTechnician (
    TechnicianId        INT AUTO_INCREMENT PRIMARY KEY,
    TechnicianCode      VARCHAR(20) NOT NULL UNIQUE,
    EmployeeCode        VARCHAR(50) NOT NULL,
    TechnicianName      VARCHAR(100) NOT NULL,
    Qualification       VARCHAR(100) NOT NULL,
    DepartmentName      VARCHAR(100) NOT NULL,
    LaboratoryName      VARCHAR(100) NOT NULL,
    HospitalName        VARCHAR(150),
    BranchName          VARCHAR(150),
    Mobile              VARCHAR(20) NOT NULL,
    Email               VARCHAR(150),
    Address             VARCHAR(255),
    JoiningDate         DATE,
    ExperienceYears     INT,
    Shift               VARCHAR(50) NOT NULL,
    ReportingManager    VARCHAR(100),
    
    ProfilePhoto        VARCHAR(500),
    QualificationCertificate VARCHAR(500),
    IdProof             VARCHAR(500),
    
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,
    
    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterLabTechnician Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterLabTechnician //

CREATE PROCEDURE SpMasterLabTechnician (
    IN p_Opt                        VARCHAR(20),
    IN p_TechnicianId               INT,
    
    IN p_TechnicianName             VARCHAR(100),
    IN p_Qualification              VARCHAR(100),
    IN p_DepartmentName             VARCHAR(100),
    IN p_LaboratoryName             VARCHAR(100),
    IN p_HospitalName               VARCHAR(150),
    IN p_BranchName                 VARCHAR(150),
    IN p_Mobile                     VARCHAR(20),
    IN p_Email                      VARCHAR(150),
    IN p_Address                    VARCHAR(255),
    IN p_JoiningDate                DATE,
    IN p_ExperienceYears            INT,
    IN p_Shift                      VARCHAR(50),
    IN p_ReportingManager           VARCHAR(100),
    
    IN p_ProfilePhoto               VARCHAR(500),
    IN p_QualificationCertificate   VARCHAR(500),
    IN p_IdProof                    VARCHAR(500),
    
    IN p_Status                     VARCHAR(20),
    IN p_Remarks                    TEXT,
    IN p_CreatedBy                  VARCHAR(100),
    IN p_ModifiedBy                 VARCHAR(100),
    
    IN p_Search                     VARCHAR(255)
)
BEGIN
    DECLARE v_TechnicianCode VARCHAR(20);
    DECLARE v_NextId INT;
    DECLARE v_TechnicianId INT;

    -- ==================================================================
    -- GET (All)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT 
            TechnicianId, TechnicianCode, TechnicianName, Qualification,
            DepartmentName, LaboratoryName, HospitalName, BranchName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, ReportingManager,
            ProfilePhoto, QualificationCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_LabTechnician
        WHERE IsDeleted = 0
        ORDER BY TechnicianId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT 
            TechnicianId, TechnicianCode, TechnicianName, Qualification,
            DepartmentName, LaboratoryName, HospitalName, BranchName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, ReportingManager,
            ProfilePhoto, QualificationCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_LabTechnician
        WHERE TechnicianId = p_TechnicianId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT 
            TechnicianId, TechnicianCode, TechnicianName, Qualification,
            DepartmentName, LaboratoryName, HospitalName, BranchName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, ReportingManager,
            ProfilePhoto, QualificationCertificate, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_LabTechnician
        WHERE IsDeleted = 0
          AND (TechnicianName LIKE CONCAT('%', p_Search, '%') OR TechnicianCode LIKE CONCAT('%', p_Search, '%') OR Mobile LIKE CONCAT('%', p_Search, '%'))
        ORDER BY TechnicianId DESC;

    -- ==================================================================
    -- GETNEXTCODE
    -- ==================================================================
    ELSEIF p_Opt = 'GETNEXTCODE' THEN
        SELECT CONCAT('LAB-', LPAD(IFNULL(MAX(TechnicianId), 0) + 1, 3, '0')) AS NextCode
        FROM Master_LabTechnician;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        -- Generate Code (e.g., LAB-001)
        SELECT IFNULL(MAX(TechnicianId), 0) + 1 INTO v_NextId FROM Master_LabTechnician;
        SET v_TechnicianCode = CONCAT('LAB-', LPAD(v_NextId, 3, '0'));
        
        INSERT INTO Master_LabTechnician (
            TechnicianCode, TechnicianName, Qualification, DepartmentName,
            LaboratoryName, HospitalName, BranchName, Mobile, Email, Address,
            JoiningDate, ExperienceYears, Shift, ReportingManager,
            ProfilePhoto, QualificationCertificate, IdProof,
            Status, Remarks, CreatedDate, CreatedBy, IsDeleted
        ) VALUES (
            v_TechnicianCode, p_TechnicianName, p_Qualification, p_DepartmentName,
            p_LaboratoryName, p_HospitalName, p_BranchName, p_Mobile, p_Email, p_Address,
            p_JoiningDate, p_ExperienceYears, p_Shift, p_ReportingManager,
            p_ProfilePhoto, p_QualificationCertificate, p_IdProof,
            p_Status, p_Remarks, CURRENT_TIMESTAMP, p_CreatedBy, 0
        );
        
        -- Return the newly inserted row ID
        SELECT LAST_INSERT_ID() AS TechnicianId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_LabTechnician
        SET 
            TechnicianName           = p_TechnicianName,
            Qualification            = p_Qualification,
            DepartmentName           = p_DepartmentName,
            LaboratoryName           = p_LaboratoryName,
            HospitalName             = p_HospitalName,
            BranchName               = p_BranchName,
            Mobile                   = p_Mobile,
            Email                    = p_Email,
            Address                  = p_Address,
            JoiningDate              = p_JoiningDate,
            ExperienceYears          = p_ExperienceYears,
            Shift                    = p_Shift,
            ReportingManager         = p_ReportingManager,
            ProfilePhoto             = p_ProfilePhoto,
            QualificationCertificate = p_QualificationCertificate,
            IdProof                  = p_IdProof,
            Status                   = p_Status,
            Remarks                  = p_Remarks,
            ModifiedDate             = CURRENT_TIMESTAMP,
            ModifiedBy               = p_ModifiedBy
        WHERE TechnicianId = p_TechnicianId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_LabTechnician
        SET 
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE TechnicianId = p_TechnicianId;
        
    END IF;

END //

DELIMITER ;
