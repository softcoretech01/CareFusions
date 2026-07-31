-- ==============================================================================
-- Sample Type Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Alter existing Master_SampleType Table
-- Adding new columns (The table was created with SampleTypeId and SampleTypeName previously)

ALTER TABLE Master_SampleType
ADD COLUMN SampleCode VARCHAR(50) UNIQUE AFTER SampleTypeId,
ADD COLUMN Description VARCHAR(500) AFTER SampleTypeName,
ADD COLUMN CollectionMethod VARCHAR(100) AFTER Description,
ADD COLUMN StorageTemperature VARCHAR(50) AFTER CollectionMethod,
ADD COLUMN MaxStorageTime VARCHAR(50) AFTER StorageTemperature,
ADD COLUMN Status VARCHAR(20) DEFAULT 'Active',
ADD COLUMN Remarks TEXT,
ADD COLUMN CreatedBy VARCHAR(100),
ADD COLUMN CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN ModifiedBy VARCHAR(100),
ADD COLUMN ModifiedDate DATETIME,
ADD COLUMN IsDeleted TINYINT(1) DEFAULT 0;

-- 2. Backfill existing seed data with SampleCode (SMP-001, SMP-002, etc.)
UPDATE Master_SampleType
SET SampleCode = CONCAT('SMP-', LPAD(SampleTypeId, 3, '0'))
WHERE SampleCode IS NULL;

-- 3. SpMasterSampleType Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterSampleType //

CREATE PROCEDURE SpMasterSampleType (
    IN p_Opt                VARCHAR(20),
    IN p_SampleTypeId       INT,

    IN p_SampleCode         VARCHAR(50),
    IN p_SampleTypeName     VARCHAR(100),
    IN p_Description        VARCHAR(500),
    IN p_CollectionMethod   VARCHAR(100),
    IN p_StorageTemperature VARCHAR(50),
    IN p_MaxStorageTime     VARCHAR(50),
    
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
            SampleTypeId, SampleCode, SampleTypeName, Description,
            CollectionMethod, StorageTemperature, MaxStorageTime,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_SampleType
        WHERE IsDeleted = 0
        ORDER BY SampleTypeId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            SampleTypeId, SampleCode, SampleTypeName, Description,
            CollectionMethod, StorageTemperature, MaxStorageTime,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_SampleType
        WHERE SampleTypeId = p_SampleTypeId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            SampleTypeId, SampleCode, SampleTypeName, Description,
            CollectionMethod, StorageTemperature, MaxStorageTime,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_SampleType
        WHERE IsDeleted = 0
          AND (
            SampleCode      LIKE CONCAT('%', p_Search, '%') OR
            SampleTypeName  LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY SampleTypeId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_SampleType (
            SampleCode, SampleTypeName, Description,
            CollectionMethod, StorageTemperature, MaxStorageTime,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_SampleCode, p_SampleTypeName, p_Description,
            p_CollectionMethod, p_StorageTemperature, p_MaxStorageTime,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS SampleTypeId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_SampleType
        SET
            SampleCode          = p_SampleCode,
            SampleTypeName      = p_SampleTypeName,
            Description         = p_Description,
            CollectionMethod    = p_CollectionMethod,
            StorageTemperature  = p_StorageTemperature,
            MaxStorageTime      = p_MaxStorageTime,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE SampleTypeId = p_SampleTypeId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_SampleType
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE SampleTypeId = p_SampleTypeId;

    END IF;

END //

DELIMITER ;
