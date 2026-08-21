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
    CREATE TABLE IF NOT EXISTS `VendorQuotation` (
        `QuotationId` INT AUTO_INCREMENT PRIMARY KEY,
        `QuotationNo` VARCHAR(50) NOT NULL,
        `RfqNo` VARCHAR(50) NOT NULL,
        `VendorId` INT NOT NULL,
        `VendorName` VARCHAR(255),
        `QuotationDate` DATE NOT NULL,
        `ValidityDate` DATE NOT NULL,
        `PaymentTerms` VARCHAR(255),
        `DeliveryDays` INT DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS `VendorQuotationItem` (
        `QuotationItemId` INT AUTO_INCREMENT PRIMARY KEY,
        `QuotationId` INT NOT NULL,
        `ItemId` INT NOT NULL,
        `ItemType` VARCHAR(20) NULL,
        `ItemName` VARCHAR(255),
        `Category` VARCHAR(100),
        `Qty` INT NOT NULL,
        `QuotedRate` DECIMAL(15, 2) DEFAULT 0.00,
        `DiscountPercentage` DECIMAL(5, 2) DEFAULT 0.00,
        `GstPercentage` DECIMAL(5, 2) DEFAULT 0.00,
        `FinalAmount` DECIMAL(15, 2) DEFAULT 0.00,
        `Remarks` VARCHAR(500),
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`QuotationId`) REFERENCES `VendorQuotation`(`QuotationId`) ON DELETE CASCADE
    );
    """
    
    part3 = "DROP PROCEDURE IF EXISTS `SpManageVendorQuotation`;"
    
    part4 = """
    CREATE PROCEDURE `SpManageVendorQuotation` (
        IN p_Action VARCHAR(20),
        IN p_QuotationId INT,
        IN p_QuotationNo VARCHAR(50),
        IN p_RfqNo VARCHAR(50),
        IN p_VendorId INT,
        IN p_VendorName VARCHAR(255),
        IN p_QuotationDate DATE,
        IN p_ValidityDate DATE,
        IN p_PaymentTerms VARCHAR(255),
        IN p_DeliveryDays INT,
        IN p_TotalAmount DECIMAL(15, 2),
        IN p_Status VARCHAR(50),
        IN p_ActionBy VARCHAR(100),
        IN p_ItemsJSON JSON
    )
    BEGIN
        DECLARE v_QuotationId INT;
        DECLARE v_Index INT DEFAULT 0;
        DECLARE v_TotalItems INT DEFAULT 0;

        IF p_Action = 'CREATE' THEN
            INSERT INTO `VendorQuotation` (
                `QuotationNo`, `RfqNo`, `VendorId`, `VendorName`, `QuotationDate`, 
                `ValidityDate`, `PaymentTerms`, `DeliveryDays`, `TotalAmount`, 
                `Status`, `CreatedBy`
            ) VALUES (
                p_QuotationNo, p_RfqNo, p_VendorId, p_VendorName, p_QuotationDate,
                p_ValidityDate, p_PaymentTerms, p_DeliveryDays, p_TotalAmount,
                p_Status, p_ActionBy
            );

            SET v_QuotationId = LAST_INSERT_ID();

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `VendorQuotationItem` (
                        `QuotationId`, `ItemId`, `ItemType`, `ItemName`, `Category`, `Qty`, 
                        `QuotedRate`, `DiscountPercentage`, `GstPercentage`, `FinalAmount`, 
                        `Remarks`, `CreatedBy`
                    ) VALUES (
                        v_QuotationId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemType'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].qty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].quotedRate'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].discountPercentage'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].gstPercentage'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].finalAmount'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))),
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT v_QuotationId AS QuotationId, 'Quotation created successfully.' AS Message;

        ELSEIF p_Action = 'UPDATE' THEN
            UPDATE `VendorQuotation`
            SET
                `QuotationNo` = p_QuotationNo,
                `RfqNo` = p_RfqNo,
                `VendorId` = p_VendorId,
                `VendorName` = p_VendorName,
                `QuotationDate` = p_QuotationDate,
                `ValidityDate` = p_ValidityDate,
                `PaymentTerms` = p_PaymentTerms,
                `DeliveryDays` = p_DeliveryDays,
                `TotalAmount` = p_TotalAmount,
                `Status` = p_Status,
                `ModifiedBy` = p_ActionBy
            WHERE `QuotationId` = p_QuotationId;

            DELETE FROM `VendorQuotationItem` WHERE `QuotationId` = p_QuotationId;

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `VendorQuotationItem` (
                        `QuotationId`, `ItemId`, `ItemType`, `ItemName`, `Category`, `Qty`, 
                        `QuotedRate`, `DiscountPercentage`, `GstPercentage`, `FinalAmount`, 
                        `Remarks`, `CreatedBy`, `ModifiedBy`
                    ) VALUES (
                        p_QuotationId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemType'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].qty'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].quotedRate'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].discountPercentage'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].gstPercentage'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].finalAmount'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].remarks'))),
                        p_ActionBy,
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT p_QuotationId AS QuotationId, 'Quotation updated successfully.' AS Message;

        ELSEIF p_Action = 'DELETE' THEN
            DELETE FROM `VendorQuotation` WHERE `QuotationId` = p_QuotationId;
            SELECT p_QuotationId AS QuotationId, 'Quotation deleted successfully.' AS Message;

        ELSEIF p_Action = 'GET_ALL' THEN
            SELECT * FROM `VendorQuotation` ORDER BY `QuotationId` DESC;

        ELSEIF p_Action = 'GET_BY_ID' THEN
            SELECT * FROM `VendorQuotation` WHERE `QuotationId` = p_QuotationId;
            SELECT * FROM `VendorQuotationItem` WHERE `QuotationId` = p_QuotationId;
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
        
        print("Successfully created Vendor Quotation tables and SP.")

if __name__ == '__main__':
    execute_sql_file()
