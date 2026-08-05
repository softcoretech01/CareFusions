-- ============================================================
-- Pharmacy (Retail Sales / POS) - SQL Script
-- Database : hospital  (operational data, alongside IPD)
-- Tables   : hospital.Pharmacy_Stock, hospital.Pharmacy_Sale, hospital.Pharmacy_SaleItem
-- SPs      : hospital.SpPharmacyStock, hospital.SpPharmacySale
-- Screens  : /pharmacy/* (POS, Returns, Reports, Dashboard, Print)
--
-- Relationships (FK):
--   Pharmacy_Stock.MedicineId    -> admin.Master_Medicine.MedicineId  (cross-schema, 1 stock row / medicine)
--   Pharmacy_SaleItem.SaleId     -> hospital.Pharmacy_Sale.SaleId      (ON DELETE CASCADE)
--   Pharmacy_SaleItem.MedicineId -> admin.Master_Medicine.MedicineId   (cross-schema)
--
-- The medicine master (admin.Master_Medicine) is a catalog only (no
-- stock/batch/expiry); this script adds the live inventory + sales layer in
-- the hospital DB. Object names are fully qualified so this deploys correctly
-- under init_db.py even when the connection's default schema is `admin`.
-- ============================================================
CREATE DATABASE IF NOT EXISTS hospital;

-- ── Live stock (one row per medicine) ────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Pharmacy_Stock (
    StockId       INT          NOT NULL AUTO_INCREMENT,
    MedicineId    INT          NOT NULL,
    BatchNo       VARCHAR(50)  NULL,
    Quantity      INT          NOT NULL DEFAULT 0,
    UnitPrice     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ExpiryDate    DATE         NULL,
    MinStockLevel INT          NOT NULL DEFAULT 10,
    CreatedDate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy     VARCHAR(100) NULL,
    UpdatedDate   DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Pharmacy_Stock PRIMARY KEY (StockId),
    CONSTRAINT UQ_Pharmacy_Stock_Medicine UNIQUE (MedicineId),
    CONSTRAINT FK_Pharmacy_Stock_Medicine FOREIGN KEY (MedicineId)
        REFERENCES admin.Master_Medicine (MedicineId),
    KEY IDX_Pharmacy_Stock_Qty (Quantity)
);

-- ── Sale (bill header) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Pharmacy_Sale (
    SaleId        INT          NOT NULL AUTO_INCREMENT,
    BillNumber    VARCHAR(20)  NOT NULL,          -- Auto: INV-YYYYNNNN
    PatientName   VARCHAR(150) NULL,
    PatientRef    VARCHAR(50)  NULL,              -- phone or UHID (walk-in retail)
    SaleDate      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TotalAmount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,  -- subtotal (pre tax/discount)
    Discount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    Tax           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    NetAmount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PaymentMode   VARCHAR(20)  NULL,
    PaymentStatus VARCHAR(20)  NOT NULL DEFAULT 'Pending',
    CreatedBy     VARCHAR(100) NULL,
    CreatedDate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy    VARCHAR(100) NULL,
    ModifiedDate  DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Pharmacy_Sale PRIMARY KEY (SaleId),
    CONSTRAINT UQ_Pharmacy_Sale_BillNumber UNIQUE (BillNumber),
    KEY IDX_Pharmacy_Sale_Date (SaleDate),
    KEY IDX_Pharmacy_Sale_Status (PaymentStatus)
);

-- ── Sale item (bill line) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Pharmacy_SaleItem (
    SaleItemId   INT          NOT NULL AUTO_INCREMENT,
    SaleId       INT          NOT NULL,
    MedicineId   INT          NOT NULL,
    MedicineName VARCHAR(200) NOT NULL,           -- snapshot at sale time
    Quantity     INT          NOT NULL,
    UnitPrice    DECIMAL(10,2) NOT NULL,
    Subtotal     DECIMAL(12,2) NOT NULL,
    CONSTRAINT PK_Pharmacy_SaleItem PRIMARY KEY (SaleItemId),
    CONSTRAINT FK_Pharmacy_SaleItem_Sale FOREIGN KEY (SaleId)
        REFERENCES hospital.Pharmacy_Sale (SaleId) ON DELETE CASCADE,
    CONSTRAINT FK_Pharmacy_SaleItem_Medicine FOREIGN KEY (MedicineId)
        REFERENCES admin.Master_Medicine (MedicineId),
    KEY IDX_Pharmacy_SaleItem_Sale (SaleId)
);


-- ── Demo seed: realistic medicines (admin catalog) + stock (hospital) ──
-- Idempotent: medicines keyed by unique MedicineCode, stock keyed by unique MedicineId.
INSERT IGNORE INTO admin.Master_Medicine
    (MedicineCode, GenericName, BrandName, Category, Manufacturer, Strength, DosageForm, Unit, PurchasePrice, SellingPrice, Gst, Status, CreatedBy)
VALUES
    ('PH-001','Paracetamol','Dolo 650','Tablets','Micro Labs Ltd','650mg','Tablet','Strip',18.00,30.00,12.00,'Active','Seed'),
    ('PH-002','Amoxicillin','Amoxil','Capsules','GSK','500mg','Capsule','Strip',80.00,125.00,12.00,'Active','Seed'),
    ('PH-003','Aspirin','Ecosprin','Tablets','USV','75mg','Tablet','Strip',6.00,12.00,5.00,'Active','Seed'),
    ('PH-004','Cefixime','Suprax','Tablets','Lupin','200mg','Tablet','Strip',60.00,95.00,12.00,'Active','Seed'),
    ('PH-005','Metformin','Glucophage','Tablets','USV','500mg','Tablet','Strip',28.00,45.00,5.00,'Active','Seed'),
    ('PH-006','Omeprazole','Omez','Capsules','Dr Reddy''s','20mg','Capsule','Strip',34.00,55.00,12.00,'Active','Seed');

INSERT INTO hospital.Pharmacy_Stock (MedicineId, BatchNo, Quantity, UnitPrice, ExpiryDate, MinStockLevel)
SELECT m.MedicineId,
       CONCAT('B-', m.MedicineCode),
       CASE m.MedicineCode WHEN 'PH-003' THEN 8 ELSE 150 END,   -- PH-003 seeded low to demo low-stock
       m.SellingPrice,
       CASE m.MedicineCode WHEN 'PH-002' THEN '2026-09-30' ELSE '2027-12-31' END,  -- PH-002 near expiry
       20
FROM admin.Master_Medicine m
WHERE m.MedicineCode IN ('PH-001','PH-002','PH-003','PH-004','PH-005','PH-006')
ON DUPLICATE KEY UPDATE MinStockLevel = VALUES(MinStockLevel);


-- ============================================================
-- SP: SpPharmacyStock  (LIST | GETBYID | UPSERT | ADJUST | LOWSTOCK | EXPIRY)
-- Joins the medicine catalog with live stock so the POS lists every
-- active medicine, defaulting price to SellingPrice and quantity to 0.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpPharmacyStock;
DELIMITER $$
CREATE PROCEDURE hospital.SpPharmacyStock(
    IN p_Opt VARCHAR(20),
    IN p_MedicineId INT,
    IN p_BatchNo VARCHAR(50),
    IN p_Quantity INT,
    IN p_UnitPrice DECIMAL(10,2),
    IN p_ExpiryDate DATE,
    IN p_MinStockLevel INT,
    IN p_Days INT,
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT m.MedicineId AS id, m.BrandName AS name, m.GenericName AS genericName,
               m.Category AS category, m.Manufacturer AS manufacturer,
               COALESCE(s.BatchNo, '') AS batchNo,
               COALESCE(s.Quantity, 0) AS quantity,
               COALESCE(s.UnitPrice, m.SellingPrice) AS unitPrice,
               s.ExpiryDate AS expiryDate,
               COALESCE(s.MinStockLevel, m.ReorderLevel) AS minStockLevel,
               m.Gst AS gst
        FROM admin.Master_Medicine m
        LEFT JOIN hospital.Pharmacy_Stock s ON s.MedicineId = m.MedicineId
        WHERE m.IsDeleted = 0 AND m.Status = 'Active'
        ORDER BY m.BrandName;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT m.MedicineId AS id, m.BrandName AS name, m.GenericName AS genericName,
               m.Category AS category, m.Manufacturer AS manufacturer,
               COALESCE(s.BatchNo, '') AS batchNo,
               COALESCE(s.Quantity, 0) AS quantity,
               COALESCE(s.UnitPrice, m.SellingPrice) AS unitPrice,
               s.ExpiryDate AS expiryDate,
               COALESCE(s.MinStockLevel, m.ReorderLevel) AS minStockLevel,
               m.Gst AS gst
        FROM admin.Master_Medicine m
        LEFT JOIN hospital.Pharmacy_Stock s ON s.MedicineId = m.MedicineId
        WHERE m.MedicineId = p_MedicineId;

    ELSEIF p_Opt = 'UPSERT' THEN
        INSERT INTO hospital.Pharmacy_Stock (MedicineId, BatchNo, Quantity, UnitPrice, ExpiryDate, MinStockLevel, UpdatedBy)
        VALUES (p_MedicineId, p_BatchNo, p_Quantity, p_UnitPrice, p_ExpiryDate, p_MinStockLevel, p_User)
        ON DUPLICATE KEY UPDATE
            BatchNo = VALUES(BatchNo), Quantity = VALUES(Quantity), UnitPrice = VALUES(UnitPrice),
            ExpiryDate = VALUES(ExpiryDate), MinStockLevel = VALUES(MinStockLevel), UpdatedBy = VALUES(UpdatedBy);
        SELECT p_MedicineId AS id;

    ELSEIF p_Opt = 'ADJUST' THEN
        UPDATE hospital.Pharmacy_Stock SET Quantity = Quantity + p_Quantity, UpdatedBy = p_User
        WHERE MedicineId = p_MedicineId;
        SELECT p_MedicineId AS id;

    ELSEIF p_Opt = 'LOWSTOCK' THEN
        SELECT m.MedicineId AS id, m.BrandName AS name, m.Category AS category,
               COALESCE(s.Quantity, 0) AS quantity,
               COALESCE(s.MinStockLevel, m.ReorderLevel) AS minStockLevel
        FROM admin.Master_Medicine m
        LEFT JOIN hospital.Pharmacy_Stock s ON s.MedicineId = m.MedicineId
        WHERE m.IsDeleted = 0 AND m.Status = 'Active'
          AND COALESCE(s.Quantity, 0) < COALESCE(s.MinStockLevel, m.ReorderLevel)
        ORDER BY m.BrandName;

    ELSEIF p_Opt = 'EXPIRY' THEN
        SELECT m.MedicineId AS id, m.BrandName AS name, m.Category AS category,
               s.BatchNo AS batchNo, s.ExpiryDate AS expiryDate, COALESCE(s.Quantity, 0) AS quantity
        FROM hospital.Pharmacy_Stock s
        JOIN admin.Master_Medicine m ON m.MedicineId = s.MedicineId
        WHERE s.ExpiryDate IS NOT NULL
          AND s.ExpiryDate <= DATE_ADD(CURDATE(), INTERVAL COALESCE(p_Days, 30) DAY)
        ORDER BY s.ExpiryDate;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpPharmacySale  (LIST | LISTITEMS | GETBYID | ITEMS | CREATE | REFUND | UPDATESTATUS)
-- CREATE is atomic: guards stock, generates the bill number, inserts the
-- header + all lines (from a JSON array), and decrements live stock.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpPharmacySale;
DELIMITER $$
CREATE PROCEDURE hospital.SpPharmacySale(
    IN p_Opt VARCHAR(20),
    IN p_SaleId INT,
    IN p_PatientName VARCHAR(150),
    IN p_PatientRef VARCHAR(50),
    IN p_TotalAmount DECIMAL(12,2),
    IN p_Discount DECIMAL(12,2),
    IN p_Tax DECIMAL(12,2),
    IN p_NetAmount DECIMAL(12,2),
    IN p_PaymentMode VARCHAR(20),
    IN p_PaymentStatus VARCHAR(20),
    IN p_Items LONGTEXT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT * FROM hospital.Pharmacy_Sale
        WHERE (p_FromDate IS NULL OR DATE(SaleDate) >= p_FromDate)
          AND (p_ToDate   IS NULL OR DATE(SaleDate) <= p_ToDate)
        ORDER BY SaleId DESC;

    ELSEIF p_Opt = 'LISTITEMS' THEN
        SELECT si.* FROM hospital.Pharmacy_SaleItem si
        JOIN hospital.Pharmacy_Sale s ON s.SaleId = si.SaleId
        WHERE (p_FromDate IS NULL OR DATE(s.SaleDate) >= p_FromDate)
          AND (p_ToDate   IS NULL OR DATE(s.SaleDate) <= p_ToDate);

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT * FROM hospital.Pharmacy_Sale WHERE SaleId = p_SaleId;

    ELSEIF p_Opt = 'ITEMS' THEN
        SELECT * FROM hospital.Pharmacy_SaleItem WHERE SaleId = p_SaleId;

    ELSEIF p_Opt = 'CREATE' THEN
        -- Guard: reject if any line exceeds available stock.
        IF EXISTS (
            SELECT 1 FROM JSON_TABLE(p_Items, '$[*]' COLUMNS (
                MedicineId INT PATH '$.medicineId',
                Qty        INT PATH '$.quantity'
            )) jt
            LEFT JOIN hospital.Pharmacy_Stock s ON s.MedicineId = jt.MedicineId
            WHERE jt.Qty > COALESCE(s.Quantity, 0)
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for one or more items';
        END IF;

        SET @yr = YEAR(CURDATE());
        SELECT COALESCE(MAX(CAST(SUBSTRING(BillNumber, 9) AS UNSIGNED)), 0) + 1 INTO @roll
        FROM hospital.Pharmacy_Sale WHERE BillNumber LIKE CONCAT('INV-', @yr, '%');
        SET @billno = CONCAT('INV-', @yr, LPAD(@roll, 4, '0'));

        INSERT INTO hospital.Pharmacy_Sale
            (BillNumber, PatientName, PatientRef, TotalAmount, Discount, Tax, NetAmount, PaymentMode, PaymentStatus, CreatedBy)
        VALUES
            (@billno, p_PatientName, p_PatientRef, p_TotalAmount, p_Discount, p_Tax, p_NetAmount, p_PaymentMode, p_PaymentStatus, p_User);
        SET @sid = LAST_INSERT_ID();

        INSERT INTO hospital.Pharmacy_SaleItem (SaleId, MedicineId, MedicineName, Quantity, UnitPrice, Subtotal)
        SELECT @sid, jt.MedicineId, jt.MedicineName, jt.Quantity, jt.UnitPrice, jt.Subtotal
        FROM JSON_TABLE(p_Items, '$[*]' COLUMNS (
            MedicineId   INT           PATH '$.medicineId',
            MedicineName VARCHAR(200)  PATH '$.medicineName',
            Quantity     INT           PATH '$.quantity',
            UnitPrice    DECIMAL(10,2) PATH '$.unitPrice',
            Subtotal     DECIMAL(12,2) PATH '$.subtotal'
        )) jt;

        UPDATE hospital.Pharmacy_Stock s
        JOIN JSON_TABLE(p_Items, '$[*]' COLUMNS (
            MedicineId INT PATH '$.medicineId',
            Qty        INT PATH '$.quantity'
        )) jt ON jt.MedicineId = s.MedicineId
        SET s.Quantity = s.Quantity - jt.Qty;

        SELECT @sid AS SaleId, @billno AS BillNumber;

    ELSEIF p_Opt = 'REFUND' THEN
        UPDATE hospital.Pharmacy_Stock s
        JOIN hospital.Pharmacy_SaleItem si ON si.MedicineId = s.MedicineId
        SET s.Quantity = s.Quantity + si.Quantity
        WHERE si.SaleId = p_SaleId;

        UPDATE hospital.Pharmacy_Sale SET PaymentStatus = 'Refunded', ModifiedBy = p_User
        WHERE SaleId = p_SaleId;
        SELECT p_SaleId AS SaleId;

    ELSEIF p_Opt = 'UPDATESTATUS' THEN
        UPDATE hospital.Pharmacy_Sale SET PaymentStatus = p_PaymentStatus, ModifiedBy = p_User
        WHERE SaleId = p_SaleId;
        SELECT p_SaleId AS SaleId;
    END IF;
END$$
DELIMITER ;
