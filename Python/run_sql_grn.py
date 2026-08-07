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
    CREATE TABLE IF NOT EXISTS `GoodsReceipt` (
        `GrnId` INT AUTO_INCREMENT PRIMARY KEY,
        `GrnNo` VARCHAR(50) NOT NULL,
        `PoNumber` VARCHAR(50) NOT NULL,
        `VendorId` INT NOT NULL,
        `VendorName` VARCHAR(255),
        `Store` VARCHAR(255),
        `ReceivedDate` DATE NOT NULL,
        `InvoiceNumber` VARCHAR(100),
        `InvoiceDate` DATE,
        `TransportDetails` VARCHAR(255),
        `LrNumber` VARCHAR(100),
        `VehicleNumber` VARCHAR(100),
        `Status` VARCHAR(50) DEFAULT 'Draft',
        `QcStatus` VARCHAR(50) DEFAULT 'Pending',
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `IsActive` BOOLEAN DEFAULT 1
    );
    """
    
    part2 = """
    CREATE TABLE IF NOT EXISTS `GoodsReceiptItem` (
        `GrnItemId` INT AUTO_INCREMENT PRIMARY KEY,
        `GrnId` INT NOT NULL,
        `ItemId` INT NOT NULL,
        `ItemName` VARCHAR(255),
        `Category` VARCHAR(100),
        `OrderedQty` INT DEFAULT 0,
        `ReceivedQty` INT DEFAULT 0,
        `AcceptedQty` INT DEFAULT 0,
        `RejectedQty` INT DEFAULT 0,
        `Rate` DECIMAL(15, 2) DEFAULT 0.00,
        `TotalPrice` DECIMAL(15, 2) DEFAULT 0.00,
        `BatchNumber` VARCHAR(100),
        `ExpiryDate` DATE,
        `ManufactureDate` DATE,
        `Remarks` VARCHAR(500),
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`GrnId`) REFERENCES `GoodsReceipt`(`GrnId`) ON DELETE CASCADE
    );
    """
    
    part3 = "DROP PROCEDURE IF EXISTS `SpManageGoodsReceipt`;"
    
    part4 = """
    CREATE PROCEDURE `SpManageGoodsReceipt` (
        IN p_Action VARCHAR(20),
        IN p_GrnId INT,
        IN p_GrnNo VARCHAR(50),
        IN p_PoNumber VARCHAR(50),
        IN p_VendorId INT,
        IN p_VendorName VARCHAR(255),
        IN p_Store VARCHAR(255),
        IN p_ReceivedDate DATE,
        IN p_InvoiceNumber VARCHAR(100),
        IN p_InvoiceDate DATE,
        IN p_TransportDetails VARCHAR(255),
        IN p_LrNumber VARCHAR(100),
        IN p_VehicleNumber VARCHAR(100),
        IN p_Status VARCHAR(50),
        IN p_QcStatus VARCHAR(50),
        IN p_ActionBy VARCHAR(100),
        IN p_ItemsJSON JSON
    )
    BEGIN
        DECLARE v_GrnId INT;
        DECLARE v_Index INT DEFAULT 0;
        DECLARE v_TotalItems INT DEFAULT 0;

        IF p_Action = 'CREATE' THEN
            INSERT INTO `GoodsReceipt` (
                `GrnNo`, `PoNumber`, `VendorId`, `VendorName`, `Store`, 
                `ReceivedDate`, `InvoiceNumber`, `InvoiceDate`, `TransportDetails`, 
                `LrNumber`, `VehicleNumber`, `Status`, `QcStatus`, `CreatedBy`
            ) VALUES (
                p_GrnNo, p_PoNumber, p_VendorId, p_VendorName, p_Store, 
                p_ReceivedDate, p_InvoiceNumber, p_InvoiceDate, p_TransportDetails, 
                p_LrNumber, p_VehicleNumber, p_Status, p_QcStatus, p_ActionBy
            );

            SET v_GrnId = LAST_INSERT_ID();

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `GoodsReceiptItem` (
                        `GrnId`, `ItemId`, `ItemName`, `Category`, `OrderedQty`, 
                        `ReceivedQty`, `AcceptedQty`, `RejectedQty`, `Rate`, `TotalPrice`, 
                        `BatchNumber`, `ExpiryDate`, `ManufactureDate`, `Remarks`, `CreatedBy`
                    ) VALUES (
                        v_GrnId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].orderedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].receivedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].acceptedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].rejectedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].rate'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].totalPrice'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].batchNumber'))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].expiryDate'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].expiryDate')))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].manufactureDate'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].manufactureDate')))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))),
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT v_GrnId AS GrnId, 'Goods Receipt created successfully.' AS Message;

        ELSEIF p_Action = 'UPDATE' THEN
            UPDATE `GoodsReceipt`
            SET
                `GrnNo` = p_GrnNo,
                `PoNumber` = p_PoNumber,
                `VendorId` = p_VendorId,
                `VendorName` = p_VendorName,
                `Store` = p_Store,
                `ReceivedDate` = p_ReceivedDate,
                `InvoiceNumber` = p_InvoiceNumber,
                `InvoiceDate` = p_InvoiceDate,
                `TransportDetails` = p_TransportDetails,
                `LrNumber` = p_LrNumber,
                `VehicleNumber` = p_VehicleNumber,
                `Status` = p_Status,
                `QcStatus` = p_QcStatus,
                `ModifiedBy` = p_ActionBy
            WHERE `GrnId` = p_GrnId;

            DELETE FROM `GoodsReceiptItem` WHERE `GrnId` = p_GrnId;

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `GoodsReceiptItem` (
                        `GrnId`, `ItemId`, `ItemName`, `Category`, `OrderedQty`, 
                        `ReceivedQty`, `AcceptedQty`, `RejectedQty`, `Rate`, `TotalPrice`, 
                        `BatchNumber`, `ExpiryDate`, `ManufactureDate`, `Remarks`, `CreatedBy`, `ModifiedBy`
                    ) VALUES (
                        p_GrnId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].orderedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].receivedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].acceptedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].rejectedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].rate'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].totalPrice'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].batchNumber'))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].expiryDate'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].expiryDate')))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].manufactureDate'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].manufactureDate')))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))),
                        p_ActionBy,
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT p_GrnId AS GrnId, 'Goods Receipt updated successfully.' AS Message;

        ELSEIF p_Action = 'DELETE' THEN
            DELETE FROM `GoodsReceipt` WHERE `GrnId` = p_GrnId;
            SELECT p_GrnId AS GrnId, 'Goods Receipt deleted successfully.' AS Message;
            
        ELSEIF p_Action = 'GET_ALL' THEN
            SELECT * FROM `GoodsReceipt` ORDER BY `GrnId` DESC;

        ELSEIF p_Action = 'GET_BY_ID' THEN
            SELECT * FROM `GoodsReceipt` WHERE `GrnId` = p_GrnId;
            SELECT * FROM `GoodsReceiptItem` WHERE `GrnId` = p_GrnId;
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
        
        print("Successfully created Goods Receipt tables and SP.")

if __name__ == '__main__':
    execute_sql_file()
