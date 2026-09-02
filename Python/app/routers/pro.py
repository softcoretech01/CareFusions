from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..schemas import pro as pro_schema
import datetime

router = APIRouter(
    prefix="/pro",
    tags=["PRO Portal"]
)

@router.get("/orders/pending", response_model=List[pro_schema.PROOrderResponse])
def get_pending_pro_orders(db: Session = Depends(get_db)):
    """
    Fetch all Service Orders that have items PENDING or UNDER_REVIEW for PRO approval.
    """
    try:
        # Fetch orders that have items in PENDING or UNDER_REVIEW
        orders_query = text("""
            SELECT DISTINCT so.* 
            FROM Service_Order so
            JOIN Service_OrderItem soi ON so.ServiceOrderId = soi.ServiceOrderId
            WHERE so.IsDeleted = 0 
            AND soi.IsDeleted = 0 
            AND soi.PROStatus IN ('PENDING', 'UNDER_REVIEW')
            ORDER BY so.CreatedAt ASC
        """)
        
        orders_rows = db.execute(orders_query).fetchall()
        
        result_list = []
        for order_row in orders_rows:
            order_dict = dict(order_row._mapping)
            
            items_query = text("""
                SELECT * FROM Service_OrderItem 
                WHERE ServiceOrderId = :order_id 
                AND IsDeleted = 0 
                AND PROStatus IN ('PENDING', 'UNDER_REVIEW')
            """)
            items_rows = db.execute(items_query, {"order_id": order_dict["ServiceOrderId"]}).fetchall()
            
            order_dict["Items"] = [dict(item._mapping) for item in items_rows]
            result_list.append(order_dict)
            
        return result_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/approve")
