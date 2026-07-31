-- ============================================================
-- Store / Warehouse Master - SQL Script
-- Database : admin
-- Table    : Master_Store
-- SP       : SpMasterStore
-- Screen   : /admin/masters/warehouse
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Store
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Store (
    StoreId       INT           NOT NULL AUTO_INCREMENT,
    StoreCode     VARCHAR(20)   NOT NULL,               -- Auto-generated: STR-001
    StoreName     VARCHAR(150)  NOT NULL,
    StoreType     ENUM('Main Store','Sub Store','Pharmacy Store','OT Store','Lab Store') NOT NULL,
    Location      VARCHAR(255)  NULL,
    InCharge      VARCHAR(100)  NULL,
    ContactNumber VARCHAR(20)   NULL,
    Status        ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy     VARCHAR(100)  NULL,
    CreatedDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy     VARCHAR(100)  NULL,
    UpdatedDate   DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted     TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Store PRIMARY KEY (StoreId),
    CONSTRAINT UQ_Store_Code   UNIQUE (StoreCode),
    -- NOTE: StoreName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Store_Name     (StoreName),
    KEY IDX_Store_Type     (StoreType),
    KEY IDX_Store_Status   (Status),
    KEY IDX_Store_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterStore
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: StoreName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_STORE_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterStore;

DELIMITER $$

CREATE PROCEDURE SpMasterStore(
    IN  p_Opt           VARCHAR(20),
    IN  p_StoreId       INT,
    IN  p_StoreName     VARCHAR(150),
    IN  p_StoreType     VARCHAR(20),
    IN  p_Location      VARCHAR(255),
    IN  p_InCharge      VARCHAR(100),
    IN  p_ContactNumber VARCHAR(20),
    IN  p_Status        VARCHAR(20),
    IN  p_CreatedBy     VARCHAR(100),
    IN  p_UpdatedBy     VARCHAR(100),
    IN  p_Search        VARCHAR(255),
    IN  p_TypeFilter    VARCHAR(20),
    IN  p_StatusFilter  VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            StoreId, StoreCode, StoreName, StoreType, Location, InCharge, ContactNumber, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Store
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR StoreCode LIKE CONCAT('%', p_Search, '%')
            OR StoreName LIKE CONCAT('%', p_Search, '%')
            OR Location  LIKE CONCAT('%', p_Search, '%')
            OR InCharge  LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_TypeFilter   IS NULL OR p_TypeFilter   = '' OR StoreType = p_TypeFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status    = p_StatusFilter)
        ORDER BY StoreId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            StoreId, StoreCode, StoreName, StoreType, Location, InCharge, ContactNumber, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Store
        WHERE StoreId = p_StoreId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('STR-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(StoreCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS StoreCode
        FROM Master_Store;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_Store WHERE StoreName = p_StoreName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_STORE_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(StoreCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_Store;

            SET v_Code = CONCAT('STR-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Store (
                StoreCode, StoreName, StoreType, Location, InCharge, ContactNumber, Status, CreatedBy
            ) VALUES (
                v_Code, p_StoreName, p_StoreType, p_Location, p_InCharge, p_ContactNumber, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS StoreId, v_Code AS StoreCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Store WHERE StoreName = p_StoreName AND IsDeleted = 0 AND StoreId <> p_StoreId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_STORE_NAME';
        END IF;

        UPDATE Master_Store
        SET
            StoreName     = p_StoreName,
            StoreType     = p_StoreType,
            Location      = p_Location,
            InCharge      = p_InCharge,
            ContactNumber = p_ContactNumber,
            Status        = p_Status,
            UpdatedBy     = p_UpdatedBy,
            UpdatedDate   = CURRENT_TIMESTAMP
        WHERE StoreId = p_StoreId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Store
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE StoreId = p_StoreId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Store
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE StoreId = p_StoreId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
