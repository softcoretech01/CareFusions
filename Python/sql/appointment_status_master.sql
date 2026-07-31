-- ==============================================================================
-- Appointment Status Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_AppointmentStatus Table
CREATE TABLE IF NOT EXISTS Master_AppointmentStatus (
    StatusId            INT AUTO_INCREMENT PRIMARY KEY,
    StatusCode          VARCHAR(50) NOT NULL UNIQUE,
    StatusName          VARCHAR(100) NOT NULL,
    DisplayOrder        INT NOT NULL UNIQUE,
    Description         TEXT,
    
    IsDefault           TINYINT(1) DEFAULT 0,
    IsFinal             TINYINT(1) DEFAULT 0,
    AllowReschedule     TINYINT(1) DEFAULT 0,
    AllowCancellation   TINYINT(1) DEFAULT 0,
    
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,
    
    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterAppointmentStatus Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterAppointmentStatus //

CREATE PROCEDURE SpMasterAppointmentStatus (
    IN p_Opt                VARCHAR(20),
    IN p_StatusId           INT,

    IN p_StatusCode         VARCHAR(50),
    IN p_StatusName         VARCHAR(100),
    IN p_DisplayOrder       INT,
    IN p_Description        TEXT,
    
    IN p_IsDefault          TINYINT(1),
    IN p_IsFinal            TINYINT(1),
    IN p_AllowReschedule    TINYINT(1),
    IN p_AllowCancellation  TINYINT(1),

    IN p_Status             VARCHAR(20),
    IN p_Remarks            TEXT,
    
    IN p_CreatedBy          VARCHAR(100),
    IN p_ModifiedBy         VARCHAR(100),

    IN p_Search             VARCHAR(255)
)
BEGIN
    -- ==================================================================
    -- GET (All active)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT
            StatusId, StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_AppointmentStatus
        WHERE IsDeleted = 0
        ORDER BY DisplayOrder ASC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            StatusId, StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_AppointmentStatus
        WHERE StatusId = p_StatusId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            StatusId, StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_AppointmentStatus
        WHERE IsDeleted = 0
          AND (
            StatusCode LIKE CONCAT('%', p_Search, '%') OR
            StatusName LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY DisplayOrder ASC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_AppointmentStatus (
            StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_StatusCode, p_StatusName, p_DisplayOrder, p_Description,
            p_IsDefault, p_IsFinal, p_AllowReschedule, p_AllowCancellation,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS StatusId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_AppointmentStatus
        SET
            StatusCode          = p_StatusCode,
            StatusName          = p_StatusName,
            DisplayOrder        = p_DisplayOrder,
            Description         = p_Description,
            IsDefault           = p_IsDefault,
            IsFinal             = p_IsFinal,
            AllowReschedule     = p_AllowReschedule,
            AllowCancellation   = p_AllowCancellation,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE StatusId = p_StatusId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_AppointmentStatus
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE StatusId = p_StatusId;

    END IF;

END //

DELIMITER ;
