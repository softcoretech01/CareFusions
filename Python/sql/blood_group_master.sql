-- ==============================================================================
-- Blood Group Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_BloodGroup Table
CREATE TABLE IF NOT EXISTS Master_BloodGroup (
    BloodGroupId        INT AUTO_INCREMENT PRIMARY KEY,
    BloodGroup          VARCHAR(20) NOT NULL UNIQUE,
    RhFactor            VARCHAR(20) NOT NULL,
    Description         VARCHAR(255),
    Status              VARCHAR(20) DEFAULT 'Active',
    
    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterBloodGroup Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterBloodGroup //

CREATE PROCEDURE SpMasterBloodGroup (
    IN p_Opt                VARCHAR(20),
    IN p_BloodGroupId       INT,

    IN p_BloodGroup         VARCHAR(20),
    IN p_RhFactor           VARCHAR(20),
    IN p_Description        VARCHAR(255),
    IN p_Status             VARCHAR(20),
    
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
            BloodGroupId, BloodGroup, RhFactor, Description, Status,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_BloodGroup
        WHERE IsDeleted = 0
        ORDER BY BloodGroupId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            BloodGroupId, BloodGroup, RhFactor, Description, Status,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_BloodGroup
        WHERE BloodGroupId = p_BloodGroupId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            BloodGroupId, BloodGroup, RhFactor, Description, Status,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_BloodGroup
        WHERE IsDeleted = 0
          AND (
            BloodGroup LIKE CONCAT('%', p_Search, '%') OR
            Description LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY BloodGroupId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_BloodGroup (
            BloodGroup, RhFactor, Description, Status,
            CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_BloodGroup, p_RhFactor, p_Description, p_Status,
            p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS BloodGroupId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_BloodGroup
        SET
            BloodGroup      = p_BloodGroup,
            RhFactor        = p_RhFactor,
            Description     = p_Description,
            Status          = p_Status,
            ModifiedDate    = CURRENT_TIMESTAMP,
            ModifiedBy      = p_ModifiedBy
        WHERE BloodGroupId = p_BloodGroupId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_BloodGroup
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE BloodGroupId = p_BloodGroupId;

    END IF;

END //

DELIMITER ;