def approve_pro_order(order_id: int, payload: pro_schema.PROOrderApproveRequest, db: Session = Depends(get_db)):
    """
    Approve specific items in a Service Order with PRO pricing.
    Strictly validates financial calculation rules before saving.
    Triggers Advance Bill generation if applicable.
    """
    try:
        for item in payload.Items:
            # 1. Validation Engine
            gross_amount = item.PROPrice # Assuming Quantity is 1 or already factored
            net_amount = gross_amount - item.AuthorizedDiscount
            
            # Strict verification
            if abs(net_amount - (item.InsuranceCoveredAmount + item.PatientResponsibility)) > 0.01:
                db.rollback()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Financial mismatch for item {item.ServiceOrderItemId}: "
                           f"Net Amount ({net_amount}) != Insurance ({item.InsuranceCoveredAmount}) "
                           f"+ Patient ({item.PatientResponsibility})"
                )
            
            # 2. Update the Item
            update_query = text("""
                UPDATE Service_OrderItem
                SET PROPrice = :PROPrice,
                    AuthorizedDiscount = :AuthorizedDiscount,
                    GrossAmount = :GrossAmount,
                    NetAmount = :NetAmount,
                    InsuranceCoveredAmount = :InsuranceCoveredAmount,
                    PatientResponsibility = :PatientResponsibility,
                    PROStatus = 'APPROVED',
                    UpdatedAt = NOW()
                WHERE ServiceOrderItemId = :ServiceOrderItemId
            """)
            db.execute(update_query, {
                "PROPrice": item.PROPrice,
                "AuthorizedDiscount": item.AuthorizedDiscount,
                "GrossAmount": gross_amount,
                "NetAmount": net_amount,
                "InsuranceCoveredAmount": item.InsuranceCoveredAmount,
                "PatientResponsibility": item.PatientResponsibility,
                "ServiceOrderItemId": item.ServiceOrderItemId
            })
            
        # 3. Update the Parent Order Status
        # If all items are approved, mark parent as APPROVED
        check_query = text("""
            SELECT COUNT(*) as pending_count, SUM(PatientResponsibility) as total_patient_resp, MAX(UHID) as uhid 
            FROM Service_OrderItem soi
            JOIN Service_Order so ON so.ServiceOrderId = soi.ServiceOrderId
            WHERE soi.ServiceOrderId = :order_id AND soi.PROStatus != 'APPROVED' AND soi.IsDeleted = 0
        """)
        pending_result = db.execute(check_query, {"order_id": order_id}).fetchone()
        
        if pending_result.pending_count == 0:
            # All items are approved
            # Calculate total Patient Responsibility of ALL items in this order
            sum_query = text("""
                SELECT SUM(PatientResponsibility) as total_patient_resp, MAX(so.UHID) as uhid, MAX(so.SourceModule) as source_module
                FROM Service_OrderItem soi
                JOIN Service_Order so ON so.ServiceOrderId = soi.ServiceOrderId
                WHERE soi.ServiceOrderId = :order_id AND soi.IsDeleted = 0
            """)
            sum_result = db.execute(sum_query, {"order_id": order_id}).fetchone()
            total_patient_resp = sum_result.total_patient_resp or 0
            uhid = sum_result.uhid
            source_module = sum_result.source_module
            
            # Phase 10: IPD Continuous Billing bypass
            if total_patient_resp == 0 or source_module == 'IPD':
                # Bypass advance payment completely
                financial_status = 'CLEARED' if total_patient_resp == 0 else 'UNPAID'
                payment_status = 'NOT_REQUIRED' if total_patient_resp == 0 else 'UNPAID'
                
                db.execute(text("""
                    UPDATE Service_Order 
                    SET PROStatus = 'APPROVED', 
                        FinancialStatus = :financial_status,
                        ServiceStatus = 'RELEASED',
                        PaymentStatus = :payment_status,
                        UpdatedAt = NOW() 
                    WHERE ServiceOrderId = :order_id
                """), {"order_id": order_id, "financial_status": financial_status, "payment_status": payment_status})
                
                db.execute(text("""
                    UPDATE Service_OrderItem 
                    SET FinancialStatus = :financial_status,
                        ServiceStatus = 'RELEASED',
                        PaymentStatus = :payment_status,
                        UpdatedAt = NOW() 
                    WHERE ServiceOrderId = :order_id
                """), {"order_id": order_id, "financial_status": financial_status, "payment_status": payment_status})
                
                # Phase 8 & 10: Insert Service_Release for all items in this order
                db.execute(text("""
                    INSERT INTO Service_Release (ServiceOrderItemId, ReleaseDate, ReleasedBy, ReleaseStatus, ReleaseReason)
                    SELECT ServiceOrderItemId, NOW(), 'SYSTEM_PRO_AUTO_RELEASE', 'ACTIVE', :reason
                    FROM Service_OrderItem
                    WHERE ServiceOrderId = :order_id AND IsDeleted = 0
                """), {"order_id": order_id, "reason": 'Zero patient responsibility' if total_patient_resp == 0 else 'IPD Continuous Billing'})
            else:
                # Requires advance payment
                db.execute(text("""
                    UPDATE Service_Order 
                    SET PROStatus = 'APPROVED', 
                        FinancialStatus = 'UNPAID',
                        PaymentStatus = 'UNPAID',
                        UpdatedAt = NOW() 
                    WHERE ServiceOrderId = :order_id
                """), {"order_id": order_id})
                
                db.execute(text("""
                    UPDATE Service_OrderItem 
                    SET FinancialStatus = 'UNPAID',
                        PaymentStatus = 'UNPAID',
                        UpdatedAt = NOW() 
                    WHERE ServiceOrderId = :order_id
                """), {"order_id": order_id})
                
                # Phase 6: Automatic Advance Bill Generation
                advance_no = f"ADV-{order_id}-{int(datetime.datetime.now().timestamp())}"
                db.execute(text("""
                    INSERT INTO Billing_Advance 
                    (AdvanceNo, ServiceOrderId, UHID, TotalAmount, Status)
                    VALUES (:AdvanceNo, :ServiceOrderId, :UHID, :TotalAmount, 'PENDING')
                """), {
                    "AdvanceNo": advance_no,
                    "ServiceOrderId": order_id,
                    "UHID": uhid,
                    "TotalAmount": total_patient_resp
                })
            
            # Phase 11: Insurance Claim / Receivable
            claim_query = text("""
                SELECT SUM(InsuranceCoveredAmount) as total_insurance
                FROM Service_OrderItem
                WHERE ServiceOrderId = :order_id AND IsDeleted = 0
            """)
            total_insurance = db.execute(claim_query, {"order_id": order_id}).scalar() or 0
            
            if total_insurance > 0:
                claim_no = f"CLM-{order_id}-{int(datetime.datetime.now().timestamp())}"
                db.execute(text("""
                    INSERT INTO Billing_InsuranceClaim
                    (ClaimNo, ServiceOrderId, UHID, ClaimAmount, Status)
                    VALUES (:ClaimNo, :ServiceOrderId, :UHID, :ClaimAmount, 'PENDING_CLAIM')
                """), {
                    "ClaimNo": claim_no,
                    "ServiceOrderId": order_id,
                    "UHID": uhid,
                    "ClaimAmount": total_insurance
                })
            
        db.commit()
        
        return {"message": "PRO approval successful", "ServiceOrderId": order_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
