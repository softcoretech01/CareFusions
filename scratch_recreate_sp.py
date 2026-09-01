import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(r'd:\project\CareFusions\Python\.env')
user = os.environ.get('DB_USER')
password = os.environ.get('DB_PASSWORD')
host = os.environ.get('DB_HOST')
port = os.environ.get('DB_PORT')
dbname = os.environ.get('DB_NAME')

url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"
engine = create_engine(url)

sp_subcategory = """
CREATE PROCEDURE `SpMasterSubCategory`(
    IN p_Opt                VARCHAR(20),
    IN p_SubCategoryId      INT,
    IN p_CategoryId         INT,
    IN p_SubCategoryName    VARCHAR(100),
    IN p_Description        VARCHAR(500),
    IN p_Status             VARCHAR(20),
    IN p_CreatedBy          VARCHAR(100),
    IN p_UpdatedBy          VARCHAR(100),
    IN p_Search             VARCHAR(255),
    IN p_CategoryFilter     INT,
    IN p_StatusFilter       VARCHAR(20)
)
BEGIN
    IF p_Opt = 'GET' THEN
        SELECT 
            s.SubCategoryId, s.SubCategoryCode, s.CategoryId, c.CategoryName AS Category, 
            s.SubCategoryName, s.Description, s.Status,
            s.CreatedBy, s.CreatedDate, s.UpdatedBy, s.UpdatedDate
        FROM Master_SubCategory s
        LEFT JOIN Master_Category c ON s.CategoryId = c.CategoryId
        WHERE s.IsDeleted = 0
          AND (p_CategoryFilter = 0 OR s.CategoryId = p_CategoryFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR s.Status = p_StatusFilter)
        ORDER BY s.SubCategoryId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT 
            s.SubCategoryId, s.SubCategoryCode, s.CategoryId, c.CategoryName AS Category, 
            s.SubCategoryName, s.Description, s.Status,
            s.CreatedBy, s.CreatedDate, s.UpdatedBy, s.UpdatedDate
        FROM Master_SubCategory s
        LEFT JOIN Master_Category c ON s.CategoryId = c.CategoryId
        WHERE s.SubCategoryId = p_SubCategoryId AND s.IsDeleted = 0;

    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT 
            s.SubCategoryId, s.SubCategoryCode, s.CategoryId, c.CategoryName AS Category, 
            s.SubCategoryName, s.Description, s.Status,
            s.CreatedBy, s.CreatedDate, s.UpdatedBy, s.UpdatedDate
        FROM Master_SubCategory s
        LEFT JOIN Master_Category c ON s.CategoryId = c.CategoryId
        WHERE s.IsDeleted = 0 
          AND (p_CategoryFilter = 0 OR s.CategoryId = p_CategoryFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR s.Status = p_StatusFilter)
          AND (
              s.SubCategoryCode LIKE CONCAT('%', p_Search, '%') OR
              s.SubCategoryName LIKE CONCAT('%', p_Search, '%') OR
              c.CategoryName LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY s.SubCategoryId DESC;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('SUB-', LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(SubCategoryCode, '-', -1) AS UNSIGNED)), 0) + 1, 3, '0')) AS SubCategoryCode
        FROM Master_SubCategory;

    ELSEIF p_Opt = 'INSERT' THEN
        SET @newCode = (SELECT CONCAT('SUB-', LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(SubCategoryCode, '-', -1) AS UNSIGNED)), 0) + 1, 3, '0')) FROM Master_SubCategory);
        INSERT INTO Master_SubCategory (
            SubCategoryCode, CategoryId, SubCategoryName, Description, 
            Status, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            @newCode, p_CategoryId, p_SubCategoryName, p_Description,
            p_Status, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );
        SELECT LAST_INSERT_ID() AS SubCategoryId;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_SubCategory
        SET 
            CategoryId = p_CategoryId,
            SubCategoryName = p_SubCategoryName,
            Description = p_Description,
            Status = p_Status,
            UpdatedBy = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SubCategoryId = p_SubCategoryId;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_SubCategory
        SET 
            Status = IF(Status = 'Active', 'Inactive', 'Active'),
            UpdatedBy = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SubCategoryId = p_SubCategoryId;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_SubCategory
        SET 
            IsDeleted = 1,
            Status = 'Inactive',
            UpdatedBy = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SubCategoryId = p_SubCategoryId;
    END IF;
END
"""

with engine.connect() as conn:
    print("Dropping old SpMasterSubCategory")
    conn.execute(text("DROP PROCEDURE IF EXISTS SpMasterSubCategory"))
    print("Creating new SpMasterSubCategory")
    conn.execute(text(sp_subcategory))
    print("Done")
