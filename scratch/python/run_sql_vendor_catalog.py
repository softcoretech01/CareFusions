import os
import json
import random
from datetime import date, timedelta
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
    CREATE TABLE IF NOT EXISTS `VendorCatalog` (
        `CatalogId` INT AUTO_INCREMENT PRIMARY KEY,
        `VendorId` INT NOT NULL UNIQUE,
        `VendorName` VARCHAR(255),
        `VendorCode` VARCHAR(100),
        `GstNumber` VARCHAR(100),
        `ContactPerson` VARCHAR(255),
        `City` VARCHAR(100),
        `Rating` DECIMAL(3,1) DEFAULT 0.0,
        `ActiveContracts` INT DEFAULT 0,
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `IsActive` BOOLEAN DEFAULT 1
    );
    """
    
    part2 = """
    CREATE TABLE IF NOT EXISTS `VendorCatalogItem` (
        `CatalogItemId` INT AUTO_INCREMENT PRIMARY KEY,
        `CatalogId` INT NOT NULL,
        `ItemId` INT NOT NULL,
        `ItemCode` VARCHAR(100),
        `ItemName` VARCHAR(255),
        `Category` VARCHAR(100),
        `ContractValidUntil` DATE,
        `CatalogPrice` DECIMAL(15, 2) DEFAULT 0.00,
        `LastUpdate` DATE,
        `CreatedBy` VARCHAR(100) DEFAULT 'Admin',
        `CreatedDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `ModifiedBy` VARCHAR(100),
        `ModifiedDate` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`CatalogId`) REFERENCES `VendorCatalog`(`CatalogId`) ON DELETE CASCADE
    );
    """
    
    part3 = "DROP PROCEDURE IF EXISTS `SpManageVendorCatalog`;"
    
    part4 = """
    CREATE PROCEDURE `SpManageVendorCatalog` (
        IN p_Action VARCHAR(20),
        IN p_CatalogId INT,
        IN p_VendorId INT,
        IN p_VendorName VARCHAR(255),
        IN p_VendorCode VARCHAR(100),
        IN p_GstNumber VARCHAR(100),
        IN p_ContactPerson VARCHAR(255),
        IN p_City VARCHAR(100),
        IN p_Rating DECIMAL(3,1),
        IN p_ActiveContracts INT,
        IN p_ActionBy VARCHAR(100),
        IN p_ItemsJSON JSON
    )
    BEGIN
        DECLARE v_CatalogId INT;
        DECLARE v_Index INT DEFAULT 0;
        DECLARE v_TotalItems INT DEFAULT 0;

        IF p_Action = 'CREATE' THEN
            -- Check if exists, if so do UPDATE instead to avoid duplicates since VendorId is UNIQUE
            IF EXISTS (SELECT 1 FROM `VendorCatalog` WHERE `VendorId` = p_VendorId) THEN
                SELECT `CatalogId` INTO v_CatalogId FROM `VendorCatalog` WHERE `VendorId` = p_VendorId;
                
                UPDATE `VendorCatalog`
                SET
                    `VendorName` = p_VendorName,
                    `VendorCode` = p_VendorCode,
                    `GstNumber` = p_GstNumber,
                    `ContactPerson` = p_ContactPerson,
                    `City` = p_City,
                    `Rating` = p_Rating,
                    `ActiveContracts` = p_ActiveContracts,
                    `ModifiedBy` = p_ActionBy
                WHERE `CatalogId` = v_CatalogId;

                DELETE FROM `VendorCatalogItem` WHERE `CatalogId` = v_CatalogId;
                
            ELSE
                INSERT INTO `VendorCatalog` (
                    `VendorId`, `VendorName`, `VendorCode`, `GstNumber`, `ContactPerson`, 
                    `City`, `Rating`, `ActiveContracts`, `CreatedBy`
                ) VALUES (
                    p_VendorId, p_VendorName, p_VendorCode, p_GstNumber, p_ContactPerson, 
                    p_City, p_Rating, p_ActiveContracts, p_ActionBy
                );
                SET v_CatalogId = LAST_INSERT_ID();
            END IF;

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `VendorCatalogItem` (
                        `CatalogId`, `ItemId`, `ItemCode`, `ItemName`, `Category`, 
                        `ContractValidUntil`, `CatalogPrice`, `LastUpdate`, `CreatedBy`
                    ) VALUES (
                        v_CatalogId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemCode'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].contractValidUntil'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].contractValidUntil')))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].catalogPrice'))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].lastUpdate'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].lastUpdate')))),
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT v_CatalogId AS CatalogId, 'Vendor Catalog saved successfully.' AS Message;

        ELSEIF p_Action = 'UPDATE' THEN
            UPDATE `VendorCatalog`
            SET
                `VendorName` = p_VendorName,
                `VendorCode` = p_VendorCode,
                `GstNumber` = p_GstNumber,
                `ContactPerson` = p_ContactPerson,
                `City` = p_City,
                `Rating` = p_Rating,
                `ActiveContracts` = p_ActiveContracts,
                `ModifiedBy` = p_ActionBy
            WHERE `CatalogId` = p_CatalogId;

            DELETE FROM `VendorCatalogItem` WHERE `CatalogId` = p_CatalogId;

            IF p_ItemsJSON IS NOT NULL THEN
                SET v_Index = 0;
                SET v_TotalItems = JSON_LENGTH(p_ItemsJSON);
                WHILE v_Index < v_TotalItems DO
                    INSERT INTO `VendorCatalogItem` (
                        `CatalogId`, `ItemId`, `ItemCode`, `ItemName`, `Category`, 
                        `ContractValidUntil`, `CatalogPrice`, `LastUpdate`, `CreatedBy`, `ModifiedBy`
                    ) VALUES (
                        p_CatalogId,
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemId'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemCode'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].itemName'))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].category'))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].contractValidUntil'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].contractValidUntil')))),
                        JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].catalogPrice'))),
                        IF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].lastUpdate'))) = '', NULL, JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', v_Index, '].lastUpdate')))),
                        p_ActionBy,
                        p_ActionBy
                    );
                    SET v_Index = v_Index + 1;
                END WHILE;
            END IF;

            SELECT p_CatalogId AS CatalogId, 'Vendor Catalog updated successfully.' AS Message;

        ELSEIF p_Action = 'DELETE' THEN
            DELETE FROM `VendorCatalog` WHERE `CatalogId` = p_CatalogId;
            SELECT p_CatalogId AS CatalogId, 'Vendor Catalog deleted successfully.' AS Message;
            
        ELSEIF p_Action = 'GET_ALL' THEN
            SELECT * FROM `VendorCatalog` ORDER BY `CatalogId` DESC;

        ELSEIF p_Action = 'GET_BY_ID' THEN
            SELECT * FROM `VendorCatalog` WHERE `CatalogId` = p_CatalogId;
            SELECT * FROM `VendorCatalogItem` WHERE `CatalogId` = p_CatalogId;
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
        
        print("Successfully created Vendor Catalog tables and SP.")
        
        # Seed Data
        print("Seeding Catalog Data from existing master tables...")
        try:
            vendors_query = text("SELECT VendorId, VendorName, VendorCode, GstNumber, ContactPerson, City FROM admin.Master_Vendor LIMIT 5")
            vendors = conn.execute(vendors_query).fetchall()
            
            items_query = text("SELECT ItemId, ItemCode, ItemName, Category FROM admin.Master_Item")
            items = conn.execute(items_query).fetchall()
            
            if vendors and items:
                for vendor in vendors:
                    catalog_query = text("SELECT CatalogId FROM `VendorCatalog` WHERE VendorId = :vid")
                    exists = conn.execute(catalog_query, {"vid": vendor.VendorId}).fetchone()
                    if not exists:
                        num_items = random.randint(3, min(6, len(items)))
                        selected_items = random.sample(list(items), num_items)
                        
                        items_list = []
                        for it in selected_items:
                            items_list.append({
                                "itemId": it.ItemId,
                                "itemCode": it.ItemCode,
                                "itemName": it.ItemName,
                                "category": it.Category,
                                "contractValidUntil": (date.today() + timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d"),
                                "catalogPrice": round(random.uniform(10.0, 500.0), 2),
                                "lastUpdate": date.today().strftime("%Y-%m-%d")
                            })
                        
                        sp_query = text(f"""
                            CALL SpManageVendorCatalog(
                                'CREATE', 0, :vId, :vName, :vCode, :gst, :contact, :city,
                                :rating, :contracts, 'Admin', :itemsJson
                            )
                        """)
                        conn.execute(sp_query, {
                            "vId": vendor.VendorId,
                            "vName": vendor.VendorName,
                            "vCode": vendor.VendorCode,
                            "gst": vendor.GstNumber,
                            "contact": vendor.ContactPerson,
                            "city": vendor.City,
                            "rating": round(random.uniform(3.0, 5.0), 1),
                            "contracts": random.randint(1, 5),
                            "itemsJson": json.dumps(items_list)
                        })
                conn.commit()
                print("Successfully seeded Vendor Catalog.")
            else:
                print("No vendors or items found to seed.")
        except Exception as e:
            print(f"Skipping seed due to error: {e}")

if __name__ == '__main__':
    execute_sql_file()
