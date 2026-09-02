from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..schemas import billing_advance as schemas
import datetime

router = APIRouter(
    prefix="/billing/advance",
    tags=["Advance Billing"]
)

@router.get("/pending", response_model=List[schemas.AdvanceBillResponse])
def get_pending_advance_bills(db: Session = Depends(get_db)):
    """
    Fetch all pending advance bills that require payment.
    """
    try:
        query = text("""
            SELECT * FROM Billing_Advance
            WHERE Status = 'PENDING' AND IsDeleted = 0
            ORDER BY CreatedAt DESC
        """)
        rows = db.execute(query).fetchall()
        
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{advance_id}/pay")
def pay_advance_bill(advance_id: int, payload: schemas.AdvancePaymentRequest, db: Session = Depends(get_db)):
    """
    Process an advance payment and unlock the connected Service Order for execution.
    """
    try:
        # Fetch the advance bill
        adv_query = text("SELECT * FROM Billing_Advance WHERE AdvanceId = :id AND IsDeleted = 0 FOR UPDATE")
        adv = db.execute(adv_query, {"id": advance_id}).fetchone()
        
        if not adv:
            raise HTTPException(status_code=404, detail="Advance bill not found")
            
        if adv.Status == 'PAID':
            raise HTTPException(status_code=400, detail="Advance bill is already paid")
            
        adv_dict = dict(adv._mapping)
        total_amount = adv_dict["TotalAmount"]
        
        if abs(total_amount - payload.Amount) > 0.01:
             raise HTTPException(
                 status_code=400, 
                 detail=f"Payment amount ({payload.Amount}) must exactly match the total required amount ({total_amount})."
             )
        
        # 1. Update the Billing_Advance record
        update_adv = text("""
            UPDATE Billing_Advance 
            SET PaidAmount = :PaidAmount,
                PaymentMode = :PaymentMode,
                PaymentReference = :PaymentReference,
                Status = 'PAID',
                UpdatedAt = NOW()
            WHERE AdvanceId = :AdvanceId
        """)
        db.execute(update_adv, {
            "PaidAmount": payload.Amount,
            "PaymentMode": payload.PaymentMode,
            "PaymentReference": payload.PaymentReference,
            "AdvanceId": advance_id
        })
        
        # 2. Update the parent Service_Order
        service_order_id = adv_dict["ServiceOrderId"]
        db.execute(text("""
            UPDATE Service_Order 
            SET FinancialStatus = 'CLEARED',
                PaymentStatus = 'PAID',
                ServiceStatus = 'RELEASED',
                UpdatedAt = NOW()
            WHERE ServiceOrderId = :ServiceOrderId
        """), {"ServiceOrderId": service_order_id})
        
        # 3. Update the Service_OrderItem (The Final Gate unlock)
        db.execute(text("""
            UPDATE Service_OrderItem 
            SET FinancialStatus = 'CLEARED',
                PaymentStatus = 'PAID',
                ServiceStatus = 'RELEASED',
                UpdatedAt = NOW()
            WHERE ServiceOrderId = :ServiceOrderId
        """), {"ServiceOrderId": service_order_id})
        
        # Phase 8: Insert Service_Release for all items in this order
        db.execute(text("""
            INSERT INTO Service_Release (ServiceOrderItemId, ReleaseDate, ReleasedBy, ReleaseStatus, ReleaseReason)
            SELECT ServiceOrderItemId, NOW(), 'SYSTEM_BILLING_CLEARED', 'ACTIVE', 'Advance Bill Paid'
            FROM Service_OrderItem
            WHERE ServiceOrderId = :ServiceOrderId AND IsDeleted = 0
        """), {"ServiceOrderId": service_order_id})
        
        db.commit()
        
        return {"message": "Advance payment successful, services unlocked"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
