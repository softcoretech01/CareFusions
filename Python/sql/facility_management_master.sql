-- ==============================================================================
-- Facility Management Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_FacilityManagement Table
CREATE TABLE IF NOT EXISTS Master_FacilityManagement (
    FacilityStaffId     INT AUTO_INCREMENT PRIMARY KEY,
    EmployeeCode_FM     VARCHAR(20) NOT NULL UNIQUE,
    EmployeeCode        VARCHAR(50) NOT NULL,
    StaffName           VARCHAR(100) NOT NULL,
    StaffCategory       VARCHAR(100) NOT NULL,
    HospitalName        VARCHAR(150),
    BranchName          VARCHAR(150),
    AssignedArea        VARCHAR(150) NOT NULL,
    Mobile              VARCHAR(20) NOT NULL,
    Email               VARCHAR(150),
    Address             VARCHAR(255),
    JoiningDate         DATE NOT NULL,
    Shift               VARCHAR(50) NOT NULL,
    EmploymentType      VARCHAR(50),
    Supervisor          VARCHAR(100),

    ProfilePhoto        VARCHAR(500),
    IdProof             VARCHAR(500),
    PoliceVerification  VARCHAR(500),

    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,

    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterFacilityManagement Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterFacilityManagement //

CREATE PROCEDURE SpMasterFacilityManagement (
    IN p_Opt                    VARCHAR(20),
    IN p_FacilityStaffId        INT,

    IN p_EmployeeCode           VARCHAR(50),
    IN p_StaffName              VARCHAR(100),
    IN p_StaffCategory          VARCHAR(100),
    IN p_HospitalName           VARCHAR(150),
    IN p_BranchName             VARCHAR(150),
    IN p_AssignedArea           VARCHAR(150),
    IN p_Mobile                 VARCHAR(20),
    IN p_Email                  VARCHAR(150),
    IN p_Address                VARCHAR(255),
    IN p_JoiningDate            DATE,
    IN p_Shift                  VARCHAR(50),
    IN p_EmploymentType         VARCHAR(50),
    IN p_Supervisor             VARCHAR(100),

    IN p_ProfilePhoto           VARCHAR(500),
    IN p_IdProof                VARCHAR(500),
    IN p_PoliceVerification     VARCHAR(500),

    IN p_Status                 VARCHAR(20),
    IN p_Remarks                TEXT,
    IN p_CreatedBy              VARCHAR(100),
    IN p_ModifiedBy             VARCHAR(100),

    IN p_Search                 VARCHAR(255)
)
BEGIN
    DECLARE v_FMCode VARCHAR(20);
    DECLARE v_NextId INT;

    -- ==================================================================
    -- GET (All active)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT
            FacilityStaffId, EmployeeCode_FM, EmployeeCode, StaffName, StaffCategory,
            HospitalName, BranchName, AssignedArea,
            Mobile, Email, Address, JoiningDate, Shift, EmploymentType, Supervisor,
            ProfilePhoto, IdProof, PoliceVerification,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_FacilityManagement
        WHERE IsDeleted = 0
        ORDER BY FacilityStaffId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            FacilityStaffId, EmployeeCode_FM, EmployeeCode, StaffName, StaffCategory,
            HospitalName, BranchName, AssignedArea,
            Mobile, Email, Address, JoiningDate, Shift, EmploymentType, Supervisor,
            ProfilePhoto, IdProof, PoliceVerification,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_FacilityManagement
        WHERE FacilityStaffId = p_FacilityStaffId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            FacilityStaffId, EmployeeCode_FM, EmployeeCode, StaffName, StaffCategory,
            HospitalName, BranchName, AssignedArea,
            Mobile, Email, Address, JoiningDate, Shift, EmploymentType, Supervisor,
            ProfilePhoto, IdProof, PoliceVerification,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_FacilityManagement
        WHERE IsDeleted = 0
          AND (
            StaffName        LIKE CONCAT('%', p_Search, '%') OR
            EmployeeCode_FM  LIKE CONCAT('%', p_Search, '%') OR
            Mobile           LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY FacilityStaffId DESC;

    -- ==================================================================
    -- GETNEXTCODE
    -- ==================================================================
    ELSEIF p_Opt = 'GETNEXTCODE' THEN
        SELECT CONCAT('FAC-', LPAD(COALESCE(MAX(CAST(SUBSTRING(EmployeeCode_FM, 5) AS UNSIGNED)), 0) + 1, 3, '0')) AS NextCode
        FROM Master_FacilityManagement;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(EmployeeCode_FM, 5) AS UNSIGNED)), 0) + 1 INTO v_NextId FROM Master_FacilityManagement;
        SET v_FMCode = CONCAT('FAC-', LPAD(v_NextId, 3, '0'));

        INSERT INTO Master_FacilityManagement (
            EmployeeCode_FM, EmployeeCode, StaffName, StaffCategory,
            HospitalName, BranchName, AssignedArea,
            Mobile, Email, Address, JoiningDate, Shift, EmploymentType, Supervisor,
            ProfilePhoto, IdProof, PoliceVerification,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            v_FMCode, p_EmployeeCode, p_StaffName, p_StaffCategory,
            p_HospitalName, p_BranchName, p_AssignedArea,
            p_Mobile, p_Email, p_Address, p_JoiningDate, p_Shift, p_EmploymentType, p_Supervisor,
            p_ProfilePhoto, p_IdProof, p_PoliceVerification,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS FacilityStaffId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_FacilityManagement
        SET
            EmployeeCode        = p_EmployeeCode,
            StaffName           = p_StaffName,
            StaffCategory       = p_StaffCategory,
            HospitalName        = p_HospitalName,
            BranchName          = p_BranchName,
            AssignedArea        = p_AssignedArea,
            Mobile              = p_Mobile,
            Email               = p_Email,
            Address             = p_Address,
            JoiningDate         = p_JoiningDate,
            Shift               = p_Shift,
            EmploymentType      = p_EmploymentType,
            Supervisor          = p_Supervisor,
            ProfilePhoto        = p_ProfilePhoto,
            IdProof             = p_IdProof,
            PoliceVerification  = p_PoliceVerification,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE FacilityStaffId = p_FacilityStaffId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_FacilityManagement
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE FacilityStaffId = p_FacilityStaffId;

    END IF;

END //

DELIMITER ;
