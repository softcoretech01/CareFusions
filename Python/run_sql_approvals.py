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
    
    part1 = "DROP PROCEDURE IF EXISTS `SpManageApprovals`;"
    
    part2 = """
    CREATE PROCEDURE `SpManageApprovals` (
        IN p_Action VARCHAR(20),
        IN p_DocumentType VARCHAR(100),
        IN p_RecordId INT,
        IN p_Status VARCHAR(50),
        IN p_ActionBy VARCHAR(100)
    )
    BEGIN
        IF p_Action = 'GET_PENDING' THEN
            SELECT 
                'Purchase Requisition' AS DocumentType,
                PR.PrId AS OriginalId,
                PR.PrNo AS RefNo,
                PR.RequisitionDate AS Date,
                PR.Department AS DepartmentOrVendor,
                (SELECT IFNULL(SUM(RequestedQty * EstimatedPrice), 0) FROM `PurchaseRequisitionItem` WHERE `PrId` = PR.PrId) AS Amount,
                PR.CreatedBy AS RequestedBy,
                PR.Priority AS Priority,
                PR.ApprovalStatus AS Status
            FROM `PurchaseRequisition` PR
            WHERE PR.ApprovalStatus IN ('Submitted', 'Pending Department Approval')
            
            UNION ALL
            
            SELECT 
                'Purchase Order' AS DocumentType,
                PO.PoId AS OriginalId,
                PO.PoNumber AS RefNo,
                PO.PoDate AS Date,
                PO.VendorName AS DepartmentOrVendor,
                PO.TotalAmount AS Amount,
                'System' AS RequestedBy,
                'Normal' AS Priority,
                PO.Status AS Status
            FROM `PurchaseOrder` PO
            WHERE PO.Status IN ('Submitted', 'Pending Approval')
            
            UNION ALL
            
            SELECT 
                'Purchase Return' AS DocumentType,
                R.ReturnId AS OriginalId,
                R.ReturnNo AS RefNo,
                R.ReturnDate AS Date,
                R.VendorName AS DepartmentOrVendor,
                0 AS Amount,
                'System' AS RequestedBy,
                'Normal' AS Priority,
                R.Status AS Status
            FROM `PurchaseReturn` R
            WHERE R.Status IN ('Submitted', 'Pending Approval');
            
        ELSEIF p_Action = 'UPDATE_STATUS' THEN
            IF p_DocumentType = 'Purchase Requisition' THEN
                UPDATE `PurchaseRequisition` 
                SET `ApprovalStatus` = p_Status, `CurrentStage` = p_Status
                WHERE `PrId` = p_RecordId;
                SELECT p_RecordId AS Id, 'Purchase Requisition status updated' AS Message;
                
            ELSEIF p_DocumentType = 'Purchase Order' THEN
                UPDATE `PurchaseOrder` 
                SET `Status` = p_Status, `ModifiedBy` = p_ActionBy
                WHERE `PoId` = p_RecordId;
                SELECT p_RecordId AS Id, 'Purchase Order status updated' AS Message;
                
            ELSEIF p_DocumentType = 'Purchase Return' THEN
                UPDATE `PurchaseReturn` 
                SET `Status` = p_Status, `ModifiedBy` = p_ActionBy
                WHERE `ReturnId` = p_RecordId;
                SELECT p_RecordId AS Id, 'Purchase Return status updated' AS Message;
            END IF;
        END IF;
    END;
    """

    with engine.begin() as conn:
        print("Creating SP SpManageApprovals...")
        conn.execute(text(part1))
        conn.execute(text(part2))
        
        print("Successfully created Approvals SP.")

if __name__ == '__main__':
    execute_sql_file()
