-- ==============================================================================
-- Diagnosis Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_Diagnosis Table
CREATE TABLE IF NOT EXISTS Master_Diagnosis (
    DiagnosisId         INT AUTO_INCREMENT PRIMARY KEY,
    DiagnosisCode       VARCHAR(50) NOT NULL UNIQUE,
    DiagnosisName       VARCHAR(255) NOT NULL,
    IcdVersion          VARCHAR(20) NOT NULL,
    Category            VARCHAR(100) NOT NULL,
    Description         TEXT,
    ChronicDisease      TINYINT(1) DEFAULT 0,
    NotifiableDisease   TINYINT(1) DEFAULT 0,
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,
    
    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterDiagnosis Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterDiagnosis //

CREATE PROCEDURE SpMasterDiagnosis (
    IN p_Opt                VARCHAR(20),
    IN p_DiagnosisId        INT,

    IN p_DiagnosisCode      VARCHAR(50),
    IN p_DiagnosisName      VARCHAR(255),
    IN p_IcdVersion         VARCHAR(20),
    IN p_Category           VARCHAR(100),
    IN p_Description        TEXT,
    IN p_ChronicDisease     TINYINT(1),
    IN p_NotifiableDisease  TINYINT(1),
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
            DiagnosisId, DiagnosisCode, DiagnosisName, IcdVersion, Category,
            Description, ChronicDisease, NotifiableDisease, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Diagnosis
        WHERE IsDeleted = 0
        ORDER BY DiagnosisId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            DiagnosisId, DiagnosisCode, DiagnosisName, IcdVersion, Category,
            Description, ChronicDisease, NotifiableDisease, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Diagnosis
        WHERE DiagnosisId = p_DiagnosisId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            DiagnosisId, DiagnosisCode, DiagnosisName, IcdVersion, Category,
            Description, ChronicDisease, NotifiableDisease, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Diagnosis
        WHERE IsDeleted = 0
          AND (
            DiagnosisCode LIKE CONCAT('%', p_Search, '%') OR
            DiagnosisName LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY DiagnosisId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_Diagnosis (
            DiagnosisCode, DiagnosisName, IcdVersion, Category, Description,
            ChronicDisease, NotifiableDisease, Status, Remarks,
            CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_DiagnosisCode, p_DiagnosisName, p_IcdVersion, p_Category, p_Description,
            p_ChronicDisease, p_NotifiableDisease, p_Status, p_Remarks,
            p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS DiagnosisId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Diagnosis
        SET
            DiagnosisCode       = p_DiagnosisCode,
            DiagnosisName       = p_DiagnosisName,
            IcdVersion          = p_IcdVersion,
            Category            = p_Category,
            Description         = p_Description,
            ChronicDisease      = p_ChronicDisease,
            NotifiableDisease   = p_NotifiableDisease,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE DiagnosisId = p_DiagnosisId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Diagnosis
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE DiagnosisId = p_DiagnosisId;

    END IF;

END //

DELIMITER ;
