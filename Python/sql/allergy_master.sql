-- ==============================================================================
-- Allergy Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_AllergyType Lookup Table
CREATE TABLE IF NOT EXISTS Master_AllergyType (
    AllergyTypeId   INT AUTO_INCREMENT PRIMARY KEY,
    TypeName        VARCHAR(100) NOT NULL UNIQUE
);

-- Seed default allergy types
INSERT IGNORE INTO Master_AllergyType (TypeName) VALUES
('Drug'),
('Food'),
('Environmental'),
('Chemical'),
('Latex'),
('Dust'),
('Pollen');

-- 2. Master_Allergy Table
CREATE TABLE IF NOT EXISTS Master_Allergy (
    AllergyId       INT AUTO_INCREMENT PRIMARY KEY,
    AllergyCode     VARCHAR(50) NOT NULL UNIQUE,
    AllergyName     VARCHAR(100) NOT NULL UNIQUE,
    AllergyType     VARCHAR(100) NOT NULL,
    Severity        VARCHAR(20) NOT NULL,
    Description     TEXT,

    Status          VARCHAR(20) DEFAULT 'Active',
    Remarks         TEXT,

    CreatedBy       VARCHAR(100),
    CreatedDate     DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy      VARCHAR(100),
    ModifiedDate    DATETIME,
    IsDeleted       TINYINT(1) DEFAULT 0
);

-- 3. SpMasterAllergy Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterAllergy //

CREATE PROCEDURE SpMasterAllergy (
    IN p_Opt            VARCHAR(20),
    IN p_AllergyId      INT,

    IN p_AllergyCode    VARCHAR(50),
    IN p_AllergyName    VARCHAR(100),
    IN p_AllergyType    VARCHAR(100),
    IN p_Severity       VARCHAR(20),
    IN p_Description    TEXT,

    IN p_Status         VARCHAR(20),
    IN p_Remarks        TEXT,

    IN p_CreatedBy      VARCHAR(100),
    IN p_ModifiedBy     VARCHAR(100),

    IN p_Search         VARCHAR(255)
)
BEGIN
    -- ==================================================================
    -- GET (All active)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT
            AllergyId, AllergyCode, AllergyName, AllergyType, Severity, Description,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Allergy
        WHERE IsDeleted = 0
        ORDER BY AllergyId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            AllergyId, AllergyCode, AllergyName, AllergyType, Severity, Description,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Allergy
        WHERE AllergyId = p_AllergyId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            AllergyId, AllergyCode, AllergyName, AllergyType, Severity, Description,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Allergy
        WHERE IsDeleted = 0
          AND (
            AllergyCode LIKE CONCAT('%', p_Search, '%') OR
            AllergyName LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY AllergyId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_Allergy (
            AllergyCode, AllergyName, AllergyType, Severity, Description,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_AllergyCode, p_AllergyName, p_AllergyType, p_Severity, p_Description,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS AllergyId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Allergy
        SET
            AllergyCode     = p_AllergyCode,
            AllergyName     = p_AllergyName,
            AllergyType     = p_AllergyType,
            Severity        = p_Severity,
            Description     = p_Description,
            Status          = p_Status,
            Remarks         = p_Remarks,
            ModifiedDate    = CURRENT_TIMESTAMP,
            ModifiedBy      = p_ModifiedBy
        WHERE AllergyId = p_AllergyId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Allergy
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE AllergyId = p_AllergyId;

    END IF;

END //

DELIMITER ;
