import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def execute_sql_file():
    part1 = """
    CREATE DATABASE IF NOT EXISTS inventory;
    """
    
    part2 = """
    USE inventory;
    """

    part3 = """
    CREATE TABLE IF NOT EXISTS inventory.PurchaseRequisition (
        PrId INT AUTO_INCREMENT PRIMARY KEY,
        PrNo VARCHAR(50) NOT NULL,
        RequisitionDate DATE NOT NULL,
        Department VARCHAR(100) NOT NULL,
        InventoryType VARCHAR(20) NULL,      -- MEDICINE | MEDICAL_ITEM | NON_MEDICAL
        RequestedBy VARCHAR(100) NOT NULL,
        Priority VARCHAR(20) DEFAULT 'Normal',
        RequiredDate DATE NOT NULL,
        Purpose VARCHAR(255),
        Remarks VARCHAR(500),
        TotalItems INT DEFAULT 0,
        EstimatedCost DECIMAL(15, 2) DEFAULT 0.00,
        ApprovalStatus VARCHAR(50) DEFAULT 'Draft',
        CurrentStage VARCHAR(50) DEFAULT 'Draft',
        CreatedBy VARCHAR(100) DEFAULT 'Admin',
        CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        IsActive BOOLEAN DEFAULT 1
    );
    """

    part4 = """
    CREATE TABLE IF NOT EXISTS inventory.PurchaseRequisitionItem (
        PrItemId INT AUTO_INCREMENT PRIMARY KEY,
        PrId INT NOT NULL,
        ItemId INT NOT NULL,
        ItemType VARCHAR(20) NULL,           -- owning master for ItemId
        ItemCode VARCHAR(50),
        ItemName VARCHAR(255),
        Category VARCHAR(100),
        SubCategory VARCHAR(100),
        AvailableStock INT DEFAULT 0,
        RequestedQty INT NOT NULL,
        Uom VARCHAR(50),
        EstimatedPrice DECIMAL(15, 2) DEFAULT 0.00,
        EstimatedAmount DECIMAL(15, 2) DEFAULT 0.00,
        Store VARCHAR(100) NOT NULL,
        FOREIGN KEY (PrId) REFERENCES inventory.PurchaseRequisition(PrId) ON DELETE CASCADE
    );
    """
    
    part5 = """
    DROP PROCEDURE IF EXISTS inventory.SpManagePurchaseRequisition;
    """

    part6 = """
    CREATE PROCEDURE inventory.SpManagePurchaseRequisition(
        IN p_Action VARCHAR(20),
        IN p_PrId INT,
        IN p_PrNo VARCHAR(50),
        IN p_RequisitionDate DATE,
        IN p_Department VARCHAR(100),
        IN p_InventoryType VARCHAR(20),
        IN p_RequestedBy VARCHAR(100),
        IN p_Priority VARCHAR(20),
        IN p_RequiredDate DATE,
        IN p_Purpose VARCHAR(255),
        IN p_Remarks VARCHAR(500),
        IN p_TotalItems INT,
        IN p_EstimatedCost DECIMAL(15, 2),
        IN p_ApprovalStatus VARCHAR(50),
        IN p_CurrentStage VARCHAR(50),
        IN p_CreatedBy VARCHAR(100),
        IN p_ItemsJSON JSON
    )
    BEGIN
        DECLARE v_PrId INT;
        DECLARE i INT DEFAULT 0;
        DECLARE item_count INT;
        DECLARE curr_item JSON;

        IF p_Action = 'CREATE' THEN
            INSERT INTO inventory.PurchaseRequisition (
                PrNo, RequisitionDate, Department, InventoryType, RequestedBy, Priority,
                RequiredDate, Purpose, Remarks, TotalItems, EstimatedCost,
                ApprovalStatus, CurrentStage, CreatedBy
            ) VALUES (
                p_PrNo, p_RequisitionDate, p_Department, p_InventoryType, p_RequestedBy, p_Priority,
                p_RequiredDate, p_Purpose, p_Remarks, p_TotalItems, p_EstimatedCost,
                p_ApprovalStatus, p_CurrentStage, p_CreatedBy
            );
            
            SET v_PrId = LAST_INSERT_ID();
            
            IF p_ItemsJSON IS NOT NULL THEN
                SET item_count = JSON_LENGTH(p_ItemsJSON);
                WHILE i < item_count DO
                    SET curr_item = JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', i, ']'));
                    INSERT INTO inventory.PurchaseRequisitionItem (
                        PrId, ItemId, ItemType, ItemCode, ItemName, Category, SubCategory,
                        AvailableStock, RequestedQty, Uom, EstimatedPrice, EstimatedAmount, Store
                    ) VALUES (
                        v_PrId,
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemId')),
                        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemType')), p_InventoryType),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemCode')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemName')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.category')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.subCategory')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.availableStock')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.requestedQty')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.uom')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.estimatedPrice')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.estimatedAmount')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.store'))
                    );
                    SET i = i + 1;
                END WHILE;
            END IF;
            
            SELECT v_PrId AS PrId;
            
        ELSEIF p_Action = 'UPDATE' THEN
            UPDATE inventory.PurchaseRequisition SET
                RequisitionDate = p_RequisitionDate,
                Department = p_Department,
                InventoryType = p_InventoryType,
                RequestedBy = p_RequestedBy,
                Priority = p_Priority,
                RequiredDate = p_RequiredDate,
                Purpose = p_Purpose,
                Remarks = p_Remarks,
                TotalItems = p_TotalItems,
                EstimatedCost = p_EstimatedCost,
                ApprovalStatus = p_ApprovalStatus,
                CurrentStage = p_CurrentStage
            WHERE PrId = p_PrId;
            
            IF p_ItemsJSON IS NOT NULL THEN
                DELETE FROM inventory.PurchaseRequisitionItem WHERE PrId = p_PrId;
                SET item_count = JSON_LENGTH(p_ItemsJSON);
                WHILE i < item_count DO
                    SET curr_item = JSON_EXTRACT(p_ItemsJSON, CONCAT('$[', i, ']'));
                    INSERT INTO inventory.PurchaseRequisitionItem (
                        PrId, ItemId, ItemType, ItemCode, ItemName, Category, SubCategory,
                        AvailableStock, RequestedQty, Uom, EstimatedPrice, EstimatedAmount, Store
                    ) VALUES (
                        p_PrId,
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemId')),
                        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemType')), p_InventoryType),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemCode')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.itemName')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.category')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.subCategory')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.availableStock')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.requestedQty')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.uom')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.estimatedPrice')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.estimatedAmount')),
                        JSON_UNQUOTE(JSON_EXTRACT(curr_item, '$.store'))
                    );
                    SET i = i + 1;
                END WHILE;
            END IF;
            
            SELECT p_PrId AS PrId;
            
        ELSEIF p_Action = 'GET_ALL' THEN
            SELECT * FROM inventory.PurchaseRequisition ORDER BY PrId DESC;
            
        ELSEIF p_Action = 'GET_BY_ID' THEN
            SELECT * FROM inventory.PurchaseRequisition WHERE PrId = p_PrId;
            SELECT * FROM inventory.PurchaseRequisitionItem WHERE PrId = p_PrId;
            
        ELSEIF p_Action = 'DELETE' THEN
            DELETE FROM inventory.PurchaseRequisitionItem WHERE PrId = p_PrId;
            DELETE FROM inventory.PurchaseRequisition WHERE PrId = p_PrId;
            SELECT 1 AS Success;
        END IF;
    END;
    """

    with engine.begin() as conn:
        print("Ensuring inventory DB exists...")
        conn.execute(text(part1))
        conn.execute(text(part2))
        
        print("Creating Tables...")
        conn.execute(text(part3))
        conn.execute(text(part4))
        
        print("Creating SP...")
        conn.execute(text(part5))
        conn.execute(text(part6))
        
        print("Successfully created PR tables and SP.")

if __name__ == '__main__':
    execute_sql_file()
