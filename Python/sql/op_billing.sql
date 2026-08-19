CREATE TABLE IF NOT EXISTS hospital.OpBill (
    OpBillId INT AUTO_INCREMENT PRIMARY KEY,
    BillNumber VARCHAR(20) NOT NULL UNIQUE,
    Uhid VARCHAR(20) NOT NULL,
    PatientName VARCHAR(100) NOT NULL,
    MobileNumber VARCHAR(10) NOT NULL,
    BillDate DATETIME NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    Discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    Tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    NetAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    PaymentMode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    PaymentStatus VARCHAR(50) NOT NULL DEFAULT 'Pending',
    CreatedBy VARCHAR(50) DEFAULT 'System',
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospital.OpBillItem (
    OpBillItemId INT AUTO_INCREMENT PRIMARY KEY,
    OpBillId INT NOT NULL,
    ItemCode VARCHAR(50),
    ItemDescription VARCHAR(200) NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    UnitPrice DECIMAL(10, 2) NOT NULL DEFAULT 0,
    Subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    FOREIGN KEY (OpBillId) REFERENCES hospital.OpBill(OpBillId) ON DELETE CASCADE
);

DELIMITER //
DROP PROCEDURE IF EXISTS hospital.SpOpBilling//

CREATE PROCEDURE hospital.SpOpBilling (
    IN p_Opt VARCHAR(50),
    IN p_OpBillId INT,
    IN p_BillNumber VARCHAR(20),
    IN p_Uhid VARCHAR(20),
    IN p_PatientName VARCHAR(100),
    IN p_MobileNumber VARCHAR(10),
    IN p_BillDate DATETIME,
    IN p_TotalAmount DECIMAL(10, 2),
    IN p_Discount DECIMAL(10, 2),
    IN p_Tax DECIMAL(10, 2),
    IN p_NetAmount DECIMAL(10, 2),
    IN p_PaymentMode VARCHAR(50),
    IN p_PaymentStatus VARCHAR(50),
    IN p_ItemCode VARCHAR(50),
    IN p_ItemDescription VARCHAR(200),
    IN p_Quantity INT,
    IN p_UnitPrice DECIMAL(10, 2),
    IN p_Subtotal DECIMAL(10, 2),
    IN p_CreatedBy VARCHAR(50)
)
BEGIN
    IF p_Opt = 'INSERT_BILL' THEN
        INSERT INTO hospital.OpBill (
            BillNumber, Uhid, PatientName, MobileNumber, BillDate,
            TotalAmount, Discount, Tax, NetAmount, PaymentMode, PaymentStatus, CreatedBy, CreatedDate
        )
        VALUES (
            p_BillNumber, p_Uhid, p_PatientName, p_MobileNumber, COALESCE(p_BillDate, NOW()),
            p_TotalAmount, p_Discount, p_Tax, p_NetAmount, p_PaymentMode, p_PaymentStatus, p_CreatedBy, NOW()
        );
        SELECT LAST_INSERT_ID() AS OpBillId;
        
    ELSEIF p_Opt = 'INSERT_BILL_ITEM' THEN
        INSERT INTO hospital.OpBillItem (
            OpBillId, ItemCode, ItemDescription, Quantity, UnitPrice, Subtotal
        )
        VALUES (
            p_OpBillId, p_ItemCode, p_ItemDescription, p_Quantity, p_UnitPrice, p_Subtotal
        );
        SELECT LAST_INSERT_ID() AS OpBillItemId;
        
    ELSEIF p_Opt = 'GET_ALL_BILLS' THEN
        SELECT 
            OpBillId, BillNumber, Uhid, PatientName, MobileNumber, BillDate,
            TotalAmount, Discount, Tax, NetAmount, PaymentMode, PaymentStatus
        FROM hospital.OpBill
        ORDER BY OpBillId DESC
        LIMIT 100;
        
    ELSEIF p_Opt = 'GET_BILL_ITEMS' THEN
        SELECT 
            OpBillItemId, OpBillId, ItemCode, ItemDescription, Quantity, UnitPrice, Subtotal
        FROM hospital.OpBillItem
        WHERE OpBillId = p_OpBillId;
        
    END IF;
END//
DELIMITER ;
