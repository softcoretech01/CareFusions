-- ============================================================
-- Sub-Category Master - SQL Script
-- Database : admin
-- Table    : Master_SubCategory
-- SP       : SpMasterSubCategory
-- Screen   : /admin/masters/sub-category
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_SubCategory
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_SubCategory (
    SubCategoryId   INT           NOT NULL AUTO_INCREMENT,
    SubCategoryCode VARCHAR(20)   NOT NULL,               -- Auto-generated: SUB-001
    Category        VARCHAR(100)  NOT NULL,               -- Parent category name
    SubCategoryName VARCHAR(100)  NOT NULL,
    Description     VARCHAR(500)  NULL,
    Status          ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy       VARCHAR(100)  NULL,
    CreatedDate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy       VARCHAR(100)  NULL,
    UpdatedDate     DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted       TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_SubCategory PRIMARY KEY (SubCategoryId),
    CONSTRAINT UQ_SubCategory_Code   UNIQUE (SubCategoryCode),
    -- NOTE: (Category + SubCategoryName) uniqueness is enforced in the SP for
    -- non-deleted rows only (same sub-name can exist under different categories).

    KEY IDX_SubCategory_Category (Category),
    KEY IDX_SubCategory_Name     (SubCategoryName),
    KEY IDX_SubCategory_Status   (Status),
    KEY IDX_SubCategory_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterSubCategory
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: (Category, SubCategoryName) must be unique among NON-DELETED rows.
-- Violations raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_SUBCATEGORY'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterSubCategory;

DELIMITER $$

CREATE PROCEDURE SpMasterSubCategory(
    IN  p_Opt             VARCHAR(20),
    IN  p_SubCategoryId   INT,
    IN  p_Category        VARCHAR(100),
    IN  p_SubCategoryName VARCHAR(100),
    IN  p_Description     VARCHAR(500),
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
            SubCategoryId, SubCategoryCode, Category, SubCategoryName, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_SubCategory
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR SubCategoryCode LIKE CONCAT('%', p_Search, '%')
            OR Category        LIKE CONCAT('%', p_Search, '%')
            OR SubCategoryName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_CategoryFilter IS NULL OR p_CategoryFilter = '' OR Category = p_CategoryFilter)
          AND (p_StatusFilter   IS NULL OR p_StatusFilter   = '' OR Status   = p_StatusFilter)
        ORDER BY SubCategoryId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            SubCategoryId, SubCategoryCode, Category, SubCategoryName, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_SubCategory
        WHERE SubCategoryId = p_SubCategoryId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('SUB-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(SubCategoryCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS SubCategoryCode
        FROM Master_SubCategory;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_SubCategory
                WHERE Category = p_Category
                  AND SubCategoryName = p_SubCategoryName
                  AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SUBCATEGORY';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(SubCategoryCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_SubCategory;

            SET v_Code = CONCAT('SUB-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_SubCategory (
                SubCategoryCode, Category, SubCategoryName, Description, Status, CreatedBy
            ) VALUES (
                v_Code, p_Category, p_SubCategoryName, p_Description, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS SubCategoryId, v_Code AS SubCategoryCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_SubCategory
            WHERE Category = p_Category
              AND SubCategoryName = p_SubCategoryName
              AND IsDeleted = 0
              AND SubCategoryId <> p_SubCategoryId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SUBCATEGORY';
        END IF;

        UPDATE Master_SubCategory
        SET
            Category        = p_Category,
            SubCategoryName = p_SubCategoryName,
            Description     = p_Description,
            Status          = p_Status,
            UpdatedBy       = p_UpdatedBy,
            UpdatedDate     = CURRENT_TIMESTAMP
        WHERE SubCategoryId = p_SubCategoryId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_SubCategory
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SubCategoryId = p_SubCategoryId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_SubCategory
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SubCategoryId = p_SubCategoryId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
