-- ============================================================
-- Category Master - SQL Script
-- Database : admin
-- Table    : Master_Category
-- SP       : SpMasterCategory
-- Screen   : /admin/masters/category
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Category
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Category (
    CategoryId   INT           NOT NULL AUTO_INCREMENT,
    CategoryCode VARCHAR(20)   NOT NULL,               -- Auto-generated: CAT-001
    CategoryName VARCHAR(100)  NOT NULL,
    -- Splits consumable/medical stock from assets and services, which is what
    -- decides whether an item is stocked at all.
    InventoryType   VARCHAR(50) NULL,
    Description  VARCHAR(500)  NULL,

    -- Handling rules inherited by every item filed under this category.
    StockRequired   TINYINT(1)  NOT NULL DEFAULT 1,
    BatchTracking   TINYINT(1)  NOT NULL DEFAULT 0,
    ExpiryTracking  TINYINT(1)  NOT NULL DEFAULT 0,
    BarcodeRequired TINYINT(1)  NOT NULL DEFAULT 0,

    Remarks      VARCHAR(500)  NULL,
    Status       ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy    VARCHAR(100)  NULL,
    CreatedDate  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy    VARCHAR(100)  NULL,
    UpdatedDate  DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted    TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Category PRIMARY KEY (CategoryId),
    CONSTRAINT UQ_Category_Code   UNIQUE (CategoryCode),
    -- NOTE: CategoryName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Category_Name     (CategoryName),
    KEY IDX_Category_Status   (Status),
    KEY IDX_Category_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterCategory
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: CategoryName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_CATEGORY_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterCategory;

DELIMITER $$

CREATE PROCEDURE SpMasterCategory(
    IN  p_Opt          VARCHAR(20),
    IN  p_CategoryId   INT,
    IN  p_CategoryName VARCHAR(100),
    IN  p_InventoryType   VARCHAR(50),
    IN  p_Description   VARCHAR(500),
    IN  p_StockRequired   TINYINT,
    IN  p_BatchTracking   TINYINT,
    IN  p_ExpiryTracking  TINYINT,
    IN  p_BarcodeRequired TINYINT,
    IN  p_Remarks      VARCHAR(500),
    IN  p_Status       VARCHAR(20),
    IN  p_CreatedBy    VARCHAR(100),
    IN  p_UpdatedBy    VARCHAR(100),
    IN  p_Search       VARCHAR(255),
    IN  p_StatusFilter VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            CategoryId, CategoryCode, CategoryName, InventoryType, Description,
            StockRequired, BatchTracking, ExpiryTracking, BarcodeRequired,
            Remarks, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Category
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR CategoryCode LIKE CONCAT('%', p_Search, '%')
            OR CategoryName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY CategoryId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            CategoryId, CategoryCode, CategoryName, InventoryType, Description,
            StockRequired, BatchTracking, ExpiryTracking, BarcodeRequired,
            Remarks, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Category
        WHERE CategoryId = p_CategoryId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('CAT-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(CategoryCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS CategoryCode
        FROM Master_Category;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_Category
                WHERE CategoryName = p_CategoryName AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_CATEGORY_NAME';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(CategoryCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_Category;

            SET v_Code = CONCAT('CAT-', LPAD(v_NextNum, 3, '0'));

            -- Expiry cannot be tracked without a batch to hang it on, and
            -- neither is meaningful for a category that is not stocked.
            IF p_ExpiryTracking = 1 AND p_BatchTracking = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'EXPIRY_NEEDS_BATCH';
            END IF;
            IF p_StockRequired = 0 AND (p_BatchTracking = 1 OR p_ExpiryTracking = 1) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRACKING_NEEDS_STOCK';
            END IF;

            INSERT INTO Master_Category (
                CategoryCode, CategoryName, InventoryType, Description,
                StockRequired, BatchTracking, ExpiryTracking, BarcodeRequired,
                Remarks, Status, CreatedBy
            ) VALUES (
                v_Code, p_CategoryName, p_InventoryType, p_Description,
                COALESCE(p_StockRequired, 1), COALESCE(p_BatchTracking, 0),
                COALESCE(p_ExpiryTracking, 0), COALESCE(p_BarcodeRequired, 0),
                p_Remarks, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS CategoryId, v_Code AS CategoryCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Category
            WHERE CategoryName = p_CategoryName
              AND IsDeleted = 0
              AND CategoryId <> p_CategoryId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_CATEGORY_NAME';
        END IF;

        IF p_ExpiryTracking = 1 AND p_BatchTracking = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'EXPIRY_NEEDS_BATCH';
        END IF;
        IF p_StockRequired = 0 AND (p_BatchTracking = 1 OR p_ExpiryTracking = 1) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRACKING_NEEDS_STOCK';
        END IF;

        UPDATE Master_Category
        SET
            CategoryName    = p_CategoryName,
            InventoryType   = p_InventoryType,
            Description     = p_Description,
            StockRequired   = COALESCE(p_StockRequired, 1),
            BatchTracking   = COALESCE(p_BatchTracking, 0),
            ExpiryTracking  = COALESCE(p_ExpiryTracking, 0),
            BarcodeRequired = COALESCE(p_BarcodeRequired, 0),
            Remarks         = p_Remarks,
            Status          = p_Status,
            UpdatedBy       = p_UpdatedBy,
            UpdatedDate     = CURRENT_TIMESTAMP
        WHERE CategoryId = p_CategoryId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Category
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CategoryId = p_CategoryId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Category
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CategoryId = p_CategoryId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
