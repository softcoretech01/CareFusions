-- ============================================================
-- Inventory (Stock Movements) - SQL Script
-- Database : inventory  (dedicated inventory schema)
-- Tables   : inventory.Inventory_Stock, Inventory_StockLedger,
--            Inventory_Document, Inventory_DocumentItem
-- SPs      : inventory.SpInvStockPost (core movement helper)
--            inventory.SpInvDocument, inventory.SpInvStock
-- Screens  : /inventory/* (Stock In, Issue, Transfer, Return, Adjustment,
--            Current Stock, Batch Expiry, Low Stock, Ledger, Dashboard)
--
-- Relationships (FK):
--   Inventory_Stock.ItemId        -> admin.Master_Item.ItemId    (cross-schema)
--   Inventory_Stock.StoreId       -> admin.Master_Store.StoreId  (cross-schema)
--   Inventory_DocumentItem.DocId  -> inventory.Inventory_Document (ON DELETE CASCADE)
--   Inventory_DocumentItem.ItemId -> admin.Master_Item.ItemId
--   Inventory_StockLedger.DocId   -> inventory.Inventory_Document (ON DELETE SET NULL)
--
-- Design notes:
--   * Stock is LOT level: one row per (ItemId, StoreId, BatchNo). The prototype
--     appended a new row on every receipt and merged inconsistently
--     (itemCode in one screen, itemName in another).
--   * Valuation is MOVING AVERAGE, maintained on the lot. The prototype carried
--     no rate at all and discarded the GRN rate on putaway.
--   * Every movement writes an Inventory_StockLedger row. The prototype wrote
--     none, so its ledger and dashboard KPIs were frozen seed data.
--   * All five movement documents (RECEIPT / ISSUE / TRANSFER / RETURN /
--     ADJUSTMENT) share one header+line pair, discriminated by DocType.
--   * Joins are on ItemId / StoreId, never on display names.
-- ============================================================
CREATE DATABASE IF NOT EXISTS inventory;

-- ── Stock lot (current balance) ──────────────────────────────
CREATE TABLE IF NOT EXISTS inventory.Inventory_Stock (
    StockId       INT           NOT NULL AUTO_INCREMENT,
    ItemId        INT           NOT NULL,
    StoreId       INT           NOT NULL,
    BatchNo       VARCHAR(50)   NOT NULL DEFAULT '-',   -- '-' when the item is not batch tracked
    MfgDate       DATE          NULL,
    ExpiryDate    DATE          NULL,
    Quantity      DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    ReservedQty   DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    ValuationRate DECIMAL(14,4) NOT NULL DEFAULT 0.0000, -- moving average cost
    Uom           VARCHAR(50)   NULL,
    CreatedDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy     VARCHAR(100)  NULL,
    UpdatedDate   DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Inventory_Stock PRIMARY KEY (StockId),
    CONSTRAINT UQ_Inventory_Stock_Lot UNIQUE (ItemId, StoreId, BatchNo),
    CONSTRAINT FK_Inventory_Stock_Item FOREIGN KEY (ItemId)
        REFERENCES admin.Master_Item (ItemId),
    CONSTRAINT FK_Inventory_Stock_Store FOREIGN KEY (StoreId)
        REFERENCES admin.Master_Store (StoreId),
    KEY IDX_Inventory_Stock_Store (StoreId),
    KEY IDX_Inventory_Stock_Expiry (ExpiryDate),
    KEY IDX_Inventory_Stock_Qty (Quantity)
);

-- ── Movement document (header) ───────────────────────────────
CREATE TABLE IF NOT EXISTS inventory.Inventory_Document (
    DocId         INT           NOT NULL AUTO_INCREMENT,
    DocNumber     VARCHAR(20)   NOT NULL,                -- GRN-/ISS-/TRF-/RET-/ADJ-YYYYNNNN
    DocType       VARCHAR(20)   NOT NULL,                -- RECEIPT|ISSUE|TRANSFER|RETURN|ADJUSTMENT
    DocDate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FromStoreId   INT           NULL,                    -- source (issue/transfer/adjustment)
    ToStoreId     INT           NULL,                    -- destination (receipt/transfer/return)
    DepartmentName VARCHAR(150) NULL,                    -- consumption destination for ISSUE
    VendorName    VARCHAR(150)  NULL,                    -- RECEIPT supplier
    ReferenceNo   VARCHAR(50)   NULL,                    -- external GRN/PO reference
    RequestedBy   VARCHAR(150)  NULL,
    ApprovedBy    VARCHAR(150)  NULL,
    Reason        VARCHAR(100)  NULL,                    -- return/adjustment reason
    Remarks       VARCHAR(500)  NULL,
    Status        VARCHAR(20)   NOT NULL DEFAULT 'Draft', -- Draft | Posted | Cancelled
    TotalItems    INT           NOT NULL DEFAULT 0,
    TotalQty      DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    TotalValue    DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    PostedDate    DATETIME      NULL,
    CreatedBy     VARCHAR(100)  NULL,
    CreatedDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy    VARCHAR(100)  NULL,
    ModifiedDate  DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Inventory_Document PRIMARY KEY (DocId),
    CONSTRAINT UQ_Inventory_Document_Number UNIQUE (DocNumber),
    KEY IDX_Inventory_Doc_Type (DocType),
    KEY IDX_Inventory_Doc_Date (DocDate),
    KEY IDX_Inventory_Doc_Status (Status)
);

-- ── Movement document (line) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory.Inventory_DocumentItem (
    DocItemId  INT           NOT NULL AUTO_INCREMENT,
    DocId      INT           NOT NULL,
    ItemId     INT           NOT NULL,
    ItemName   VARCHAR(200)  NOT NULL,                   -- snapshot at posting time
    BatchNo    VARCHAR(50)   NOT NULL DEFAULT '-',
    MfgDate    DATE          NULL,
    ExpiryDate DATE          NULL,
    Quantity   DECIMAL(14,3) NOT NULL,
    Rate       DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    Value      DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    Uom        VARCHAR(50)   NULL,
    Remarks    VARCHAR(255)  NULL,
    CONSTRAINT PK_Inventory_DocumentItem PRIMARY KEY (DocItemId),
    CONSTRAINT FK_Inventory_DocItem_Doc FOREIGN KEY (DocId)
        REFERENCES inventory.Inventory_Document (DocId) ON DELETE CASCADE,
    CONSTRAINT FK_Inventory_DocItem_Item FOREIGN KEY (ItemId)
        REFERENCES admin.Master_Item (ItemId),
    KEY IDX_Inventory_DocItem_Doc (DocId)
);

-- ── Stock ledger (append only — the audit trail) ─────────────
CREATE TABLE IF NOT EXISTS inventory.Inventory_StockLedger (
    LedgerId     INT           NOT NULL AUTO_INCREMENT,
    TxnDate      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ItemId       INT           NOT NULL,
    ItemName     VARCHAR(200)  NOT NULL,
    StoreId      INT           NOT NULL,
    StoreName    VARCHAR(150)  NULL,
    BatchNo      VARCHAR(50)   NOT NULL DEFAULT '-',
    MovementType VARCHAR(20)   NOT NULL,                 -- RECEIPT|ISSUE|TRANSFER_OUT|TRANSFER_IN|RETURN|ADJUSTMENT|WRITEOFF
    Quantity     DECIMAL(14,3) NOT NULL,                 -- signed: + inward, - outward
    Rate         DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    Value        DECIMAL(16,2) NOT NULL DEFAULT 0.00,    -- signed, = Quantity * Rate
    BalanceQty   DECIMAL(14,3) NOT NULL DEFAULT 0.000,   -- lot balance after this movement
    DocId        INT           NULL,
    DocNumber    VARCHAR(20)   NULL,
    DocType      VARCHAR(20)   NULL,
    Remarks      VARCHAR(255)  NULL,
    CreatedBy    VARCHAR(100)  NULL,
    CONSTRAINT PK_Inventory_StockLedger PRIMARY KEY (LedgerId),
    CONSTRAINT FK_Inventory_Ledger_Doc FOREIGN KEY (DocId)
        REFERENCES inventory.Inventory_Document (DocId) ON DELETE SET NULL,
    KEY IDX_Inventory_Ledger_Item (ItemId),
    KEY IDX_Inventory_Ledger_Store (StoreId),
    KEY IDX_Inventory_Ledger_Date (TxnDate),
    KEY IDX_Inventory_Ledger_Type (MovementType)
);


-- ── Integrity fix: the UQ_*_Code constraints declared in the inventory master
--    SQL files never reached the live tables. CREATE TABLE IF NOT EXISTS is a
--    silent no-op once the table exists, so any constraint added after first
--    creation is skipped while the deploy still reports success. This is the
--    same drift already fixed on Master_Medicine, Master_LabTest,
--    Master_InsuranceProvider and Master_Tpa. Applied idempotently.
DROP PROCEDURE IF EXISTS admin.SpTmpAddInventoryUq;
DELIMITER $$
CREATE PROCEDURE admin.SpTmpAddInventoryUq()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='admin'
                   AND TABLE_NAME='Master_Item' AND INDEX_NAME='UQ_Item_Code') THEN
        ALTER TABLE admin.Master_Item ADD CONSTRAINT UQ_Item_Code UNIQUE (ItemCode);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='admin'
                   AND TABLE_NAME='Master_Store' AND INDEX_NAME='UQ_Store_Code') THEN
        ALTER TABLE admin.Master_Store ADD CONSTRAINT UQ_Store_Code UNIQUE (StoreCode);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='admin'
                   AND TABLE_NAME='Master_Category' AND INDEX_NAME='UQ_Category_Code') THEN
        ALTER TABLE admin.Master_Category ADD CONSTRAINT UQ_Category_Code UNIQUE (CategoryCode);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='admin'
                   AND TABLE_NAME='Master_SubCategory' AND INDEX_NAME='UQ_SubCategory_Code') THEN
        ALTER TABLE admin.Master_SubCategory ADD CONSTRAINT UQ_SubCategory_Code UNIQUE (SubCategoryCode);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='admin'
                   AND TABLE_NAME='Master_Brand' AND INDEX_NAME='UQ_Brand_Code') THEN
        ALTER TABLE admin.Master_Brand ADD CONSTRAINT UQ_Brand_Code UNIQUE (BrandCode);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='admin'
                   AND TABLE_NAME='Master_Manufacturer' AND INDEX_NAME='UQ_Manufacturer_Code') THEN
        ALTER TABLE admin.Master_Manufacturer ADD CONSTRAINT UQ_Manufacturer_Code UNIQUE (ManufacturerCode);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='admin'
                   AND TABLE_NAME='Master_Vendor' AND INDEX_NAME='UQ_Vendor_Code') THEN
        ALTER TABLE admin.Master_Vendor ADD CONSTRAINT UQ_Vendor_Code UNIQUE (VendorCode);
    END IF;
END$$
DELIMITER ;
CALL admin.SpTmpAddInventoryUq();
DROP PROCEDURE IF EXISTS admin.SpTmpAddInventoryUq;


-- ── Demo seed: every inventory master was empty, so there was nothing to hold
--    stock against. Idempotent on the unique code columns added above.
INSERT IGNORE INTO admin.Master_Store
    (StoreCode, StoreName, StoreType, Location, InCharge, ContactNumber, Status, CreatedBy)
VALUES
    ('STR-001','Central Medical Store','Main Store','Ground Floor, Block A','Store Manager','9000001001','Active','Seed'),
    ('STR-002','Pharmacy Store','Pharmacy Store','Ground Floor, OPD Block','Chief Pharmacist','9000001002','Active','Seed'),
    ('STR-003','OT Store','OT Store','2nd Floor, Surgical Block','OT Incharge','9000001003','Active','Seed'),
    ('STR-004','Lab Store','Lab Store','1st Floor, Diagnostics','Lab Incharge','9000001004','Active','Seed');

INSERT IGNORE INTO admin.Master_Category (CategoryCode, CategoryName, Description, Status, CreatedBy)
VALUES
    ('CAT-001','Medical Consumables','Disposables and consumable supplies','Active','Seed'),
    ('CAT-002','Surgical Items','Surgical instruments and sundries','Active','Seed'),
    ('CAT-003','Equipment','Reusable biomedical equipment','Active','Seed'),
    ('CAT-004','Lab Reagents','Diagnostic reagents and kits','Active','Seed'),
    ('CAT-005','Stationery','Administrative and printing supplies','Active','Seed');

INSERT IGNORE INTO admin.Master_Uom (UomCode, UomName, ShortName, Status, CreatedBy)
VALUES
    ('EA','Each','Ea','Active','Seed'),
    ('BOX','Box','Box','Active','Seed'),
    ('VIAL','Vial','Vial','Active','Seed'),
    ('BTL','Bottle','Btl','Active','Seed'),
    ('PKT','Packet','Pkt','Active','Seed');

INSERT IGNORE INTO admin.Master_Item
    (ItemCode, ItemName, Category, SubCategory, Brand, Manufacturer, Uom, HsnCode, GstPercentage,
     ReorderLevel, MinStock, MaxStock, ShelfLife, BatchRequired, ExpiryRequired, Status, CreatedBy)
VALUES
    ('ITM-001','Disposable Syringe 5ml','Medical Consumables','Syringes','BD','Becton Dickinson','Each','90183100',12,200,100,5000,1095,1,1,'Active','Seed'),
    ('ITM-002','Surgical Gloves (Sterile) M','Medical Consumables','Gloves','Ansell','Ansell Ltd','Box','40151900',12,100,50,3000,730,1,1,'Active','Seed'),
    ('ITM-003','IV Cannula 20G','Medical Consumables','IV Sets','Romsons','Romsons Group','Each','90183900',12,150,75,4000,1095,1,1,'Active','Seed'),
    ('ITM-004','Cotton Roll 500g','Medical Consumables','Dressings','Bella','Bella Healthcare','Each','30059010',5,80,40,2000,1825,1,1,'Active','Seed'),
    ('ITM-005','Surgical Blade No.15','Surgical Items','Blades','Swann-Morton','Swann-Morton','Box','82121000',12,60,30,1500,1825,1,1,'Active','Seed'),
    ('ITM-006','Suture Vicryl 3-0','Surgical Items','Sutures','Ethicon','Johnson & Johnson','Each','30061010',12,50,25,1200,1095,1,1,'Active','Seed'),
    ('ITM-007','Face Mask 3-Ply','Medical Consumables','PPE','Magnum','Magnum Health','Box','63079011',5,300,150,8000,1095,1,0,'Active','Seed'),
    ('ITM-008','Glucose Test Strips','Lab Reagents','Diagnostics','Accu-Chek','Roche','Box','38220090',12,40,20,1000,548,1,1,'Active','Seed'),
    ('ITM-009','Digital Thermometer','Equipment','Instruments','Omron','Omron Healthcare','Each','90251110',18,20,10,300,NULL,0,0,'Active','Seed'),
    ('ITM-010','Patient File Folder','Stationery','Records','Local','Local Supplier','Packet','48201090',12,100,50,2500,NULL,0,0,'Active','Seed');


-- ============================================================
-- SP: SpInvStockPost — the core movement procedure.
-- Applies one signed movement to a lot and writes the ledger row.
-- Inbound (Qty > 0) recomputes the moving-average valuation rate;
-- outbound (Qty < 0) consumes at the lot's current rate and is blocked
-- when the lot has insufficient quantity.
-- ============================================================
DROP PROCEDURE IF EXISTS inventory.SpInvStockPost;
DELIMITER $$
CREATE PROCEDURE inventory.SpInvStockPost(
    IN p_ItemId INT,
    IN p_StoreId INT,
    IN p_BatchNo VARCHAR(50),
    IN p_MfgDate DATE,
    IN p_ExpiryDate DATE,
    IN p_Qty DECIMAL(14,3),          -- signed
    IN p_Rate DECIMAL(14,4),         -- inbound cost; ignored on outbound
    IN p_Uom VARCHAR(50),
    IN p_MovementType VARCHAR(20),
    IN p_DocId INT,
    IN p_DocNumber VARCHAR(20),
    IN p_DocType VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_User VARCHAR(100)
)
BEGIN
    DECLARE v_batch VARCHAR(50);
    DECLARE v_oldQty DECIMAL(14,3) DEFAULT 0.000;
    DECLARE v_oldRate DECIMAL(14,4) DEFAULT 0.0000;
    DECLARE v_newQty DECIMAL(14,3) DEFAULT 0.000;
    DECLARE v_newRate DECIMAL(14,4) DEFAULT 0.0000;
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_itemName VARCHAR(200);
    DECLARE v_storeName VARCHAR(150);

    SET v_batch = COALESCE(NULLIF(TRIM(p_BatchNo), ''), '-');

    SELECT ItemName INTO v_itemName FROM admin.Master_Item WHERE ItemId = p_ItemId;
    SELECT StoreName INTO v_storeName FROM admin.Master_Store WHERE StoreId = p_StoreId;

    IF v_itemName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown item';
    END IF;
    IF v_storeName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown store';
    END IF;
    IF p_Qty = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Movement quantity cannot be zero';
    END IF;

    SELECT COUNT(*), COALESCE(MAX(Quantity), 0), COALESCE(MAX(ValuationRate), 0)
      INTO v_exists, v_oldQty, v_oldRate
    FROM inventory.Inventory_Stock
    WHERE ItemId = p_ItemId AND StoreId = p_StoreId AND BatchNo = v_batch;

    IF p_Qty > 0 THEN
        SET v_newQty = v_oldQty + p_Qty;
        -- Moving average: blend the existing holding with the incoming cost.
        SET v_newRate = CASE
            WHEN COALESCE(p_Rate, 0) <= 0 THEN v_oldRate
            WHEN v_newQty <= 0 THEN p_Rate
            ELSE ((v_oldQty * v_oldRate) + (p_Qty * p_Rate)) / v_newQty
        END;

        IF v_exists = 0 THEN
            INSERT INTO inventory.Inventory_Stock
                (ItemId, StoreId, BatchNo, MfgDate, ExpiryDate, Quantity, ValuationRate, Uom, UpdatedBy)
            VALUES
                (p_ItemId, p_StoreId, v_batch, p_MfgDate, p_ExpiryDate, v_newQty, v_newRate, p_Uom, p_User);
        ELSE
            UPDATE inventory.Inventory_Stock
            SET Quantity = v_newQty,
                ValuationRate = v_newRate,
                MfgDate = COALESCE(p_MfgDate, MfgDate),
                ExpiryDate = COALESCE(p_ExpiryDate, ExpiryDate),
                Uom = COALESCE(p_Uom, Uom),
                UpdatedBy = p_User
            WHERE ItemId = p_ItemId AND StoreId = p_StoreId AND BatchNo = v_batch;
        END IF;
    ELSE
        IF v_exists = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No stock lot for this item, store and batch';
        END IF;
        IF v_oldQty + p_Qty < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock in the selected lot';
        END IF;
        SET v_newQty = v_oldQty + p_Qty;
        SET v_newRate = v_oldRate;      -- issuing does not change the average cost

        UPDATE inventory.Inventory_Stock
        SET Quantity = v_newQty, UpdatedBy = p_User
        WHERE ItemId = p_ItemId AND StoreId = p_StoreId AND BatchNo = v_batch;
    END IF;

    INSERT INTO inventory.Inventory_StockLedger
        (ItemId, ItemName, StoreId, StoreName, BatchNo, MovementType, Quantity, Rate, Value,
         BalanceQty, DocId, DocNumber, DocType, Remarks, CreatedBy)
    VALUES
        (p_ItemId, v_itemName, p_StoreId, v_storeName, v_batch, p_MovementType, p_Qty, v_newRate,
         ROUND(p_Qty * v_newRate, 2), v_newQty, p_DocId, p_DocNumber, p_DocType, p_Remarks, p_User);
END$$
DELIMITER ;


-- ============================================================
-- SP: SpInvDocument  (LIST | GETBYID | ITEMS | CREATE | DELETE)
-- CREATE builds the document from a JSON line array and posts every line
-- through SpInvStockPost, so stock and ledger always move together.
-- TRANSFER posts twice per line (out of source, into destination).
-- ============================================================
DROP PROCEDURE IF EXISTS inventory.SpInvDocument;
DELIMITER $$
CREATE PROCEDURE inventory.SpInvDocument(
    IN p_Opt VARCHAR(20),
    IN p_DocId INT,
    IN p_DocType VARCHAR(20),
    IN p_FromStoreId INT,
    IN p_ToStoreId INT,
    IN p_DepartmentName VARCHAR(150),
    IN p_VendorName VARCHAR(150),
    IN p_ReferenceNo VARCHAR(50),
    IN p_RequestedBy VARCHAR(150),
    IN p_ApprovedBy VARCHAR(150),
    IN p_Reason VARCHAR(100),
    IN p_Remarks VARCHAR(500),
    IN p_Items LONGTEXT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_User VARCHAR(100)
)
BEGIN
    DECLARE v_prefix VARCHAR(5);
    DECLARE v_docNo VARCHAR(20);
    DECLARE v_docId INT;
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_itemId INT;
    DECLARE v_batch VARCHAR(50);
    DECLARE v_mfg DATE;
    DECLARE v_exp DATE;
    DECLARE v_qty DECIMAL(14,3);
    DECLARE v_rate DECIMAL(14,4);
    DECLARE v_uom VARCHAR(50);
    DECLARE v_lineRemarks VARCHAR(255);

    IF p_Opt = 'LIST' THEN
        SELECT d.*, fs.StoreName AS FromStoreName, ts.StoreName AS ToStoreName
        FROM inventory.Inventory_Document d
        LEFT JOIN admin.Master_Store fs ON fs.StoreId = d.FromStoreId
        LEFT JOIN admin.Master_Store ts ON ts.StoreId = d.ToStoreId
        WHERE (p_DocType IS NULL OR d.DocType = p_DocType)
          AND (p_FromStoreId IS NULL OR d.FromStoreId = p_FromStoreId)
          AND (p_FromDate IS NULL OR DATE(d.DocDate) >= p_FromDate)
          AND (p_ToDate   IS NULL OR DATE(d.DocDate) <= p_ToDate)
        ORDER BY d.DocId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT d.*, fs.StoreName AS FromStoreName, ts.StoreName AS ToStoreName
        FROM inventory.Inventory_Document d
        LEFT JOIN admin.Master_Store fs ON fs.StoreId = d.FromStoreId
        LEFT JOIN admin.Master_Store ts ON ts.StoreId = d.ToStoreId
        WHERE d.DocId = p_DocId;

    ELSEIF p_Opt = 'ITEMS' THEN
        SELECT * FROM inventory.Inventory_DocumentItem WHERE DocId = p_DocId ORDER BY DocItemId;

    ELSEIF p_Opt = 'LISTITEMS' THEN
        SELECT di.* FROM inventory.Inventory_DocumentItem di
        JOIN inventory.Inventory_Document d ON d.DocId = di.DocId
        WHERE (p_DocType IS NULL OR d.DocType = p_DocType)
          AND (p_FromDate IS NULL OR DATE(d.DocDate) >= p_FromDate)
          AND (p_ToDate   IS NULL OR DATE(d.DocDate) <= p_ToDate)
        ORDER BY di.DocId DESC, di.DocItemId;

    ELSEIF p_Opt = 'CREATE' THEN
        SET v_prefix = CASE p_DocType
            WHEN 'RECEIPT'    THEN 'GRN-'
            WHEN 'ISSUE'      THEN 'ISS-'
            WHEN 'TRANSFER'   THEN 'TRF-'
            WHEN 'RETURN'     THEN 'RET-'
            WHEN 'ADJUSTMENT' THEN 'ADJ-'
            ELSE 'DOC-' END;

        SET @yr = YEAR(CURDATE());
        SELECT COALESCE(MAX(CAST(SUBSTRING(DocNumber, LENGTH(v_prefix) + 5) AS UNSIGNED)), 0) + 1
          INTO @roll
        FROM inventory.Inventory_Document
        WHERE DocNumber LIKE CONCAT(v_prefix, @yr, '%');
        SET v_docNo = CONCAT(v_prefix, @yr, LPAD(@roll, 4, '0'));

        INSERT INTO inventory.Inventory_Document
            (DocNumber, DocType, FromStoreId, ToStoreId, DepartmentName, VendorName, ReferenceNo,
             RequestedBy, ApprovedBy, Reason, Remarks, Status, PostedDate, CreatedBy)
        VALUES
            (v_docNo, p_DocType, p_FromStoreId, p_ToStoreId, p_DepartmentName, p_VendorName,
             p_ReferenceNo, p_RequestedBy, p_ApprovedBy, p_Reason, p_Remarks, 'Posted', NOW(), p_User);
        SET v_docId = LAST_INSERT_ID();

        INSERT INTO inventory.Inventory_DocumentItem
            (DocId, ItemId, ItemName, BatchNo, MfgDate, ExpiryDate, Quantity, Rate, Value, Uom, Remarks)
        SELECT v_docId, jt.ItemId, COALESCE(m.ItemName, 'Unknown'),
               COALESCE(NULLIF(TRIM(jt.BatchNo), ''), '-'), jt.MfgDate, jt.ExpiryDate,
               jt.Quantity, COALESCE(jt.Rate, 0), ROUND(jt.Quantity * COALESCE(jt.Rate, 0), 2),
               COALESCE(jt.Uom, m.Uom), jt.Remarks
        FROM JSON_TABLE(p_Items, '$[*]' COLUMNS (
            ItemId     INT           PATH '$.itemId',
            BatchNo    VARCHAR(50)   PATH '$.batchNo',
            MfgDate    DATE          PATH '$.mfgDate',
            ExpiryDate DATE          PATH '$.expiryDate',
            Quantity   DECIMAL(14,3) PATH '$.quantity',
            Rate       DECIMAL(14,4) PATH '$.rate',
            Uom        VARCHAR(50)   PATH '$.uom',
            Remarks    VARCHAR(255)  PATH '$.remarks'
        )) jt
        LEFT JOIN admin.Master_Item m ON m.ItemId = jt.ItemId;

        -- Post each line to stock + ledger.
        BEGIN
            DECLARE cur CURSOR FOR
                SELECT ItemId, BatchNo, MfgDate, ExpiryDate, Quantity, Rate, Uom, Remarks
                FROM inventory.Inventory_DocumentItem WHERE DocId = v_docId;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

            OPEN cur;
            read_loop: LOOP
                FETCH cur INTO v_itemId, v_batch, v_mfg, v_exp, v_qty, v_rate, v_uom, v_lineRemarks;
                IF v_done = 1 THEN
                    LEAVE read_loop;
                END IF;

                IF p_DocType = 'RECEIPT' THEN
                    CALL inventory.SpInvStockPost(v_itemId, p_ToStoreId, v_batch, v_mfg, v_exp,
                        v_qty, v_rate, v_uom, 'RECEIPT', v_docId, v_docNo, p_DocType, v_lineRemarks, p_User);

                ELSEIF p_DocType = 'ISSUE' THEN
                    CALL inventory.SpInvStockPost(v_itemId, p_FromStoreId, v_batch, NULL, NULL,
                        -v_qty, 0, v_uom, 'ISSUE', v_docId, v_docNo, p_DocType, v_lineRemarks, p_User);

                ELSEIF p_DocType = 'TRANSFER' THEN
                    -- Out of the source at its own cost, then into the destination
                    -- at that same cost so value is preserved across stores.
                    CALL inventory.SpInvStockPost(v_itemId, p_FromStoreId, v_batch, NULL, NULL,
                        -v_qty, 0, v_uom, 'TRANSFER_OUT', v_docId, v_docNo, p_DocType, v_lineRemarks, p_User);
                    SET @xrate = (SELECT ValuationRate FROM inventory.Inventory_Stock
                                  WHERE ItemId = v_itemId AND StoreId = p_FromStoreId AND BatchNo = v_batch);
                    CALL inventory.SpInvStockPost(v_itemId, p_ToStoreId, v_batch, v_mfg, v_exp,
                        v_qty, COALESCE(@xrate, 0), v_uom, 'TRANSFER_IN', v_docId, v_docNo, p_DocType, v_lineRemarks, p_User);

                ELSEIF p_DocType = 'RETURN' THEN
                    CALL inventory.SpInvStockPost(v_itemId, p_ToStoreId, v_batch, v_mfg, v_exp,
                        v_qty, v_rate, v_uom, 'RETURN', v_docId, v_docNo, p_DocType, v_lineRemarks, p_User);

                ELSEIF p_DocType = 'ADJUSTMENT' THEN
                    -- Quantity is the signed delta: negative writes stock off.
                    CALL inventory.SpInvStockPost(v_itemId, p_FromStoreId, v_batch, v_mfg, v_exp,
                        v_qty, v_rate, v_uom,
                        IF(v_qty < 0, 'WRITEOFF', 'ADJUSTMENT'), v_docId, v_docNo, p_DocType, v_lineRemarks, p_User);
                END IF;
            END LOOP;
            CLOSE cur;
        END;

        UPDATE inventory.Inventory_Document d
        SET TotalItems = (SELECT COUNT(*) FROM inventory.Inventory_DocumentItem WHERE DocId = v_docId),
            TotalQty   = (SELECT COALESCE(SUM(ABS(Quantity)), 0) FROM inventory.Inventory_DocumentItem WHERE DocId = v_docId),
            TotalValue = (SELECT COALESCE(SUM(ABS(Value)), 0) FROM inventory.Inventory_DocumentItem WHERE DocId = v_docId)
        WHERE d.DocId = v_docId;

        SELECT v_docId AS DocId, v_docNo AS DocNumber;

    ELSEIF p_Opt = 'DELETE' THEN
        -- Documents are the audit trail; deleting one does NOT reverse stock.
        DELETE FROM inventory.Inventory_Document WHERE DocId = p_DocId;
        SELECT p_DocId AS DocId;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpInvStock  (LOTS | LOWSTOCK | EXPIRY | LEDGER | VALUATION | ITEMLOTS)
-- ============================================================
DROP PROCEDURE IF EXISTS inventory.SpInvStock;
DELIMITER $$
CREATE PROCEDURE inventory.SpInvStock(
    IN p_Opt VARCHAR(20),
    IN p_StoreId INT,
    IN p_ItemId INT,
    IN p_Days INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE
)
BEGIN
    IF p_Opt = 'LOTS' THEN
        SELECT s.StockId, s.ItemId, i.ItemCode, i.ItemName, i.Category, i.SubCategory,
               i.Brand, i.Manufacturer, s.StoreId, st.StoreName, s.BatchNo, s.MfgDate, s.ExpiryDate,
               s.Quantity, s.ReservedQty, s.ValuationRate,
               ROUND(s.Quantity * s.ValuationRate, 2) AS StockValue,
               COALESCE(s.Uom, i.Uom) AS Uom, i.ReorderLevel, i.MinStock, i.MaxStock
        FROM inventory.Inventory_Stock s
        JOIN admin.Master_Item i  ON i.ItemId = s.ItemId
        JOIN admin.Master_Store st ON st.StoreId = s.StoreId
        WHERE (p_StoreId IS NULL OR s.StoreId = p_StoreId)
          AND (p_ItemId  IS NULL OR s.ItemId  = p_ItemId)
        ORDER BY i.ItemName, s.ExpiryDate;

    ELSEIF p_Opt = 'ITEMLOTS' THEN
        -- Issuable lots for a store, nearest expiry first (FEFO), expired excluded.
        SELECT s.StockId, s.ItemId, i.ItemCode, i.ItemName, i.Category, s.BatchNo,
               s.ExpiryDate, s.Quantity, s.ValuationRate, COALESCE(s.Uom, i.Uom) AS Uom
        FROM inventory.Inventory_Stock s
        JOIN admin.Master_Item i ON i.ItemId = s.ItemId
        WHERE s.StoreId = p_StoreId AND s.Quantity > 0
          AND (s.ExpiryDate IS NULL OR s.ExpiryDate >= CURDATE())
        ORDER BY i.ItemName, s.ExpiryDate IS NULL, s.ExpiryDate;

    ELSEIF p_Opt = 'LOWSTOCK' THEN
        SELECT i.ItemId, i.ItemCode, i.ItemName, i.Category, i.ReorderLevel, i.Uom,
               COALESCE(SUM(s.Quantity), 0) AS Quantity,
               i.ReorderLevel - COALESCE(SUM(s.Quantity), 0) AS Deficit
        FROM admin.Master_Item i
        LEFT JOIN inventory.Inventory_Stock s ON s.ItemId = i.ItemId
             AND (p_StoreId IS NULL OR s.StoreId = p_StoreId)
        WHERE i.IsDeleted = 0 AND i.Status = 'Active' AND i.ReorderLevel IS NOT NULL
        GROUP BY i.ItemId, i.ItemCode, i.ItemName, i.Category, i.ReorderLevel, i.Uom
        HAVING Quantity <= i.ReorderLevel
        ORDER BY Deficit DESC;

    ELSEIF p_Opt = 'EXPIRY' THEN
        SELECT s.StockId, i.ItemId, i.ItemCode, i.ItemName, i.Category, st.StoreName,
               s.BatchNo, s.MfgDate, s.ExpiryDate, s.Quantity, COALESCE(s.Uom, i.Uom) AS Uom,
               DATEDIFF(s.ExpiryDate, CURDATE()) AS DaysToExpiry
        FROM inventory.Inventory_Stock s
        JOIN admin.Master_Item i  ON i.ItemId = s.ItemId
        JOIN admin.Master_Store st ON st.StoreId = s.StoreId
        WHERE s.ExpiryDate IS NOT NULL AND s.Quantity > 0
          AND s.ExpiryDate <= DATE_ADD(CURDATE(), INTERVAL COALESCE(p_Days, 90) DAY)
          AND (p_StoreId IS NULL OR s.StoreId = p_StoreId)
        ORDER BY s.ExpiryDate;

    ELSEIF p_Opt = 'LEDGER' THEN
        SELECT * FROM inventory.Inventory_StockLedger
        WHERE (p_StoreId IS NULL OR StoreId = p_StoreId)
          AND (p_ItemId  IS NULL OR ItemId  = p_ItemId)
          AND (p_FromDate IS NULL OR DATE(TxnDate) >= p_FromDate)
          AND (p_ToDate   IS NULL OR DATE(TxnDate) <= p_ToDate)
        ORDER BY LedgerId DESC;

    ELSEIF p_Opt = 'VALUATION' THEN
        SELECT i.Category,
               COUNT(DISTINCT s.ItemId) AS ItemCount,
               COALESCE(SUM(s.Quantity), 0) AS TotalQty,
               ROUND(COALESCE(SUM(s.Quantity * s.ValuationRate), 0), 2) AS TotalValue
        FROM inventory.Inventory_Stock s
        JOIN admin.Master_Item i ON i.ItemId = s.ItemId
        WHERE (p_StoreId IS NULL OR s.StoreId = p_StoreId)
        GROUP BY i.Category
        ORDER BY TotalValue DESC;
    END IF;
END$$
DELIMITER ;
