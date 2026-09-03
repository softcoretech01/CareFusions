import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def apply_sql():
    with engine.connect() as con:
        drop_sp = "DROP PROCEDURE IF EXISTS hospital.SpBillingReports"
        create_sp = """
CREATE PROCEDURE hospital.SpBillingReports (
    IN p_Opt VARCHAR(50),
    IN p_BillNumber VARCHAR(20)
)
BEGIN
    IF p_Opt = 'GET_ALL_BILLS' THEN
        SELECT 
            'OP' AS Type,
            BillNumber, 
            Uhid AS PatientId, 
            PatientName, 
            BillDate AS Date, 
            TotalAmount, 
            Discount, 
            Tax, 
            NetAmount, 
            PaymentMode, 
            PaymentStatus
        FROM hospital.OpBill
        UNION ALL
        SELECT 
            'IP' AS Type,
            BillNumber, 
            Uhid AS PatientId, 
            PatientName, 
            BillDate AS Date, 
            TotalAmount, 
            Discount, 
            Tax, 
            NetAmount, 
            PaymentMode, 
            PaymentStatus
        FROM hospital.IpBill
        ORDER BY Date DESC;
        
    ELSEIF p_Opt = 'MARK_AS_PAID' THEN
        IF p_BillNumber LIKE 'BILL-%' THEN
            UPDATE hospital.OpBill 
            SET PaymentStatus = 'Paid' 
            WHERE BillNumber = p_BillNumber;
        ELSEIF p_BillNumber LIKE 'IPB-%' THEN
            UPDATE hospital.IpBill 
            SET PaymentStatus = 'Paid' 
            WHERE BillNumber = p_BillNumber;
        END IF;
    END IF;
END
"""
        con.execute(text(drop_sp))
        con.execute(text(create_sp))
        con.commit()
        print("Billing Reports SQL Applied Successfully")

if __name__ == "__main__":
    apply_sql()
