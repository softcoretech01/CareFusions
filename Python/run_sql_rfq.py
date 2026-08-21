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
    CREATE TABLE IF NOT EXISTS `RequestForQuotation` (
        `RfqId` INT AUTO_INCREMENT PRIMARY KEY,
        `RfqNo` VARCHAR(50) NOT NULL,
        `RfqDate` DATE NOT NULL,
        `PrNumber` VARCHAR(50) NOT NULL,
        `Department` VARCHAR(100),
        `RequiredDate` DATE,
        `DueDate` DATE NOT NULL,
        `DeliveryLocation` VARCHAR(100),
        `Terms` VARCHAR(1000),
        `VendorCount` INT DEFAULT 0,
        `Status` VARCHAR(50) DEFAULT 'Draft',
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `UpdatedBy` VARCHAR(100),
        `UpdatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `IsActive` BOOLEAN DEFAULT 1
    );
    """
    
    part2 = """
    CREATE TABLE IF NOT EXISTS `RequestForQuotationItem` (
        `RfqItemId` INT AUTO_INCREMENT PRIMARY KEY,
        `RfqId` INT NOT NULL,
        `ItemId` INT NOT NULL,
        `ItemType` VARCHAR(20) NULL,
        `ItemCode` VARCHAR(50),
        `ItemName` VARCHAR(255),
        `Category` VARCHAR(100),
        `RequestedQty` INT NOT NULL,
        `Uom` VARCHAR(50),
        `TargetPrice` DECIMAL(15, 2) DEFAULT 0.00,
        `ExpectedDeliveryDays` INT DEFAULT 0,
        `Remarks` VARCHAR(500),
        FOREIGN KEY (`RfqId`) REFERENCES `RequestForQuotation`(`RfqId`) ON DELETE CASCADE
    );
    """
    
    part3 = """
    CREATE TABLE IF NOT EXISTS `RequestForQuotationVendor` (
        `RfqVendorId` INT AUTO_INCREMENT PRIMARY KEY,
        `RfqId` INT NOT NULL,
        `VendorId` INT NOT NULL,
        FOREIGN KEY (`RfqId`) REFERENCES `RequestForQuotation`(`RfqId`) ON DELETE CASCADE
    );
    """
    
    part4 = "DROP PROCEDURE IF EXISTS `SpManageRequestForQuotation`;"
    
    part5 = """
    CREATE PROCEDURE `SpManageRequestForQuotation` (
        IN p_Action VARCHAR(20),
        IN p_RfqId INT,
        IN p_RfqNo VARCHAR(50),
        IN p_RfqDate DATE,
        IN p_PrNumber VARCHAR(50),
        IN p_Department VARCHAR(100),
        IN p_RequiredDate DATE,
        IN p_DueDate DATE,
        IN p_DeliveryLocation VARCHAR(100),
        IN p_Terms VARCHAR(1000),
        IN p_VendorCount INT,
        IN p_Status VARCHAR(50),
        IN p_CreatedBy VARCHAR(100),
        IN p_ItemsJSON JSON,
        IN p_VendorsJSON JSON
    )
    BEGIN
        DECLARE v_RfqId INT;
        DECLARE v_Index INT DEFAULT 0;
        DECLARE v_TotalItems INT DEFAULT 0;
        DECLARE v_TotalVendors INT DEFAULT 0;

        IF p_Action = 'CREATE' THEN
            INSERT INTO `RequestForQuotation` (
                `RfqNo`, `RfqDate`, `PrNumber`, `Department`, `RequiredDate`, `DueDate`, 
                `DeliveryLocation`, `Terms`, `VendorCount`, `Status`, `CreatedBy`
            ) VALUES (
                p_RfqNo, p_RfqDate, p_PrNumber, p_Department, p_RequiredDate, p_DueDate,
                p_DeliveryLocation, p_Terms, p_VendorCount, p_Status, p_CreatedBy
            );

            SET v_RfqId = LAST_INSERT_ID();

            -- Insert Items
            IF p_ItemsJSON IS NOT NULL THEN
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `RequestForQuotationItem` (
                        `RfqId`, `ItemId`, `ItemType`, `ItemCode`, `ItemName`, `Category`, `RequestedQty`, 
                        `Uom`, `TargetPrice`, `ExpectedDeliveryDays`, `Remarks`
                    ) VALUES (
                        v_RfqId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemType'))),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemCode'))), 'null'),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))), 'null'),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))), 'null'),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].requestedQty'))),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].uom'))), 'null'),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].targetPrice'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].expectedDeliveryDays'))),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))), 'null')
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            -- Insert Vendors
            IF p_VendorsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalVendors = JSON_LENGTH(p_VendorsJSON);
                WHILE v_Index < v_TotalVendors DO
                    INSERT INTO `RequestForQuotationVendor` (
                        `RfqId`, `VendorId`
                    ) VALUES (
                        v_RfqId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_VendorsJSON, CONCAT('$[', v_Index, ']')))
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT v_RfqId AS RfqId, 'RFQ created successfully.' AS Message;

        ELSEIF p_Action = 'UPDATE' THEN
            UPDATE `RequestForQuotation`
            SET
                `RfqNo` = p_RfqNo,
                `RfqDate` = p_RfqDate,
                `PrNumber` = p_PrNumber,
                `Department` = p_Department,
                `RequiredDate` = p_RequiredDate,
                `DueDate` = p_DueDate,
                `DeliveryLocation` = p_DeliveryLocation,
                `Terms` = p_Terms,
                `VendorCount` = p_VendorCount,
                `Status` = p_Status,
                `UpdatedBy` = p_CreatedBy,
                `UpdatedDate` = CURRENT_TIMESTAMP
            WHERE `RfqId` = p_RfqId;

            -- Delete old items and vendors
            DELETE FROM `RequestForQuotationItem` WHERE `RfqId` = p_RfqId;
            DELETE FROM `RequestForQuotationVendor` WHERE `RfqId` = p_RfqId;

            -- Insert Items
            IF p_ItemsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `RequestForQuotationItem` (
                        `RfqId`, `ItemId`, `ItemType`, `ItemCode`, `ItemName`, `Category`, `RequestedQty`, 
                        `Uom`, `TargetPrice`, `ExpectedDeliveryDays`, `Remarks`
                    ) VALUES (
                        p_RfqId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemType'))),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemCode'))), 'null'),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))), 'null'),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))), 'null'),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].requestedQty'))),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].uom'))), 'null'),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].targetPrice'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].expectedDeliveryDays'))),
                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))), 'null')
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            -- Insert Vendors
            IF p_VendorsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalVendors = JSON_LENGTH(p_VendorsJSON);
                WHILE v_Index < v_TotalVendors DO
                    INSERT INTO `RequestForQuotationVendor` (
                        `RfqId`, `VendorId`
                    ) VALUES (
                        p_RfqId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_VendorsJSON, CONCAT('$[', v_Index, ']')))
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT p_RfqId AS RfqId, 'RFQ updated successfully.' AS Message;

        ELSEIF p_Action = 'DELETE' THEN
            DELETE FROM `RequestForQuotation` WHERE `RfqId` = p_RfqId;
            SELECT p_RfqId AS RfqId, 'RFQ deleted successfully.' AS Message;

        ELSEIF p_Action = 'GET_ALL' THEN
            SELECT r.*,
                   (SELECT IFNULL(JSON_ARRAYAGG(
                               JSON_OBJECT(
                                   'id', i.RfqItemId,
                                   'itemId', i.ItemId,
                                   'itemType', i.ItemType,
                                   'itemCode', i.ItemCode,
                                   'itemName', i.ItemName,
                                   'category', i.Category,
                                   'requestedQty', i.RequestedQty,
                                   'uom', i.Uom,
                                   'targetPrice', i.TargetPrice,
                                   'expectedDeliveryDays', i.ExpectedDeliveryDays,
                                   'remarks', i.Remarks
                               )
                           ), '[]')
                    FROM `RequestForQuotationItem` i WHERE i.RfqId = r.RfqId) AS Items,
                   (SELECT IFNULL(JSON_ARRAYAGG(v.VendorId), '[]')
                    FROM `RequestForQuotationVendor` v WHERE v.RfqId = r.RfqId) AS Vendors
            FROM `RequestForQuotation` r 
            ORDER BY r.RfqId DESC;

        ELSEIF p_Action = 'GET_BY_ID' THEN
            SELECT * FROM `RequestForQuotation` WHERE `RfqId` = p_RfqId;
            SELECT * FROM `RequestForQuotationItem` WHERE `RfqId` = p_RfqId;
            SELECT * FROM `RequestForQuotationVendor` WHERE `RfqId` = p_RfqId;
        END IF;
    END;
    """

    with engine.begin() as conn:
        print("Creating Tables...")
        conn.execute(text(part1))
        conn.execute(text(part2))
        conn.execute(text(part3))
        
        print("Creating SP...")
        conn.execute(text(part4))
        conn.execute(text(part5))
        
        print("Successfully created RFQ tables and SP.")

if __name__ == '__main__':
    execute_sql_file()
