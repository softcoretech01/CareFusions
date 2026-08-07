from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.database import get_db
from app.schemas.billing_reports import ConsolidatedBillResponse, ConsolidatedBillItem

router = APIRouter(prefix="/billing-reports", tags=["Billing Reports"])

def _call_sp(db: Session, opt: str, bill_number: str = None):
    query = text("""
        CALL hospital.SpBillingReports(
            :p_Opt, :p_BillNumber
        )
    """)
    return db.execute(query, {"p_Opt": opt, "p_BillNumber": bill_number})

@router.get("/", response_model=List[ConsolidatedBillResponse])
def get_billing_reports(db: Session = Depends(get_db)):
    try:
        bills = _call_sp(db, "GET_ALL_BILLS").fetchall()
        result = []
        for bill in bills:
            bill_dict = dict(bill._mapping)
            
            # Fetch items based on type
            items = []
            if bill_dict["Type"] == 'OP':
                q = text("SELECT ItemCode, ItemDescription, Quantity, UnitPrice, Subtotal FROM hospital.OpBillItem JOIN hospital.OpBill ON OpBill.OpBillId = OpBillItem.OpBillId WHERE OpBill.BillNumber = :bn")
                items_rows = db.execute(q, {"bn": bill_dict["BillNumber"]}).fetchall()
                items = [dict(i._mapping) for i in items_rows]
            else:
                q = text("SELECT ItemCode, ItemDescription, Quantity, UnitPrice, Subtotal FROM hospital.IpBillItem JOIN hospital.IpBill ON IpBill.IpBillId = IpBillItem.IpBillId WHERE IpBill.BillNumber = :bn")
                items_rows = db.execute(q, {"bn": bill_dict["BillNumber"]}).fetchall()
                items = [dict(i._mapping) for i in items_rows]
                
            bill_dict["Items"] = items
            result.append(bill_dict)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{bill_number}/pay")
def mark_bill_as_paid(bill_number: str = Path(...), db: Session = Depends(get_db)):
    try:
        _call_sp(db, "MARK_AS_PAID", bill_number=bill_number)
        db.commit()
        return {"status": "success", "message": f"Bill {bill_number} marked as paid"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
