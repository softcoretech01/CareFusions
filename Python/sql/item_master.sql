-- ============================================================
-- Item Master - SQL Script
-- Database : admin
-- Table    : Master_Item
-- SP       : SpMasterItem
-- Screen   : /admin/masters/item
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Item
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Item (
    ItemId          INT           NOT NULL AUTO_INCREMENT,
    ItemCode        VARCHAR(20)   NOT NULL,               -- Auto-generated: ITM-001
    ItemName        VARCHAR(200)  NOT NULL,
    Category        VARCHAR(100)  NOT NULL,
    SubCategory     VARCHAR(100)  NULL,
    Department      VARCHAR(100)  NULL,
    Brand           VARCHAR(100)  NULL,
    Manufacturer    VARCHAR(150)  NULL,
    Vendor          VARCHAR(150)  NULL,
    Uom             VARCHAR(50)   NOT NULL,

    -- Tax / Statutory
    HsnCode         VARCHAR(20)   NULL,
    GstPercentage   INT           NOT NULL DEFAULT 0,      -- 0 - 100

    -- Stock Control
    ReorderLevel    INT           NULL,
    MinStock        INT           NULL,
    MaxStock        INT           NULL,
    ShelfLife       INT           NULL,                    -- Days
    BatchRequired   TINYINT(1)    NOT NULL DEFAULT 0,
    ExpiryRequired  TINYINT(1)    NOT NULL DEFAULT 0,

    -- Identification
    Barcode         VARCHAR(50)   NULL,
    ItemDescription VARCHAR(500)  NULL,

    -- System Information
    Status          ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy       VARCHAR(100)  NULL,
    CreatedDate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy       VARCHAR(100)  NULL,
    UpdatedDate     DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted       TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Item PRIMARY KEY (ItemId),
    CONSTRAINT UQ_Item_Code   UNIQUE (ItemCode),
    -- NOTE: ItemName / Barcode uniqueness is enforced in the SP for non-deleted
    -- rows only (so a deleted name/barcode can be reused).

    KEY IDX_Item_Name     (ItemName),
    KEY IDX_Item_Category (Category),
    KEY IDX_Item_Barcode  (Barcode),
    KEY IDX_Item_Status   (Status),
    KEY IDX_Item_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterItem
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   duplicate ItemName -> SQLSTATE '45000' MESSAGE_TEXT = 'DUPLICATE_ITEM_NAME'
--   duplicate Barcode  -> SQLSTATE '45000' MESSAGE_TEXT = 'DUPLICATE_BARCODE'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterItem;

DELIMITER $$

CREATE PROCEDURE SpMasterItem(
    IN  p_Opt             VARCHAR(20),
    IN  p_ItemId          INT,
    IN  p_ItemName        VARCHAR(200),
    IN  p_Category        VARCHAR(100),
    IN  p_SubCategory     VARCHAR(100),
    IN  p_Department      VARCHAR(100),
    IN  p_Brand           VARCHAR(100),
    IN  p_Manufacturer    VARCHAR(150),
    IN  p_Vendor          VARCHAR(150),
    IN  p_Uom             VARCHAR(50),
    IN  p_HsnCode         VARCHAR(20),
    IN  p_GstPercentage   INT,
    IN  p_ReorderLevel    INT,
    IN  p_MinStock        INT,
    IN  p_MaxStock        INT,
    IN  p_ShelfLife       INT,
    IN  p_BatchRequired   TINYINT,
    IN  p_ExpiryRequired  TINYINT,
    IN  p_Barcode         VARCHAR(50),
    IN  p_ItemDescription VARCHAR(500),
    IN  p_Status          VARCHAR(20),
    IN  p_CreatedBy       VARCHAR(100),
    IN  p_UpdatedBy       VARCHAR(100),
    IN  p_Search          VARCHAR(255),
    IN  p_CategoryFilter  VARCHAR(100),
    IN  p_StatusFilter    VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            ItemId, ItemCode, ItemName, Category, SubCategory, Department, Brand,
            Manufacturer, Vendor, Uom, HsnCode, GstPercentage, ReorderLevel, MinStock,
            MaxStock, ShelfLife, BatchRequired, ExpiryRequired, Barcode, ItemDescription,
            Status, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Item
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR ItemCode LIKE CONCAT('%', p_Search, '%')
            OR ItemName LIKE CONCAT('%', p_Search, '%')
            OR Barcode  LIKE CONCAT('%', p_Search, '%')
            OR HsnCode  LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_CategoryFilter IS NULL OR p_CategoryFilter = '' OR Category = p_CategoryFilter)
          AND (p_StatusFilter   IS NULL OR p_StatusFilter   = '' OR Status   = p_StatusFilter)
        ORDER BY ItemId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ItemId, ItemCode, ItemName, Category, SubCategory, Department, Brand,
            Manufacturer, Vendor, Uom, HsnCode, GstPercentage, ReorderLevel, MinStock,
            MaxStock, ShelfLife, BatchRequired, ExpiryRequired, Barcode, ItemDescription,
            Status, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Item
        WHERE ItemId = p_ItemId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('ITM-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(ItemCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS ItemCode
        FROM Master_Item;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_Item WHERE ItemName = p_ItemName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ITEM_NAME';
            END IF;
            IF p_Barcode IS NOT NULL AND p_Barcode <> ''
               AND EXISTS (SELECT 1 FROM Master_Item WHERE Barcode = p_Barcode AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_BARCODE';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(ItemCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_Item;

            SET v_Code = CONCAT('ITM-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Item (
                ItemCode, ItemName, Category, SubCategory, Department, Brand, Manufacturer,
                Vendor, Uom, HsnCode, GstPercentage, ReorderLevel, MinStock, MaxStock,
                ShelfLife, BatchRequired, ExpiryRequired, Barcode, ItemDescription, Status, CreatedBy
            ) VALUES (
                v_Code, p_ItemName, p_Category, p_SubCategory, p_Department, p_Brand, p_Manufacturer,
                p_Vendor, p_Uom, p_HsnCode, p_GstPercentage, p_ReorderLevel, p_MinStock, p_MaxStock,
                p_ShelfLife, p_BatchRequired, p_ExpiryRequired, p_Barcode, p_ItemDescription, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS ItemId, v_Code AS ItemCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Item WHERE ItemName = p_ItemName AND IsDeleted = 0 AND ItemId <> p_ItemId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ITEM_NAME';
        END IF;
        IF p_Barcode IS NOT NULL AND p_Barcode <> ''
           AND EXISTS (SELECT 1 FROM Master_Item WHERE Barcode = p_Barcode AND IsDeleted = 0 AND ItemId <> p_ItemId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_BARCODE';
        END IF;

        UPDATE Master_Item
        SET
            ItemName        = p_ItemName,
            Category        = p_Category,
            SubCategory     = p_SubCategory,
            Department      = p_Department,
            Brand           = p_Brand,
            Manufacturer    = p_Manufacturer,
            Vendor          = p_Vendor,
            Uom             = p_Uom,
            HsnCode         = p_HsnCode,
            GstPercentage   = p_GstPercentage,
            ReorderLevel    = p_ReorderLevel,
            MinStock        = p_MinStock,
            MaxStock        = p_MaxStock,
            ShelfLife       = p_ShelfLife,
            BatchRequired   = p_BatchRequired,
            ExpiryRequired  = p_ExpiryRequired,
            Barcode         = p_Barcode,
            ItemDescription = p_ItemDescription,
            Status          = p_Status,
            UpdatedBy       = p_UpdatedBy,
            UpdatedDate     = CURRENT_TIMESTAMP
        WHERE ItemId = p_ItemId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Item
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ItemId = p_ItemId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Item
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ItemId = p_ItemId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
