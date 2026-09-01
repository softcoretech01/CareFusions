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

sp_sql = """
CREATE PROCEDURE `SpMasterMedicine`(
    IN p_Opt                VARCHAR(20),
    IN p_MedicineId         INT,

    IN p_MedicineCode       VARCHAR(50),
    IN p_GenericName        VARCHAR(200),
    IN p_CategoryId         INT,
    IN p_SubCategoryId      INT,
    IN p_Manufacturer       VARCHAR(200),
    IN p_Strength           VARCHAR(100),
    IN p_DosageForm         VARCHAR(100),
    IN p_Unit               VARCHAR(50),

    IN p_BatchTracking      TINYINT(1),
    IN p_ExpiryRequired     TINYINT(1),
    IN p_ControlledDrug     TINYINT(1),
    IN p_ReorderLevel       INT,
    IN p_Barcode            VARCHAR(100),

    IN p_PurchasePrice      DECIMAL(10, 2),
    IN p_SellingPrice       DECIMAL(10, 2),
    IN p_Gst                DECIMAL(5, 2),

    IN p_Status             VARCHAR(20),
    IN p_Remarks            TEXT,

    IN p_CreatedBy          VARCHAR(100),
    IN p_ModifiedBy         VARCHAR(100),

    IN p_Search             VARCHAR(255)
)
BEGIN
    IF p_Opt = 'GET' THEN
        SELECT
            m.MedicineId, m.MedicineCode, m.GenericName, m.CategoryId, m.SubCategoryId,
            c.CategoryName AS Category, s.SubCategoryName AS SubCategory,
            m.Manufacturer, m.Strength, m.DosageForm, m.Unit,
            m.BatchTracking, m.ExpiryRequired, m.ControlledDrug, m.ReorderLevel, m.Barcode,
            m.PurchasePrice, m.SellingPrice, m.Gst,
            m.Status, m.Remarks,
            m.CreatedBy, m.CreatedDate, m.ModifiedBy, m.ModifiedDate
        FROM Master_Medicine m
        LEFT JOIN Master_Category c ON m.CategoryId = c.CategoryId
        LEFT JOIN Master_SubCategory s ON m.SubCategoryId = s.SubCategoryId
        WHERE m.IsDeleted = 0
        ORDER BY m.MedicineId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            m.MedicineId, m.MedicineCode, m.GenericName, m.CategoryId, m.SubCategoryId,
            c.CategoryName AS Category, s.SubCategoryName AS SubCategory,
            m.Manufacturer, m.Strength, m.DosageForm, m.Unit,
            m.BatchTracking, m.ExpiryRequired, m.ControlledDrug, m.ReorderLevel, m.Barcode,
            m.PurchasePrice, m.SellingPrice, m.Gst,
            m.Status, m.Remarks,
            m.CreatedBy, m.CreatedDate, m.ModifiedBy, m.ModifiedDate
        FROM Master_Medicine m
        LEFT JOIN Master_Category c ON m.CategoryId = c.CategoryId
        LEFT JOIN Master_SubCategory s ON m.SubCategoryId = s.SubCategoryId
        WHERE m.MedicineId = p_MedicineId AND m.IsDeleted = 0;

    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            m.MedicineId, m.MedicineCode, m.GenericName, m.CategoryId, m.SubCategoryId,
            c.CategoryName AS Category, s.SubCategoryName AS SubCategory,
            m.Manufacturer, m.Strength, m.DosageForm, m.Unit,
            m.BatchTracking, m.ExpiryRequired, m.ControlledDrug, m.ReorderLevel, m.Barcode,
            m.PurchasePrice, m.SellingPrice, m.Gst,
            m.Status, m.Remarks,
            m.CreatedBy, m.CreatedDate, m.ModifiedBy, m.ModifiedDate
        FROM Master_Medicine m
        LEFT JOIN Master_Category c ON m.CategoryId = c.CategoryId
        LEFT JOIN Master_SubCategory s ON m.SubCategoryId = s.SubCategoryId
        WHERE m.IsDeleted = 0
          AND (
            m.MedicineCode  LIKE CONCAT('%', p_Search, '%') OR
            m.GenericName   LIKE CONCAT('%', p_Search, '%') OR
            m.Manufacturer  LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY m.MedicineId DESC;

    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_Medicine (
            MedicineCode, GenericName, CategoryId, SubCategoryId, Manufacturer,
            Strength, DosageForm, Unit,
            BatchTracking, ExpiryRequired, ControlledDrug, ReorderLevel, Barcode,
            PurchasePrice, SellingPrice, Gst,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_MedicineCode, p_GenericName, p_CategoryId, p_SubCategoryId, p_Manufacturer,
            p_Strength, p_DosageForm, p_Unit,
            p_BatchTracking, p_ExpiryRequired, p_ControlledDrug, p_ReorderLevel, p_Barcode,
            p_PurchasePrice, p_SellingPrice, p_Gst,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );
        SELECT LAST_INSERT_ID() AS MedicineId;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Medicine
        SET
            MedicineCode    = p_MedicineCode,
            GenericName     = p_GenericName,
            CategoryId      = p_CategoryId,
            SubCategoryId   = p_SubCategoryId,
            Manufacturer    = p_Manufacturer,
            Strength        = p_Strength,
            DosageForm      = p_DosageForm,
            Unit            = p_Unit,
            BatchTracking   = p_BatchTracking,
            ExpiryRequired  = p_ExpiryRequired,
            ControlledDrug  = p_ControlledDrug,
            ReorderLevel    = p_ReorderLevel,
            Barcode         = p_Barcode,
            PurchasePrice   = p_PurchasePrice,
            SellingPrice    = p_SellingPrice,
            Gst             = p_Gst,
            Status          = p_Status,
            Remarks         = p_Remarks,
            ModifiedDate    = CURRENT_TIMESTAMP,
            ModifiedBy      = p_ModifiedBy
        WHERE MedicineId = p_MedicineId;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Medicine
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE MedicineId = p_MedicineId;

    END IF;

END
"""

try:
    with engine.connect() as conn:
        conn.execute(text("DROP PROCEDURE IF EXISTS SpMasterMedicine"))
        conn.execute(text(sp_sql))
        print("Successfully recreated SpMasterMedicine")
except Exception as e:
    print(f"Error: {e}")
