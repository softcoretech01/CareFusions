-- ==============================================================================
-- Consultation Type Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_ConsultationType Table
CREATE TABLE IF NOT EXISTS Master_ConsultationType (
    ConsultationId      INT AUTO_INCREMENT PRIMARY KEY,
    ConsultationCode    VARCHAR(50) NOT NULL UNIQUE,
    ConsultationType    VARCHAR(100) NOT NULL UNIQUE,
    Description         TEXT,
    Duration            INT NOT NULL DEFAULT 0,
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,
    
    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterConsultationType Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterConsultationType //

CREATE PROCEDURE SpMasterConsultationType (
    IN p_Opt                VARCHAR(20),
    IN p_ConsultationId     INT,

    IN p_ConsultationCode   VARCHAR(50),
    IN p_ConsultationType   VARCHAR(100),
    IN p_Description        TEXT,
    IN p_Duration           INT,
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
            ConsultationId, ConsultationCode, ConsultationType, Description,
            Duration, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_ConsultationType
        WHERE IsDeleted = 0
        ORDER BY ConsultationId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ConsultationId, ConsultationCode, ConsultationType, Description,
            Duration, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_ConsultationType
        WHERE ConsultationId = p_ConsultationId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            ConsultationId, ConsultationCode, ConsultationType, Description,
            Duration, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_ConsultationType
        WHERE IsDeleted = 0
          AND (
            ConsultationCode LIKE CONCAT('%', p_Search, '%') OR
            ConsultationType LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY ConsultationId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_ConsultationType (
            ConsultationCode, ConsultationType, Description, Duration, Status, Remarks,
            CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_ConsultationCode, p_ConsultationType, p_Description, p_Duration, p_Status, p_Remarks,
            p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS ConsultationId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_ConsultationType
        SET
            ConsultationCode    = p_ConsultationCode,
            ConsultationType    = p_ConsultationType,
            Description         = p_Description,
            Duration            = p_Duration,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE ConsultationId = p_ConsultationId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_ConsultationType
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE ConsultationId = p_ConsultationId;

    END IF;

END //

DELIMITER ;
