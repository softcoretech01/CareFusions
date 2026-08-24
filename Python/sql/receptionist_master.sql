-- ==============================================================================
-- Receptionist Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_Receptionist Table
CREATE TABLE IF NOT EXISTS Master_Receptionist (
    ReceptionistId      INT AUTO_INCREMENT PRIMARY KEY,
    ReceptionistCode    VARCHAR(20) NOT NULL UNIQUE,
    ReceptionistName    VARCHAR(100) NOT NULL,
    HospitalName        VARCHAR(150),
    BranchName          VARCHAR(150),
    ReceptionCounter    VARCHAR(100) NOT NULL,
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
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterReceptionist Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterReceptionist //

CREATE PROCEDURE SpMasterReceptionist (
    IN p_Opt                VARCHAR(20),
    IN p_ReceptionistId     INT,

    IN p_ReceptionistName   VARCHAR(100),
    IN p_HospitalName       VARCHAR(150),
    IN p_BranchName         VARCHAR(150),
    IN p_ReceptionCounter   VARCHAR(100),
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
    DECLARE v_ReceptionistCode VARCHAR(20);
    DECLARE v_NextId INT;

    -- ==================================================================
    -- GET (All)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT
            ReceptionistId, ReceptionistCode, ReceptionistName,
            HospitalName, BranchName, ReceptionCounter, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Receptionist
        WHERE IsDeleted = 0
        ORDER BY ReceptionistId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ReceptionistId, ReceptionistCode, ReceptionistName,
            HospitalName, BranchName, ReceptionCounter, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Receptionist
        WHERE ReceptionistId = p_ReceptionistId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            ReceptionistId, ReceptionistCode, ReceptionistName,
            HospitalName, BranchName, ReceptionCounter, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Receptionist
        WHERE IsDeleted = 0
          AND (
            ReceptionistName LIKE CONCAT('%', p_Search, '%') OR
            ReceptionistCode LIKE CONCAT('%', p_Search, '%') OR
            Mobile           LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY ReceptionistId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        SELECT IFNULL(MAX(ReceptionistId), 0) + 1 INTO v_NextId FROM Master_Receptionist;
        SET v_ReceptionistCode = CONCAT('REC-', LPAD(v_NextId, 3, '0'));

        INSERT INTO Master_Receptionist (
            ReceptionistCode, ReceptionistName,
            HospitalName, BranchName, ReceptionCounter, Mobile, Email, Address,
            JoiningDate, Shift, ExperienceYears, ReportingManager,
            Photo, IdProof,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            v_ReceptionistCode, p_ReceptionistName,
            p_HospitalName, p_BranchName, p_ReceptionCounter, p_Mobile, p_Email, p_Address,
            p_JoiningDate, p_Shift, p_ExperienceYears, p_ReportingManager,
            p_Photo, p_IdProof,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS ReceptionistId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Receptionist
        SET
            ReceptionistName    = p_ReceptionistName,
            HospitalName        = p_HospitalName,
            BranchName          = p_BranchName,
            ReceptionCounter    = p_ReceptionCounter,
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
        WHERE ReceptionistId = p_ReceptionistId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Receptionist
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE ReceptionistId = p_ReceptionistId;

    END IF;

END //

DELIMITER ;
