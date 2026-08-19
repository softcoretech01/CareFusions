import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.op_billing import OpBillCreate, OpBillResponse, OpBillItemResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/op-billing", tags=["OP Billing"])

SP_NAME = "hospital.SpOpBilling"

def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt": opt,
        "p_OpBillId": kwargs.get("op_bill_id"),
        "p_BillNumber": kwargs.get("bill_number"),
        "p_Uhid": kwargs.get("uhid"),
        "p_PatientName": kwargs.get("patient_name"),
        "p_MobileNumber": kwargs.get("mobile_number"),
        "p_BillDate": kwargs.get("bill_date"),
        "p_TotalAmount": kwargs.get("total_amount"),
        "p_Discount": kwargs.get("discount"),
        "p_Tax": kwargs.get("tax"),
        "p_NetAmount": kwargs.get("net_amount"),
        "p_PaymentMode": kwargs.get("payment_mode"),
        "p_PaymentStatus": kwargs.get("payment_status"),
        "p_ItemCode": kwargs.get("item_code"),
        "p_ItemDescription": kwargs.get("item_description"),
        "p_Quantity": kwargs.get("quantity"),
        "p_UnitPrice": kwargs.get("unit_price"),
        "p_Subtotal": kwargs.get("subtotal"),
        "p_CreatedBy": kwargs.get("created_by")
    }
    
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_OpBillId, :p_BillNumber, :p_Uhid, :p_PatientName, 
            :p_MobileNumber, :p_BillDate, :p_TotalAmount, :p_Discount, :p_Tax, 
            :p_NetAmount, :p_PaymentMode, :p_PaymentStatus, :p_ItemCode, 
            :p_ItemDescription, :p_Quantity, :p_UnitPrice, :p_Subtotal, :p_CreatedBy
        )
    """)
    return db.execute(sql, params)

@router.post("/", response_model=OpBillResponse)
def create_op_bill(bill_in: OpBillCreate, db: Session = Depends(get_db)):
    """Create a new OP Bill with its items."""
    try:
        # 1. Insert the main bill
        result = _call_sp(
            db, "INSERT_BILL",
            bill_number=bill_in.BillNumber,
            uhid=bill_in.Uhid,
            patient_name=bill_in.PatientName,
            mobile_number=bill_in.MobileNumber,
            # BillDate is left to the database (NOW() inside the SP) so every API
            # host stamps bills on the same clock. See SpOpBilling.INSERT_BILL.
            bill_date=None,
            total_amount=bill_in.TotalAmount,
            discount=bill_in.Discount,
            tax=bill_in.Tax,
            net_amount=bill_in.NetAmount,
            payment_mode=bill_in.PaymentMode,
            payment_status=bill_in.PaymentStatus,
            created_by="Admin"
        )
        row = result.fetchone()
        if not row:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create Bill.")
        
        op_bill_id = row[0]
        
        # 2. Insert the items
        for item in bill_in.Items:
            _call_sp(
                db, "INSERT_BILL_ITEM",
                op_bill_id=op_bill_id,
                item_code=item.ItemCode,
                item_description=item.ItemDescription,
                quantity=item.Quantity,
                unit_price=item.UnitPrice,
                subtotal=item.Subtotal
            )
            
        db.commit()
        
        # Return the created bill by getting it from the list
        all_bills = _call_sp(db, "GET_ALL_BILLS").fetchall()
        for b in all_bills:
            if b.OpBillId == op_bill_id:
                items_result = _call_sp(db, "GET_BILL_ITEMS", op_bill_id=op_bill_id).fetchall()
                items = [dict(i._mapping) for i in items_result]
                return {**dict(b._mapping), "Items": items}
                
        raise HTTPException(status_code=500, detail="Bill created but failed to retrieve")
            
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /op-billing] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[OpBillResponse])
def get_op_bills(db: Session = Depends(get_db)):
    """Retrieve all OP Bills."""
    try:
        bills = _call_sp(db, "GET_ALL_BILLS").fetchall()
        result = []
        for bill in bills:
            bill_dict = dict(bill._mapping)
            items_result = _call_sp(db, "GET_BILL_ITEMS", op_bill_id=bill.OpBillId).fetchall()
            items = [dict(i._mapping) for i in items_result]
            bill_dict["Items"] = items
            result.append(bill_dict)
        return result
    except Exception as e:
        logger.error(f"[GET /op-billing] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch bills")
