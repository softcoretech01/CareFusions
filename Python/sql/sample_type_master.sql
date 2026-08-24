-- ==============================================================================
-- Sample Type Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Alter existing Master_SampleType Table
-- Adding new columns (The table was created with SampleTypeId and SampleTypeName previously)

-- Idempotent: a bare `ALTER TABLE ... ADD COLUMN` runs once and then fails with
-- "Duplicate column name" on every subsequent `python init_db.py`, which aborted
-- the whole deployment part-way through. Each column is added only if missing,
-- using the same conditional-procedure pattern as lab.sql.
DROP PROCEDURE IF EXISTS SpTmpUpgradeSampleType;
DELIMITER $$
CREATE PROCEDURE SpTmpUpgradeSampleType()
BEGIN
    DECLARE v_schema VARCHAR(64);
    SET v_schema = DATABASE();

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'SampleCode') THEN
        ALTER TABLE Master_SampleType ADD COLUMN SampleCode VARCHAR(50) AFTER SampleTypeId;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'Description') THEN
        ALTER TABLE Master_SampleType ADD COLUMN Description VARCHAR(500) AFTER SampleTypeName;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'CollectionMethod') THEN
        ALTER TABLE Master_SampleType ADD COLUMN CollectionMethod VARCHAR(100) AFTER Description;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'StorageTemperature') THEN
        ALTER TABLE Master_SampleType ADD COLUMN StorageTemperature VARCHAR(50) AFTER CollectionMethod;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'MaxStorageTime') THEN
        ALTER TABLE Master_SampleType ADD COLUMN MaxStorageTime VARCHAR(50) AFTER StorageTemperature;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'Status') THEN
        ALTER TABLE Master_SampleType ADD COLUMN Status VARCHAR(20) DEFAULT 'Active';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'Remarks') THEN
        ALTER TABLE Master_SampleType ADD COLUMN Remarks TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'CreatedBy') THEN
        ALTER TABLE Master_SampleType ADD COLUMN CreatedBy VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'CreatedDate') THEN
        ALTER TABLE Master_SampleType ADD COLUMN CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'ModifiedBy') THEN
        ALTER TABLE Master_SampleType ADD COLUMN ModifiedBy VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'ModifiedDate') THEN
        ALTER TABLE Master_SampleType ADD COLUMN ModifiedDate DATETIME;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND COLUMN_NAME = 'IsDeleted') THEN
        ALTER TABLE Master_SampleType ADD COLUMN IsDeleted TINYINT(1) DEFAULT 0;
    END IF;

    -- SampleCode was declared UNIQUE inline above. Inline UNIQUE on ADD COLUMN
    -- is skipped when the column already exists, and this master hit the same
    -- "declared but never applied" drift as Master_Medicine / Master_LabTest,
    -- so the index is added explicitly and only when missing.
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_SampleType'
                     AND INDEX_NAME = 'UQ_Master_SampleType_Code') THEN
        -- Backfill first: a UNIQUE index over multiple NULLs is fine in MySQL,
        -- but duplicates from earlier partial runs are not.
        UPDATE Master_SampleType
           SET SampleCode = CONCAT('SMP-', LPAD(SampleTypeId, 3, '0'))
         WHERE SampleCode IS NULL OR SampleCode = '';
        ALTER TABLE Master_SampleType
            ADD CONSTRAINT UQ_Master_SampleType_Code UNIQUE (SampleCode);
    END IF;
END$$
DELIMITER ;
CALL SpTmpUpgradeSampleType();
DROP PROCEDURE IF EXISTS SpTmpUpgradeSampleType;

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
