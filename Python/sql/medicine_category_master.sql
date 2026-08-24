-- ==============================================================================
-- Medicine Category Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Alter existing Master_MedicineCategory Table
-- Adding new columns. (Using IF NOT EXISTS logic via a quick workaround isn't standard in MySQL ALTER, 
-- but we know these columns don't exist yet because we just created the table with 2 columns).

-- Idempotent. A bare `ALTER TABLE ... ADD COLUMN` succeeds once and then fails
-- with "Duplicate column name" on every later `python init_db.py`, aborting the
-- deployment. Same conditional-procedure pattern as lab.sql / sample_type_master.sql.
DROP PROCEDURE IF EXISTS SpTmpUpgradeMedicineCategory;
DELIMITER $$
CREATE PROCEDURE SpTmpUpgradeMedicineCategory()
BEGIN
    DECLARE v_schema VARCHAR(64);
    SET v_schema = DATABASE();

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'CategoryCode') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN CategoryCode VARCHAR(50) AFTER CategoryId;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'Description') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN Description VARCHAR(500) AFTER CategoryName;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'Status') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN Status VARCHAR(20) DEFAULT 'Active';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'Remarks') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN Remarks TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'CreatedBy') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN CreatedBy VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'CreatedDate') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'ModifiedBy') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN ModifiedBy VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'ModifiedDate') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN ModifiedDate DATETIME;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND COLUMN_NAME = 'IsDeleted') THEN
        ALTER TABLE Master_MedicineCategory ADD COLUMN IsDeleted TINYINT(1) DEFAULT 0;
    END IF;

    -- CategoryCode was declared UNIQUE inline. Added explicitly here because the
    -- inline constraint is skipped whenever the column already exists — the same
    -- "declared but never applied" drift seen on Master_Medicine / Master_LabTest.
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_MedicineCategory'
                     AND INDEX_NAME = 'UQ_Master_MedicineCategory_Code') THEN
        UPDATE Master_MedicineCategory
           SET CategoryCode = CONCAT('CAT-', LPAD(CategoryId, 3, '0'))
         WHERE CategoryCode IS NULL OR CategoryCode = '';
        ALTER TABLE Master_MedicineCategory
            ADD CONSTRAINT UQ_Master_MedicineCategory_Code UNIQUE (CategoryCode);
    END IF;
END$$
DELIMITER ;
CALL SpTmpUpgradeMedicineCategory();
DROP PROCEDURE IF EXISTS SpTmpUpgradeMedicineCategory;

-- 2. Backfill existing seed data with CategoryCode (CAT-001, CAT-002, etc.)
UPDATE Master_MedicineCategory
SET CategoryCode = CONCAT('CAT-', LPAD(CategoryId, 3, '0'))
WHERE CategoryCode IS NULL;

-- 3. SpMasterMedicineCategory Stored Procedure
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterMedicineCategory //

CREATE PROCEDURE SpMasterMedicineCategory (
    IN p_Opt                VARCHAR(20),
    IN p_CategoryId         INT,

    IN p_CategoryCode       VARCHAR(50),
    IN p_CategoryName       VARCHAR(100),
    IN p_Description        VARCHAR(500),
    
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
            CategoryId, CategoryCode, CategoryName, Description,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_MedicineCategory
        WHERE IsDeleted = 0
        ORDER BY CategoryId DESC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            CategoryId, CategoryCode, CategoryName, Description,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_MedicineCategory
        WHERE CategoryId = p_CategoryId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            CategoryId, CategoryCode, CategoryName, Description,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_MedicineCategory
        WHERE IsDeleted = 0
          AND (
            CategoryCode  LIKE CONCAT('%', p_Search, '%') OR
            CategoryName  LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY CategoryId DESC;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_MedicineCategory (
            CategoryCode, CategoryName, Description,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_CategoryCode, p_CategoryName, p_Description,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS CategoryId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_MedicineCategory
        SET
            CategoryCode    = p_CategoryCode,
            CategoryName    = p_CategoryName,
            Description     = p_Description,
            Status          = p_Status,
            Remarks         = p_Remarks,
            ModifiedDate    = CURRENT_TIMESTAMP,
            ModifiedBy      = p_ModifiedBy
        WHERE CategoryId = p_CategoryId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_MedicineCategory
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE CategoryId = p_CategoryId;

    END IF;

END //

DELIMITER ;
