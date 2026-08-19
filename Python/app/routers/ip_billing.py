from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.database import get_db
from app.schemas.ip_billing import IpBillCreate, IpBillResponse, IpBillItemResponse

router = APIRouter(prefix="/ip-billing", tags=["IP Billing"])

def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt": opt,
        "p_IpBillId": kwargs.get("ip_bill_id"),
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
        "p_InsuranceClaimedAmount": kwargs.get("insurance_claimed_amount"),
        "p_PatientBalance": kwargs.get("patient_balance"),
        "p_IsInsurancePaid": kwargs.get("is_insurance_paid"),
        "p_ItemCode": kwargs.get("item_code"),
        "p_ItemDescription": kwargs.get("item_description"),
        "p_Quantity": kwargs.get("quantity"),
        "p_UnitPrice": kwargs.get("unit_price"),
        "p_Subtotal": kwargs.get("subtotal"),
        "p_CreatedBy": kwargs.get("created_by")
    }
    
    query = text("""
        CALL hospital.SpIpBilling(
            :p_Opt, :p_IpBillId, :p_BillNumber, :p_Uhid, :p_PatientName, 
            :p_MobileNumber, :p_BillDate, :p_TotalAmount, :p_Discount, :p_Tax, :p_NetAmount, 
            :p_PaymentMode, :p_PaymentStatus, :p_InsuranceClaimedAmount, :p_PatientBalance, :p_IsInsurancePaid,
            :p_ItemCode, :p_ItemDescription, :p_Quantity, :p_UnitPrice, :p_Subtotal, 
            :p_CreatedBy
        )
    """)
    return db.execute(query, params)

@router.post("/", response_model=IpBillResponse)
def create_ip_bill(bill: IpBillCreate, db: Session = Depends(get_db)):
    try:
        result = _call_sp(
            db, "INSERT_BILL",
            bill_number=bill.BillNumber,
            uhid=bill.Uhid,
            patient_name=bill.PatientName,
            mobile_number=bill.MobileNumber,
            # Stamped by the database (NOW() inside the SP), not the API host clock.
            bill_date=None,
            total_amount=bill.TotalAmount,
            discount=bill.Discount,
            tax=bill.Tax,
            net_amount=bill.NetAmount,
            payment_mode=bill.PaymentMode,
            payment_status=bill.PaymentStatus,
            insurance_claimed_amount=bill.InsuranceClaimedAmount,
            patient_balance=bill.PatientBalance,
            is_insurance_paid=int(bill.IsInsurancePaid),
            created_by="System"
        )
        row = result.fetchone()
        ip_bill_id = row[0]
        
        for item in bill.Items:
            _call_sp(
                db, "INSERT_BILL_ITEM",
                ip_bill_id=ip_bill_id,
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
            if b.IpBillId == ip_bill_id:
                items_result = _call_sp(db, "GET_BILL_ITEMS", ip_bill_id=ip_bill_id).fetchall()
                items = [dict(i._mapping) for i in items_result]
                return {**dict(b._mapping), "Items": items}
                
        raise HTTPException(status_code=500, detail="Bill created but failed to retrieve")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[IpBillResponse])
def get_ip_bills(db: Session = Depends(get_db)):
    try:
        bills = _call_sp(db, "GET_ALL_BILLS").fetchall()
        result = []
        for bill in bills:
            bill_dict = dict(bill._mapping)
            # Make sure IsInsurancePaid is a boolean
            bill_dict["IsInsurancePaid"] = bool(bill_dict["IsInsurancePaid"])
            
            items_result = _call_sp(db, "GET_BILL_ITEMS", ip_bill_id=bill.IpBillId).fetchall()
            items = [dict(i._mapping) for i in items_result]
            bill_dict["Items"] = items
            result.append(bill_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
