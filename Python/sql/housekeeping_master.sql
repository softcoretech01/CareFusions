-- ==============================================================================
-- Housekeeping Master Schema & Stored Procedure
-- Database : admin
-- Table    : Master_Housekeeping
-- SP       : SpMasterHousekeeping
-- Screen   : /admin/masters/housekeeping
--
-- Housekeeping is a staff master like Nurse, Pharmacist and Receptionist, not
-- a name/code lookup: these are the people IPD assigns bed cleaning to, so the
-- record has to carry a shift, an assigned area and a contact number.
-- ==============================================================================

USE admin;

CREATE TABLE IF NOT EXISTS Master_Housekeeping (
    HousekeepingId      INT AUTO_INCREMENT PRIMARY KEY,
    HousekeepingCode    VARCHAR(20) NOT NULL UNIQUE,       -- Auto-generated: HK-001
    EmployeeCode        VARCHAR(50) NOT NULL,
    StaffName           VARCHAR(100) NOT NULL,
    Gender              ENUM('Male','Female','Other') NULL,
    HospitalName        VARCHAR(150),
    BranchName          VARCHAR(150),
    -- Ward, floor or block this person is responsible for. Free text because
    -- housekeeping zones do not line up with the department master.
    AssignedArea        VARCHAR(150) NOT NULL,
    Mobile              VARCHAR(20) NOT NULL,
    Email               VARCHAR(150),
    Address             VARCHAR(255),
    JoiningDate         DATE,
    Shift               VARCHAR(50) NOT NULL,
    ExperienceYears     INT,
    ReportingManager    VARCHAR(100),

    Photo               VARCHAR(500),
    IdProof             VARCHAR(500),

    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,

    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0,

    KEY IDX_Housekeeping_Name      (StaffName),
    KEY IDX_Housekeeping_Area      (AssignedArea),
    KEY IDX_Housekeeping_Status    (Status),
    KEY IDX_Housekeeping_IsDeleted (IsDeleted)
);


DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterHousekeeping //

CREATE PROCEDURE SpMasterHousekeeping (
    IN p_Opt                VARCHAR(20),
    IN p_HousekeepingId     INT,

    IN p_EmployeeCode       VARCHAR(50),
    IN p_StaffName          VARCHAR(100),
    IN p_Gender             VARCHAR(10),
    IN p_HospitalName       VARCHAR(150),
    IN p_BranchName         VARCHAR(150),
    IN p_AssignedArea       VARCHAR(150),
    IN p_Mobile             VARCHAR(20),
    IN p_Email              VARCHAR(150),
    IN p_Address            VARCHAR(255),
    IN p_JoiningDate        DATE,
    IN p_Shift              VARCHAR(50),
    IN p_ExperienceYears    INT,
    IN p_ReportingManager   VARCHAR(100),

    IN p_Photo              VARCHAR(500),
    IN p_IdProof            VARCHAR(500),

    IN p_Status             VARCHAR(20),
    IN p_Remarks            TEXT,
    IN p_CreatedBy          VARCHAR(100),
    IN p_ModifiedBy         VARCHAR(100),

    IN p_Search             VARCHAR(255)
)
BEGIN
    DECLARE v_HousekeepingCode VARCHAR(20);
    DECLARE v_NextId INT;

    IF p_Opt = 'GET' THEN
        SELECT
            HousekeepingId, HousekeepingCode, EmployeeCode, StaffName, Gender,
            HospitalName, BranchName, AssignedArea, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Housekeeping
        WHERE IsDeleted = 0
        ORDER BY HousekeepingId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            HousekeepingId, HousekeepingCode, EmployeeCode, StaffName, Gender,
            HospitalName, BranchName, AssignedArea, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Housekeeping
        WHERE HousekeepingId = p_HousekeepingId AND IsDeleted = 0;

    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            HousekeepingId, HousekeepingCode, EmployeeCode, StaffName, Gender,
            HospitalName, BranchName, AssignedArea, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Housekeeping
        WHERE IsDeleted = 0
          AND (
            StaffName        LIKE CONCAT('%', p_Search, '%') OR
            HousekeepingCode LIKE CONCAT('%', p_Search, '%') OR
            AssignedArea     LIKE CONCAT('%', p_Search, '%') OR
            Mobile           LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY HousekeepingId DESC;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('HK-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(HousekeepingCode, 4) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS HousekeepingCode
        FROM Master_Housekeeping;

    ELSEIF p_Opt = 'INSERT' THEN
        -- One person, one employee code: a duplicate would split their record
        -- across two rows and make the roster double-count them.
        IF EXISTS (
            SELECT 1 FROM Master_Housekeeping
            WHERE EmployeeCode = p_EmployeeCode AND IsDeleted = 0
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_EMPLOYEE_CODE';
        END IF;
        IF EXISTS (
            SELECT 1 FROM Master_Housekeeping
            WHERE Mobile = p_Mobile AND IsDeleted = 0
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_MOBILE';
        END IF;

        SELECT COALESCE(MAX(CAST(SUBSTRING(HousekeepingCode, 4) AS UNSIGNED)), 0) + 1
          INTO v_NextId
          FROM Master_Housekeeping;
        SET v_HousekeepingCode = CONCAT('HK-', LPAD(v_NextId, 3, '0'));

        INSERT INTO Master_Housekeeping (
            HousekeepingCode, EmployeeCode, StaffName, Gender,
            HospitalName, BranchName, AssignedArea, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            v_HousekeepingCode, p_EmployeeCode, p_StaffName, p_Gender,
            p_HospitalName, p_BranchName, p_AssignedArea, p_Mobile, p_Email, p_Address,
            p_JoiningDate, p_Shift, p_ExperienceYears, p_ReportingManager,
            p_Photo, p_IdProof,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS HousekeepingId, v_HousekeepingCode AS HousekeepingCode;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Housekeeping
            WHERE EmployeeCode = p_EmployeeCode AND IsDeleted = 0
              AND HousekeepingId <> p_HousekeepingId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_EMPLOYEE_CODE';
        END IF;
        IF EXISTS (
            SELECT 1 FROM Master_Housekeeping
            WHERE Mobile = p_Mobile AND IsDeleted = 0
              AND HousekeepingId <> p_HousekeepingId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_MOBILE';
        END IF;

        UPDATE Master_Housekeeping
        SET
            EmployeeCode        = p_EmployeeCode,
            StaffName           = p_StaffName,
            Gender              = p_Gender,
            HospitalName        = p_HospitalName,
            BranchName          = p_BranchName,
            AssignedArea        = p_AssignedArea,
            Mobile              = p_Mobile,
            Email               = p_Email,
            Address             = p_Address,
            JoiningDate         = p_JoiningDate,
            Shift               = p_Shift,
            ExperienceYears     = p_ExperienceYears,
            ReportingManager    = p_ReportingManager,
            Photo               = p_Photo,
            IdProof             = p_IdProof,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE HousekeepingId = p_HousekeepingId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Housekeeping
        SET
            Status       = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE HousekeepingId = p_HousekeepingId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Housekeeping
        SET
            IsDeleted    = 1,
            Status       = 'Inactive',
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE HousekeepingId = p_HousekeepingId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END //

DELIMITER ;
