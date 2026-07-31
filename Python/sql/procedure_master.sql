-- ==============================================================================
-- Procedure Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_Procedure Table
CREATE TABLE IF NOT EXISTS Master_Procedure (
    ProcedureId         INT AUTO_INCREMENT PRIMARY KEY,
    ProcedureCode       VARCHAR(50) NOT NULL UNIQUE,
    ProcedureName       VARCHAR(255) NOT NULL,
    Department          VARCHAR(100) NOT NULL,
    ProcedureType       VARCHAR(100) NOT NULL,
    Description         TEXT,
    DefaultCharge       DECIMAL(10, 2) NOT NULL,
    TaxApplicable       TINYINT(1) DEFAULT 0,
    EstimatedDuration   INT DEFAULT 0,
    RequiresConsent     TINYINT(1) DEFAULT 0,
    RequiresAdmission   TINYINT(1) DEFAULT 0,
    OtRequired          TINYINT(1) DEFAULT 0,
    Status              VARCHAR(20) DEFAULT 'Active',
    Remarks             TEXT,
    
    CreatedBy           VARCHAR(100),
    CreatedDate         DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy          VARCHAR(100),
    ModifiedDate        DATETIME,
    IsDeleted           TINYINT(1) DEFAULT 0
);

-- 2. SpMasterProcedure Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterProcedure //

CREATE PROCEDURE SpMasterProcedure (
    IN p_Opt                VARCHAR(20),
    IN p_ProcedureId        INT,

    IN p_ProcedureCode      VARCHAR(50),
    IN p_ProcedureName      VARCHAR(255),
    IN p_Department         VARCHAR(100),
    IN p_ProcedureType      VARCHAR(100),
    IN p_Description        TEXT,
    IN p_DefaultCharge      DECIMAL(10, 2),
    IN p_TaxApplicable      TINYINT(1),
    IN p_EstimatedDuration  INT,
    IN p_RequiresConsent    TINYINT(1),
    IN p_RequiresAdmission  TINYINT(1),
    IN p_OtRequired         TINYINT(1),
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
            ProcedureId, ProcedureCode, ProcedureName, Department, ProcedureType,
            Description, DefaultCharge, TaxApplicable, EstimatedDuration,
            RequiresConsent, RequiresAdmission, OtRequired, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Procedure
        WHERE IsDeleted = 0
        ORDER BY ProcedureId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ProcedureId, ProcedureCode, ProcedureName, Department, ProcedureType,
            Description, DefaultCharge, TaxApplicable, EstimatedDuration,
            RequiresConsent, RequiresAdmission, OtRequired, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Procedure
        WHERE ProcedureId = p_ProcedureId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            ProcedureId, ProcedureCode, ProcedureName, Department, ProcedureType,
            Description, DefaultCharge, TaxApplicable, EstimatedDuration,
            RequiresConsent, RequiresAdmission, OtRequired, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_Procedure
        WHERE IsDeleted = 0
          AND (
            ProcedureCode LIKE CONCAT('%', p_Search, '%') OR
            ProcedureName LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY ProcedureId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_Procedure (
            ProcedureCode, ProcedureName, Department, ProcedureType, Description,
            DefaultCharge, TaxApplicable, EstimatedDuration, RequiresConsent,
            RequiresAdmission, OtRequired, Status, Remarks,
            CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_ProcedureCode, p_ProcedureName, p_Department, p_ProcedureType, p_Description,
            p_DefaultCharge, p_TaxApplicable, p_EstimatedDuration, p_RequiresConsent,
            p_RequiresAdmission, p_OtRequired, p_Status, p_Remarks,
            p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS ProcedureId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Procedure
        SET
            ProcedureCode       = p_ProcedureCode,
            ProcedureName       = p_ProcedureName,
            Department          = p_Department,
            ProcedureType       = p_ProcedureType,
            Description         = p_Description,
            DefaultCharge       = p_DefaultCharge,
            TaxApplicable       = p_TaxApplicable,
            EstimatedDuration   = p_EstimatedDuration,
            RequiresConsent     = p_RequiresConsent,
            RequiresAdmission   = p_RequiresAdmission,
            OtRequired          = p_OtRequired,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE ProcedureId = p_ProcedureId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Procedure
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE ProcedureId = p_ProcedureId;

    END IF;

END //

DELIMITER ;
