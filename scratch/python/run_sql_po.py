import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASSWORD", "root")
DB_NAME = "inventory"
DB_PORT = os.getenv("DB_PORT", "3306")

def execute_sql_file():
    engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    part1 = """
    CREATE TABLE IF NOT EXISTS `PurchaseOrder` (
        `PoId` INT AUTO_INCREMENT PRIMARY KEY,
        `PoNumber` VARCHAR(50) NOT NULL,
        `PoDate` DATE NOT NULL,
        `PrNo` VARCHAR(50),
        `QuotationNo` VARCHAR(50),
        `VendorId` INT NOT NULL,
        `VendorName` VARCHAR(255),
        `Department` VARCHAR(100),
        `BillingAddress` VARCHAR(500),
        `ShippingAddress` VARCHAR(500),
        `PaymentTerms` VARCHAR(255),
        `DeliveryTerms` VARCHAR(255),
        `ExpectedDelivery` DATE NOT NULL,
        `Currency` VARCHAR(50) DEFAULT 'INR',
        `TotalAmount` DECIMAL(15, 2) DEFAULT 0.00,
        `Status` VARCHAR(50) DEFAULT 'Draft',
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `IsActive` BOOLEAN DEFAULT 1
    );
    """
    
    part2 = """
    CREATE TABLE IF NOT EXISTS `PurchaseOrderItem` (
        `PoItemId` INT AUTO_INCREMENT PRIMARY KEY,
        `PoId` INT NOT NULL,
        `ItemId` INT NOT NULL,
        `ItemName` VARCHAR(255),
        `Category` VARCHAR(100),
        `OrderedQty` INT NOT NULL,
        `Uom` VARCHAR(50),
        `Rate` DECIMAL(15, 2) DEFAULT 0.00,
        `Discount` DECIMAL(5, 2) DEFAULT 0.00,
        `Gst` DECIMAL(5, 2) DEFAULT 0.00,
        `Amount` DECIMAL(15, 2) DEFAULT 0.00,
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`PoId`) REFERENCES `PurchaseOrder`(`PoId`) ON DELETE CASCADE
    );
    """
    
    part3 = "DROP PROCEDURE IF EXISTS `SpManagePurchaseOrder`;"
    
    part4 = """
    CREATE PROCEDURE `SpManagePurchaseOrder` (
        IN p_Action VARCHAR(20),
        IN p_PoId INT,
        IN p_PoNumber VARCHAR(50),
        IN p_PoDate DATE,
        IN p_PrNo VARCHAR(50),
        IN p_QuotationNo VARCHAR(50),
        IN p_VendorId INT,
        IN p_VendorName VARCHAR(255),
        IN p_Department VARCHAR(100),
        IN p_BillingAddress VARCHAR(500),
        IN p_ShippingAddress VARCHAR(500),
        IN p_PaymentTerms VARCHAR(255),
        IN p_DeliveryTerms VARCHAR(255),
        IN p_ExpectedDelivery DATE,
        IN p_Currency VARCHAR(50),
        IN p_TotalAmount DECIMAL(15, 2),
        IN p_Status VARCHAR(50),
        IN p_ActionBy VARCHAR(100),
        IN p_ItemsJSON JSON
    )
    BEGIN
        DECLARE v_PoId INT;
        DECLARE v_Index INT DEFAULT 0;
        DECLARE v_TotalItems INT DEFAULT 0;

        IF p_Action = 'CREATE' THEN
            INSERT INTO `PurchaseOrder` (
                `PoNumber`, `PoDate`, `PrNo`, `QuotationNo`, `VendorId`, 
                `VendorName`, `Department`, `BillingAddress`, `ShippingAddress`, 
                `PaymentTerms`, `DeliveryTerms`, `ExpectedDelivery`, `Currency`, 
                `TotalAmount`, `Status`, `CreatedBy`
            ) VALUES (
                p_PoNumber, p_PoDate, p_PrNo, p_QuotationNo, p_VendorId, 
                p_VendorName, p_Department, p_BillingAddress, p_ShippingAddress, 
                p_PaymentTerms, p_DeliveryTerms, p_ExpectedDelivery, p_Currency, 
                p_TotalAmount, p_Status, p_ActionBy
            );

            SET v_PoId = LAST_INSERT_ID();

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `PurchaseOrderItem` (
                        `PoId`, `ItemId`, `ItemType`, `ItemName`, `Category`, `OrderedQty`, 
                        `Uom`, `Rate`, `Discount`, `Gst`, `Amount`, `CreatedBy`
                    ) VALUES (
                        v_PoId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemType'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].orderedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].uom'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].rate'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].discount'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].gst'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].amount'))),
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT v_PoId AS PoId, 'Purchase Order created successfully.' AS Message;

        ELSEIF p_Action = 'UPDATE' THEN
            UPDATE `PurchaseOrder`
            SET
                `PoNumber` = p_PoNumber,
                `PoDate` = p_PoDate,
                `PrNo` = p_PrNo,
                `QuotationNo` = p_QuotationNo,
                `VendorId` = p_VendorId,
                `VendorName` = p_VendorName,
                `Department` = p_Department,
                `BillingAddress` = p_BillingAddress,
                `ShippingAddress` = p_ShippingAddress,
                `PaymentTerms` = p_PaymentTerms,
                `DeliveryTerms` = p_DeliveryTerms,
                `ExpectedDelivery` = p_ExpectedDelivery,
                `Currency` = p_Currency,
                `TotalAmount` = p_TotalAmount,
                `Status` = p_Status,
                `ModifiedBy` = p_ActionBy
            WHERE `PoId` = p_PoId;

            DELETE FROM `PurchaseOrderItem` WHERE `PoId` = p_PoId;

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `PurchaseOrderItem` (
                        `PoId`, `ItemId`, `ItemType`, `ItemName`, `Category`, `OrderedQty`, 
                        `Uom`, `Rate`, `Discount`, `Gst`, `Amount`, `CreatedBy`, `ModifiedBy`
                    ) VALUES (
                        p_PoId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemType'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].orderedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].uom'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].rate'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].discount'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].gst'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].amount'))),
                        p_ActionBy,
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT p_PoId AS PoId, 'Purchase Order updated successfully.' AS Message;

        ELSEIF p_Action = 'DELETE' THEN
            DELETE FROM `PurchaseOrder` WHERE `PoId` = p_PoId;
            SELECT p_PoId AS PoId, 'Purchase Order deleted successfully.' AS Message;

        ELSEIF p_Action = 'APPROVE' THEN
            UPDATE `PurchaseOrder`
            SET `Status` = 'Approved',
                `ModifiedBy` = p_ActionBy,
                `ModifiedDate` = CURRENT_TIMESTAMP
            WHERE `PoId` = p_PoId;
            SELECT p_PoId AS PoId, 'Purchase Order approved successfully.' AS Message;
            
        ELSEIF p_Action = 'GET_ALL' THEN
            SELECT * FROM `PurchaseOrder` ORDER BY `PoId` DESC;

        ELSEIF p_Action = 'GET_BY_ID' THEN
            SELECT * FROM `PurchaseOrder` WHERE `PoId` = p_PoId;
            SELECT * FROM `PurchaseOrderItem` WHERE `PoId` = p_PoId;
        END IF;
    END;
    """

    with engine.begin() as conn:
        print("Creating Tables...")
        conn.execute(text(part1))
        conn.execute(text(part2))
        
        print("Creating SP...")
        conn.execute(text(part3))
        conn.execute(text(part4))
        
        print("Successfully created Purchase Order tables and SP.")

if __name__ == '__main__':
    execute_sql_file()
