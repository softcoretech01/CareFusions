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
    CREATE TABLE IF NOT EXISTS `PurchaseReturn` (
        `ReturnId` INT AUTO_INCREMENT PRIMARY KEY,
        `ReturnNo` VARCHAR(50) NOT NULL UNIQUE,
        `GrnNo` VARCHAR(50) NOT NULL,
        `VendorId` INT NOT NULL,
        `VendorName` VARCHAR(255),
        `Store` VARCHAR(255),
        `ReturnDate` DATE NOT NULL,
        `Reason` VARCHAR(255),
        `Status` VARCHAR(50) DEFAULT 'Draft',
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `IsActive` BOOLEAN DEFAULT 1
    );
    """
    
    part2 = """
    CREATE TABLE IF NOT EXISTS `PurchaseReturnItem` (
        `ReturnItemId` INT AUTO_INCREMENT PRIMARY KEY,
        `ReturnId` INT NOT NULL,
        `ItemId` INT NOT NULL,
        `ItemName` VARCHAR(255),
        `ReceivedQty` INT DEFAULT 0,
        `ReturnQty` INT DEFAULT 0,
        `Reason` VARCHAR(255),
        `Remarks` VARCHAR(500),
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`ReturnId`) REFERENCES `PurchaseReturn`(`ReturnId`) ON DELETE CASCADE
    );
    """
    
    part3 = "DROP PROCEDURE IF EXISTS `SpManagePurchaseReturn`;"
    
    part4 = """
    CREATE PROCEDURE `SpManagePurchaseReturn` (
        IN p_Action VARCHAR(20),
        IN p_ReturnId INT,
        IN p_ReturnNo VARCHAR(50),
        IN p_GrnNo VARCHAR(50),
        IN p_VendorId INT,
        IN p_VendorName VARCHAR(255),
        IN p_Store VARCHAR(255),
        IN p_ReturnDate DATE,
        IN p_Reason VARCHAR(255),
        IN p_Status VARCHAR(50),
        IN p_ActionBy VARCHAR(100),
        IN p_ItemsJSON JSON
    )
    BEGIN
        DECLARE v_ReturnId INT;
        DECLARE v_Index INT DEFAULT 0;
        DECLARE v_TotalItems INT DEFAULT 0;

        IF p_Action = 'CREATE' THEN
            INSERT INTO `PurchaseReturn` (
                `ReturnNo`, `GrnNo`, `VendorId`, `VendorName`, `Store`, 
                `ReturnDate`, `Reason`, `Status`, `CreatedBy`
            ) VALUES (
                p_ReturnNo, p_GrnNo, p_VendorId, p_VendorName, p_Store, 
                p_ReturnDate, p_Reason, p_Status, p_ActionBy
            );

            SET v_ReturnId = LAST_INSERT_ID();

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `PurchaseReturnItem` (
                        `ReturnId`, `ItemId`, `ItemName`, `ReceivedQty`, 
                        `ReturnQty`, `Reason`, `Remarks`, `CreatedBy`
                    ) VALUES (
                        v_ReturnId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].receivedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].returnQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].reason'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))),
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT v_ReturnId AS ReturnId, 'Purchase Return created successfully.' AS Message;

        ELSEIF p_Action = 'UPDATE' THEN
            UPDATE `PurchaseReturn`
            SET
                `ReturnNo` = p_ReturnNo,
                `GrnNo` = p_GrnNo,
                `VendorId` = p_VendorId,
                `VendorName` = p_VendorName,
                `Store` = p_Store,
                `ReturnDate` = p_ReturnDate,
                `Reason` = p_Reason,
                `Status` = p_Status,
                `ModifiedBy` = p_ActionBy
            WHERE `ReturnId` = p_ReturnId;

            DELETE FROM `PurchaseReturnItem` WHERE `ReturnId` = p_ReturnId;

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `PurchaseReturnItem` (
                        `ReturnId`, `ItemId`, `ItemName`, `ReceivedQty`, 
                        `ReturnQty`, `Reason`, `Remarks`, `CreatedBy`, `ModifiedBy`
                    ) VALUES (
                        p_ReturnId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].receivedQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].returnQty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].reason'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))),
                        p_ActionBy,
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT p_ReturnId AS ReturnId, 'Purchase Return updated successfully.' AS Message;

        ELSEIF p_Action = 'DELETE' THEN
            DELETE FROM `PurchaseReturn` WHERE `ReturnId` = p_ReturnId;
            SELECT p_ReturnId AS ReturnId, 'Purchase Return deleted successfully.' AS Message;
            
        ELSEIF p_Action = 'GET_ALL' THEN
            SELECT * FROM `PurchaseReturn` ORDER BY `ReturnId` DESC;

        ELSEIF p_Action = 'GET_BY_ID' THEN
            SELECT * FROM `PurchaseReturn` WHERE `ReturnId` = p_ReturnId;
            SELECT * FROM `PurchaseReturnItem` WHERE `ReturnId` = p_ReturnId;
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
        
        print("Successfully created Purchase Return tables and SP.")

if __name__ == '__main__':
    execute_sql_file()
