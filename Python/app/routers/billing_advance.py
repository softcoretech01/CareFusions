from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..schemas import billing_advance as schemas
from .pro import release_order_items
import datetime

router = APIRouter(
    prefix="/billing/advance",
    tags=["Advance Billing"]
)

@router.get("")
@router.get("/")
def list_advance_bills(
    status: Optional[str] = Query(None, description="Filter by Status, e.g. PAID or PENDING"),
    db: Session = Depends(get_db),
):
    """
    All advance bills, newest first. The billing reports screen reads the PAID ones so a
    collected advance stays visible after it drops off the pending list.

    Billing_Advance holds only a UHID, so the patient name is resolved the same way the PRO
    screens do: the patient master first, then the most recent lab/radiology order for that UHID.
    """
    try:
        where = ["adv.IsDeleted = 0"]
        params = {}
        if status:
            where.append("adv.Status = :status")
            params["status"] = status

        query = text(f"""
            SELECT adv.*,
                   COALESCE(
                       p.PatientName,
                       (SELECT x.PatientName
                          FROM (
                              SELECT Uhid, PatientName, OrderedAt FROM hospital.Lab_Order
                              UNION ALL
                              SELECT Uhid, PatientName, OrderedAt FROM hospital.Rad_Order
                          ) x
                         WHERE x.Uhid = adv.UHID AND NULLIF(TRIM(x.PatientName), '') IS NOT NULL
                         ORDER BY x.OrderedAt DESC
                         LIMIT 1)
                   ) AS PatientName
            FROM hospital.Billing_Advance adv
            LEFT JOIN registration.Patient p ON p.Uhid = adv.UHID
            WHERE {' AND '.join(where)}
            ORDER BY adv.AdvanceId DESC
        """)
        rows = db.execute(query, params).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pending", response_model=List[schemas.AdvanceBillResponse])
def get_pending_advance_bills(db: Session = Depends(get_db)):
    """
    Fetch all pending advance bills that require payment.
    """
    try:
        query = text("""
            SELECT * FROM hospital.Billing_Advance
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
        adv_query = text("SELECT * FROM hospital.Billing_Advance WHERE AdvanceId = :id AND IsDeleted = 0 FOR UPDATE")
        adv = db.execute(adv_query, {"id": advance_id}).fetchone()
        
        if not adv:
            raise HTTPException(status_code=404, detail="Advance bill not found")
            
        if adv.Status == 'PAID':
            raise HTTPException(status_code=400, detail="Advance bill is already paid")
            
        adv_dict = dict(adv._mapping)
        # DECIMAL columns come back as decimal.Decimal, which cannot be subtracted from the
        # float on the request, so the comparison below raised TypeError and 500'd every payment.
        total_amount = float(adv_dict["TotalAmount"] or 0)

        if abs(total_amount - float(payload.Amount)) > 0.01:
             raise HTTPException(
                 status_code=400, 
                 detail=f"Payment amount ({payload.Amount}) must exactly match the total required amount ({total_amount})."
             )
        
        # 1. Update the hospital.Billing_Advance record
        update_adv = text("""
            UPDATE hospital.Billing_Advance 
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
        
        # 2. Update the parent hospital.Service_Order
        service_order_id = adv_dict["ServiceOrderId"]
        db.execute(text("""
            UPDATE hospital.Service_Order 
            SET FinancialStatus = 'CLEARED',
                PaymentStatus = 'PAID',
                ServiceStatus = 'RELEASED',
                UpdatedAt = NOW()
            WHERE ServiceOrderId = :ServiceOrderId
        """), {"ServiceOrderId": service_order_id})
        
        # 3. Update the hospital.Service_OrderItem (The Final Gate unlock)
        db.execute(text("""
            UPDATE hospital.Service_OrderItem 
            SET FinancialStatus = 'CLEARED',
                PaymentStatus = 'PAID',
                ServiceStatus = 'RELEASED',
                UpdatedAt = NOW()
            WHERE ServiceOrderId = :ServiceOrderId
        """), {"ServiceOrderId": service_order_id})
        
        # Phase 8: release every item on the order. Guarded, because Service_Release
        # permits one ACTIVE row per item: an order already released by another path
        # (PRO auto-release, or a re-submitted payment) otherwise failed here with a
        # raw "Duplicate entry ... for key 'ux_service_release_active'" 500.
        release_order_items(db, service_order_id, 'SYSTEM_BILLING_CLEARED', 'Advance Bill Paid')
        
        db.commit()
        
        return {"message": "Advance payment successful, services unlocked"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
