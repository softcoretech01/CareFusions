from sqlalchemy import create_engine, text

engine = create_engine('mysql+pymysql://root:H3s%232026%2301@100.86.181.18:3320/admin')

DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS Master_MedicineCategory (
        CategoryId   INT AUTO_INCREMENT PRIMARY KEY,
        CategoryName VARCHAR(100) NOT NULL UNIQUE
    )
    """,
    "INSERT IGNORE INTO Master_MedicineCategory (CategoryName) VALUES ('Tablets')",
    "INSERT IGNORE INTO Master_MedicineCategory (CategoryName) VALUES ('Capsules')",
    "INSERT IGNORE INTO Master_MedicineCategory (CategoryName) VALUES ('Syrups')",
    "INSERT IGNORE INTO Master_MedicineCategory (CategoryName) VALUES ('Injections')",
    "INSERT IGNORE INTO Master_MedicineCategory (CategoryName) VALUES ('Ointments')",
    "INSERT IGNORE INTO Master_MedicineCategory (CategoryName) VALUES ('Drops')",
    "INSERT IGNORE INTO Master_MedicineCategory (CategoryName) VALUES ('Vaccines')",
    """
    CREATE TABLE IF NOT EXISTS Master_Medicine (
        MedicineId      INT AUTO_INCREMENT PRIMARY KEY,
        MedicineCode    VARCHAR(50) NOT NULL UNIQUE,
        GenericName     VARCHAR(200) NOT NULL,
        BrandName       VARCHAR(200) NOT NULL,
        Category        VARCHAR(100) NOT NULL,
        Manufacturer    VARCHAR(200) NOT NULL,
        Strength        VARCHAR(100) NOT NULL,
        DosageForm      VARCHAR(100) NOT NULL,
        Unit            VARCHAR(50) NOT NULL,
        BatchTracking   TINYINT(1) DEFAULT 1,
        ExpiryRequired  TINYINT(1) DEFAULT 1,
        ControlledDrug  TINYINT(1) DEFAULT 0,
        ReorderLevel    INT DEFAULT 10,
        Barcode         VARCHAR(100),
        PurchasePrice   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        SellingPrice    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        Gst             DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        Status          VARCHAR(20) DEFAULT 'Active',
        Remarks         TEXT,
        CreatedBy       VARCHAR(100),
        CreatedDate     DATETIME DEFAULT CURRENT_TIMESTAMP,
        ModifiedBy      VARCHAR(100),
        ModifiedDate    DATETIME,
        IsDeleted       TINYINT(1) DEFAULT 0
    )
    """,
    "DROP PROCEDURE IF EXISTS SpMasterMedicine",
    """
    CREATE PROCEDURE SpMasterMedicine (
        IN p_Opt                VARCHAR(20),
        IN p_MedicineId         INT,
        IN p_MedicineCode       VARCHAR(50),
        IN p_GenericName        VARCHAR(200),
        IN p_BrandName          VARCHAR(200),
        IN p_Category           VARCHAR(100),
        IN p_Manufacturer       VARCHAR(200),
        IN p_Strength           VARCHAR(100),
        IN p_DosageForm         VARCHAR(100),
        IN p_Unit               VARCHAR(50),
        IN p_BatchTracking      TINYINT(1),
        IN p_ExpiryRequired     TINYINT(1),
        IN p_ControlledDrug     TINYINT(1),
        IN p_ReorderLevel       INT,
        IN p_Barcode            VARCHAR(100),
        IN p_PurchasePrice      DECIMAL(10,2),
        IN p_SellingPrice       DECIMAL(10,2),
        IN p_Gst                DECIMAL(5,2),
        IN p_Status             VARCHAR(20),
        IN p_Remarks            TEXT,
        IN p_CreatedBy          VARCHAR(100),
        IN p_ModifiedBy         VARCHAR(100),
        IN p_Search             VARCHAR(255)
    )
    BEGIN
        IF p_Opt = 'GET' THEN
            SELECT MedicineId, MedicineCode, GenericName, BrandName, Category,
                   Manufacturer, Strength, DosageForm, Unit,
                   BatchTracking, ExpiryRequired, ControlledDrug, ReorderLevel, Barcode,
                   PurchasePrice, SellingPrice, Gst,
                   Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
            FROM Master_Medicine WHERE IsDeleted = 0 ORDER BY MedicineId DESC;

        ELSEIF p_Opt = 'GETBYID' THEN
            SELECT MedicineId, MedicineCode, GenericName, BrandName, Category,
                   Manufacturer, Strength, DosageForm, Unit,
                   BatchTracking, ExpiryRequired, ControlledDrug, ReorderLevel, Barcode,
                   PurchasePrice, SellingPrice, Gst,
                   Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
            FROM Master_Medicine WHERE MedicineId = p_MedicineId AND IsDeleted = 0;

        ELSEIF p_Opt = 'SEARCH' THEN
            SELECT MedicineId, MedicineCode, GenericName, BrandName, Category,
                   Manufacturer, Strength, DosageForm, Unit,
                   BatchTracking, ExpiryRequired, ControlledDrug, ReorderLevel, Barcode,
                   PurchasePrice, SellingPrice, Gst,
                   Status, Remarks, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
            FROM Master_Medicine
            WHERE IsDeleted = 0
              AND (MedicineCode LIKE CONCAT('%',p_Search,'%')
                OR GenericName  LIKE CONCAT('%',p_Search,'%')
                OR BrandName    LIKE CONCAT('%',p_Search,'%')
                OR Manufacturer LIKE CONCAT('%',p_Search,'%'))
            ORDER BY MedicineId DESC;

        ELSEIF p_Opt = 'INSERT' THEN
            INSERT INTO Master_Medicine (
                MedicineCode, GenericName, BrandName, Category,
                Manufacturer, Strength, DosageForm, Unit,
                BatchTracking, ExpiryRequired, ControlledDrug, ReorderLevel, Barcode,
                PurchasePrice, SellingPrice, Gst,
                Status, Remarks, CreatedBy, CreatedDate, IsDeleted
            ) VALUES (
                p_MedicineCode, p_GenericName, p_BrandName, p_Category,
                p_Manufacturer, p_Strength, p_DosageForm, p_Unit,
                p_BatchTracking, p_ExpiryRequired, p_ControlledDrug, p_ReorderLevel, p_Barcode,
                p_PurchasePrice, p_SellingPrice, p_Gst,
                p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
            );
            SELECT LAST_INSERT_ID() AS MedicineId;

        ELSEIF p_Opt = 'UPDATE' THEN
            UPDATE Master_Medicine SET
                MedicineCode = p_MedicineCode, GenericName = p_GenericName,
                BrandName = p_BrandName, Category = p_Category,
                Manufacturer = p_Manufacturer, Strength = p_Strength,
                DosageForm = p_DosageForm, Unit = p_Unit,
                BatchTracking = p_BatchTracking, ExpiryRequired = p_ExpiryRequired,
                ControlledDrug = p_ControlledDrug, ReorderLevel = p_ReorderLevel,
                Barcode = p_Barcode, PurchasePrice = p_PurchasePrice,
                SellingPrice = p_SellingPrice, Gst = p_Gst,
                Status = p_Status, Remarks = p_Remarks,
                ModifiedDate = CURRENT_TIMESTAMP, ModifiedBy = p_ModifiedBy
            WHERE MedicineId = p_MedicineId;

        ELSEIF p_Opt = 'DELETE' THEN
            UPDATE Master_Medicine SET
                IsDeleted = 1, ModifiedDate = CURRENT_TIMESTAMP, ModifiedBy = p_ModifiedBy
            WHERE MedicineId = p_MedicineId;

        END IF;
    END
    """,
]

with engine.connect() as conn:
    for stmt in DDL_STATEMENTS:
        try:
            conn.execute(text(stmt))
            conn.commit()
            print("OK:", stmt.strip()[:70])
        except Exception as e:
            print("ERR:", str(e)[:120])

print("\nAll done.")
