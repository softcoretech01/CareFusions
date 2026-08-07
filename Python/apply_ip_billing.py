import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def apply_sql():
    with engine.connect() as con:
        tables = """
CREATE TABLE IF NOT EXISTS hospital.IpBill (
    IpBillId INT AUTO_INCREMENT PRIMARY KEY,
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
    InsuranceClaimedAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    PatientBalance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    IsInsurancePaid TINYINT(1) NOT NULL DEFAULT 0,
    CreatedBy VARCHAR(50) DEFAULT 'System',
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""
        tables2 = """
CREATE TABLE IF NOT EXISTS hospital.IpBillItem (
    IpBillItemId INT AUTO_INCREMENT PRIMARY KEY,
    IpBillId INT NOT NULL,
    ItemCode VARCHAR(50),
    ItemDescription VARCHAR(200) NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    UnitPrice DECIMAL(10, 2) NOT NULL DEFAULT 0,
    Subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    FOREIGN KEY (IpBillId) REFERENCES hospital.IpBill(IpBillId) ON DELETE CASCADE
);
"""
        drop_sp = "DROP PROCEDURE IF EXISTS hospital.SpIpBilling"
        create_sp = """
CREATE PROCEDURE hospital.SpIpBilling (
    IN p_Opt VARCHAR(50),
    IN p_IpBillId INT,
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
    IN p_InsuranceClaimedAmount DECIMAL(10, 2),
    IN p_PatientBalance DECIMAL(10, 2),
    IN p_IsInsurancePaid TINYINT(1),
    IN p_ItemCode VARCHAR(50),
    IN p_ItemDescription VARCHAR(200),
    IN p_Quantity INT,
    IN p_UnitPrice DECIMAL(10, 2),
    IN p_Subtotal DECIMAL(10, 2),
    IN p_CreatedBy VARCHAR(50)
)
BEGIN
    IF p_Opt = 'INSERT_BILL' THEN
        INSERT INTO hospital.IpBill (
            BillNumber, Uhid, PatientName, MobileNumber, BillDate,
            TotalAmount, Discount, Tax, NetAmount, PaymentMode, PaymentStatus, 
            InsuranceClaimedAmount, PatientBalance, IsInsurancePaid,
            CreatedBy, CreatedDate
        )
        VALUES (
            p_BillNumber, p_Uhid, p_PatientName, p_MobileNumber, p_BillDate,
            p_TotalAmount, p_Discount, p_Tax, p_NetAmount, p_PaymentMode, p_PaymentStatus,
            p_InsuranceClaimedAmount, p_PatientBalance, p_IsInsurancePaid,
            p_CreatedBy, NOW()
        );
        SELECT LAST_INSERT_ID() AS IpBillId;
        
    ELSEIF p_Opt = 'INSERT_BILL_ITEM' THEN
        INSERT INTO hospital.IpBillItem (
            IpBillId, ItemCode, ItemDescription, Quantity, UnitPrice, Subtotal
        )
        VALUES (
            p_IpBillId, p_ItemCode, p_ItemDescription, p_Quantity, p_UnitPrice, p_Subtotal
        );
        SELECT LAST_INSERT_ID() AS IpBillItemId;
        
    ELSEIF p_Opt = 'GET_ALL_BILLS' THEN
        SELECT 
            IpBillId, BillNumber, Uhid, PatientName, MobileNumber, BillDate,
            TotalAmount, Discount, Tax, NetAmount, PaymentMode, PaymentStatus,
            InsuranceClaimedAmount, PatientBalance, IsInsurancePaid
        FROM hospital.IpBill
        ORDER BY IpBillId DESC
        LIMIT 100;
        
    ELSEIF p_Opt = 'GET_BILL_ITEMS' THEN
        SELECT 
            IpBillItemId, IpBillId, ItemCode, ItemDescription, Quantity, UnitPrice, Subtotal
        FROM hospital.IpBillItem
        WHERE IpBillId = p_IpBillId;
        
    END IF;
END
"""
        con.execute(text(tables))
        con.execute(text(tables2))
        con.execute(text(drop_sp))
        con.execute(text(create_sp))
        con.commit()
        print("IP Billing SQL Applied Successfully")

if __name__ == "__main__":
    apply_sql()
