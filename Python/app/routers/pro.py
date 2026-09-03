from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..schemas import pro as pro_schema
from datetime import datetime, date

router = APIRouter(
    prefix="/pro",
    tags=["PRO Portal"]
)

@router.get("/dashboard/kpis", response_model=pro_schema.PRODashboardKPIs)
def get_dashboard_kpis(db: Session = Depends(get_db)):
    try:
        query = text("""
            SELECT 
                (SELECT COUNT(*) FROM hospital.Service_OrderItem WHERE PROStatus IN ('PENDING', 'UNDER_REVIEW') AND IsDeleted=0) as pending_reviews,
                (SELECT COUNT(*) FROM hospital.Service_Order WHERE SourceModule='OPD' AND PROStatus IN ('PENDING', 'UNDER_REVIEW') AND IsDeleted=0) as opd_pending,
                (SELECT COUNT(*) FROM hospital.Service_Order WHERE SourceModule='IPD' AND PROStatus IN ('PENDING', 'UNDER_REVIEW') AND IsDeleted=0) as ipd_pending,
                (SELECT COUNT(*) FROM hospital.Service_Order WHERE SourceModule='EMERGENCY' AND PROStatus IN ('PENDING', 'UNDER_REVIEW') AND IsDeleted=0) as operations_pending,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem WHERE PaymentStatus='UNPAID' AND IsDeleted=0) as payment_pending,
                (SELECT COUNT(*) FROM hospital.Billing_InsuranceClaim WHERE Status='PENDING_CLAIM') as insurance_pending,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem WHERE PROStatus='APPROVED' AND DATE(UpdatedAt) = CURDATE() AND IsDeleted=0) as approved_today,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem WHERE PROStatus='REJECTED' AND DATE(UpdatedAt) = CURDATE() AND IsDeleted=0) as rejected_today,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem WHERE ServiceStatus='RELEASED' AND IsDeleted=0) as services_released,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem WHERE ServiceStatus='NOT_RELEASED' AND PROStatus='APPROVED' AND PaymentStatus='UNPAID' AND IsDeleted=0) as services_awaiting_clearance
        """)
        
        result = db.execute(query).fetchone()
        
        if not result:
            return pro_schema.PRODashboardKPIs(
                pending_reviews=0, opd_pending=0, ipd_pending=0, operations_pending=0,
                payment_pending=0, insurance_pending=0, approved_today=0, rejected_today=0,
                services_released=0, services_awaiting_clearance=0
            )
            
        return pro_schema.PRODashboardKPIs(**result._mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders", response_model=List[pro_schema.PROOrderResponse])
def get_pro_orders(
    source_module: Optional[str] = None,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    order_type: Optional[str] = None,
    exclude_order_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        where_clauses = ["so.IsDeleted = 0"]
        params = {}

        if source_module:
            where_clauses.append("so.SourceModule = :source_module")
            params['source_module'] = source_module

        # The Operations screen is defined by what was ordered, not by which module
        # raised it -- an operation on an IPD admission is still an operation. So it
        # filters on order_type, and the OPD/IPD screens exclude that type, keeping
        # every order on exactly one screen.
        if order_type:
            where_clauses.append("so.OrderType = :order_type")
            params['order_type'] = order_type

        if exclude_order_type:
            where_clauses.append("so.OrderType <> :exclude_order_type")
            params['exclude_order_type'] = exclude_order_type

        if status:
            where_clauses.append("so.PROStatus = :status")
            params['status'] = status
            
        if payment_status:
            where_clauses.append("so.PaymentStatus = :payment_status")
            params['payment_status'] = payment_status
            
        where_sql = " AND ".join(where_clauses)
        
        # Lab/Radiology create their Service_Order without DoctorId/DepartmentId, and the patient
        # master does not always hold the UHID, so fall back to the originating order row
        # (Lab_Order / Rad_Order) and resolve its ordering doctor through to a department.
        # OrderNumber is unique in each source table and the LAB-/RAD- prefixes never overlap,
        # so the UNION cannot fan a Service_Order row out into duplicates.
        orders_query = text(f"""
            SELECT so.*,
                   COALESCE(
                       NULLIF(TRIM(p.PatientName), ''),
                       NULLIF(TRIM(src.PatientName), ''),
                       NULLIF(TRIM(adm.PatientName), ''),
                       NULLIF(TRIM(pr.PatientName), ''),
                       (SELECT x.PatientName
                          FROM (
                              SELECT Uhid, PatientName, OrderedAt FROM hospital.Lab_Order
                              UNION ALL
                              SELECT Uhid, PatientName, OrderedAt FROM hospital.Rad_Order
                          ) x
                         WHERE x.Uhid = so.UHID AND NULLIF(TRIM(x.PatientName), '') IS NOT NULL
                         ORDER BY x.OrderedAt DESC
                         LIMIT 1)
                   ) as PatientName,
                   COALESCE(
                       (SELECT d.DoctorName FROM admin.Master_Doctor_Header d WHERE d.DoctorId = so.DoctorId LIMIT 1),
                       CASE WHEN NULLIF(TRIM(src.OrderedBy), '') NOT IN ('Doctor', 'doctor', 'Dr', 'Dr.') 
                            THEN NULLIF(TRIM(src.OrderedBy), '') END,
                       NULLIF(TRIM(adm.AdmittingDoctor), ''),
                       (SELECT app.Doctor FROM admin.Trn_Appointment app WHERE app.Uhid = so.UHID AND app.IsDeleted = 0 ORDER BY app.AppointmentId DESC LIMIT 1),
                       NULLIF(TRIM(pr.PrimaryDoctor), ''),
                       NULLIF(TRIM(src.OrderedBy), '')
                   ) as DoctorName,
                   COALESCE(
                       (SELECT dept.DepartmentName FROM admin.Master_Department dept WHERE dept.DepartmentId = so.DepartmentId LIMIT 1),
                       NULLIF(TRIM(adm.Specialty), ''),
                       (SELECT app.Department FROM admin.Trn_Appointment app WHERE app.Uhid = so.UHID AND app.IsDeleted = 0 ORDER BY app.AppointmentId DESC LIMIT 1),
                       (SELECT prof.DepartmentName
                          FROM admin.Master_DoctorProfessional_Detail prof
                          JOIN admin.Master_Doctor_Header dh ON dh.DoctorId = prof.DoctorId
                         WHERE dh.IsDeleted = 0
                           AND (
                               TRIM(dh.DoctorName) = TRIM(REPLACE(REPLACE(COALESCE(src.OrderedBy, ''), 'Dr.', ''), 'Dr ', ''))
                               OR TRIM(dh.DoctorName) = TRIM(REPLACE(REPLACE(COALESCE(adm.AdmittingDoctor, ''), 'Dr.', ''), 'Dr ', ''))
                           )
                         LIMIT 1),
                       NULLIF(TRIM(pr.Department), '')
                   ) as DepartmentName
            FROM hospital.Service_Order so
            LEFT JOIN registration.Patient p ON so.UHID = p.Uhid
            LEFT JOIN registration.PatientRegistration pr ON so.UHID = pr.Uhid
            LEFT JOIN hospital.IPD_Admission adm ON (
                (so.AdmissionId IS NOT NULL AND adm.AdmissionId = so.AdmissionId)
                OR (so.AdmissionId IS NULL AND so.SourceModule = 'IPD' AND adm.Uhid = so.UHID AND adm.IsDeleted = 0)
            )
            LEFT JOIN (
                SELECT OrderNumber, PatientName, OrderedBy FROM hospital.Lab_Order
                UNION ALL
                SELECT OrderNumber, PatientName, OrderedBy FROM hospital.Rad_Order
            ) src ON src.OrderNumber = so.OrderNo
            WHERE {where_sql}
            ORDER BY so.CreatedAt DESC
        """)
        
        orders_rows = db.execute(orders_query, params).fetchall()
        
        result_list = []
        for order_row in orders_rows:
            order_dict = dict(order_row._mapping)
            
            items_query = text("""
                SELECT * FROM hospital.Service_OrderItem 
                WHERE ServiceOrderId = :order_id AND IsDeleted = 0 
            """)
            items_rows = db.execute(items_query, {"order_id": order_dict["ServiceOrderId"]}).fetchall()
            
            order_dict["Items"] = [dict(item._mapping) for item in items_rows]
            result_list.append(order_dict)
            
        return result_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/pending", response_model=List[pro_schema.PROOrderResponse])
def get_pending_pro_orders(db: Session = Depends(get_db)):
    # Legacy endpoint mapping to new filter
    return get_pro_orders(status="PENDING", db=db)

def log_pro_audit(db: Session, order_id: int, item_id: int, uhid: str, action: str, prev: str, new_val: str, reason: str, changed_by: str = 'PRO_USER'):
    db.execute(text("""
        INSERT INTO hospital.PRO_AuditLog (ServiceOrderId, ServiceOrderItemId, UHID, Action, PreviousValue, NewValue, Reason, ChangedBy)
        VALUES (:order_id, :item_id, :uhid, :action, :prev, :new_val, :reason, :changed_by)
    """), {
        "order_id": order_id, "item_id": item_id, "uhid": uhid, 
        "action": action, "prev": prev, "new_val": new_val, 
        "reason": reason, "changed_by": changed_by
    })

def release_order_items(db: Session, order_id: int, released_by: str, reason: str):
    """Give every item on the order an ACTIVE release row, skipping any that has one.

    Service_Release carries a unique index (ux_service_release_active) permitting a
    single ACTIVE row per item. Both release paths used to INSERT ... SELECT over the
    order's items with no guard, so releasing an order whose items were already
    released — approving an order a second time, or a double-clicked Approve — blew
    up with a raw "Duplicate entry ... for key 'ux_service_release_active'" 500 even
    though the first approval had fully succeeded.

    The existing-release check is a separate query rather than a NOT EXISTS inside the
    INSERT because MySQL refuses to select from the table being inserted into.
    """
    items = db.execute(text("""
        SELECT ServiceOrderItemId FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :order_id AND IsDeleted = 0
    """), {"order_id": order_id}).fetchall()
    if not items:
        return

    released = db.execute(text("""
        SELECT sr.ServiceOrderItemId
        FROM hospital.Service_Release sr
        JOIN hospital.Service_OrderItem soi ON soi.ServiceOrderItemId = sr.ServiceOrderItemId
        WHERE soi.ServiceOrderId = :order_id AND sr.ReleaseStatus = 'ACTIVE'
    """), {"order_id": order_id}).fetchall()
    already = {r.ServiceOrderItemId for r in released}

    for row in items:
        if row.ServiceOrderItemId in already:
            continue
        db.execute(text("""
            INSERT INTO hospital.Service_Release
                (ServiceOrderItemId, ReleaseDate, ReleasedBy, ReleaseStatus, ReleaseReason)
            VALUES (:item_id, NOW(), :released_by, 'ACTIVE', :reason)
        """), {"item_id": row.ServiceOrderItemId, "released_by": released_by, "reason": reason})


@router.post("/orders/{order_id}/approve")
def approve_pro_order(order_id: int, payload: pro_schema.PROOrderApproveRequest, db: Session = Depends(get_db)):
    try:
        # Get order details
        order_info = db.execute(text("SELECT UHID FROM hospital.Service_Order WHERE ServiceOrderId = :order_id"), {"order_id": order_id}).fetchone()
        uhid = order_info.UHID if order_info else None
        
        for item in payload.Items:
            # 1. Validation Engine
            gross_amount = item.PROPrice
            net_amount = gross_amount - item.AuthorizedDiscount
            
            if abs(net_amount - (item.InsuranceCoveredAmount + item.PatientResponsibility)) > 0.01:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Financial mismatch for item {item.ServiceOrderItemId}")
            
            # Fetch previous values for audit
            prev_item = db.execute(text("SELECT PROPrice, AuthorizedDiscount FROM hospital.Service_OrderItem WHERE ServiceOrderItemId = :id"), {"id": item.ServiceOrderItemId}).fetchone()
            
            # Audit price/discount change
            if prev_item:
                if prev_item.PROPrice != item.PROPrice:
                    log_pro_audit(db, order_id, item.ServiceOrderItemId, uhid, 'PRICE_UPDATED', str(prev_item.PROPrice), str(item.PROPrice), "PRO Adjusted")
                if prev_item.AuthorizedDiscount != item.AuthorizedDiscount:
                    log_pro_audit(db, order_id, item.ServiceOrderItemId, uhid, 'DISCOUNT_UPDATED', str(prev_item.AuthorizedDiscount), str(item.AuthorizedDiscount), "PRO Discount")

            # 2. Update the Item
            db.execute(text("""
                UPDATE hospital.Service_OrderItem
                SET PROPrice = :PROPrice, AuthorizedDiscount = :AuthorizedDiscount,
                    GrossAmount = :GrossAmount, NetAmount = :NetAmount,
                    InsuranceCoveredAmount = :InsuranceCoveredAmount, PatientResponsibility = :PatientResponsibility,
                    PROStatus = 'APPROVED', UpdatedAt = NOW()
                WHERE ServiceOrderItemId = :ServiceOrderItemId
            """), {
                "PROPrice": item.PROPrice, "AuthorizedDiscount": item.AuthorizedDiscount,
                "GrossAmount": gross_amount, "NetAmount": net_amount,
                "InsuranceCoveredAmount": item.InsuranceCoveredAmount, "PatientResponsibility": item.PatientResponsibility,
                "ServiceOrderItemId": item.ServiceOrderItemId
            })
            
            log_pro_audit(db, order_id, item.ServiceOrderItemId, uhid, 'SERVICE_APPROVED', 'PENDING', 'APPROVED', "Approved by PRO")
            
        # 3. Update the Parent Order Status
        pending_result = db.execute(text("SELECT COUNT(*) as pending_count FROM hospital.Service_OrderItem WHERE ServiceOrderId = :order_id AND PROStatus != 'APPROVED' AND IsDeleted = 0"), {"order_id": order_id}).fetchone()
        
        if pending_result.pending_count == 0:
            sum_result = db.execute(text("SELECT SUM(PatientResponsibility) as total_patient_resp FROM hospital.Service_OrderItem soi WHERE soi.ServiceOrderId = :order_id AND soi.IsDeleted = 0"), {"order_id": order_id}).fetchone()
            total_patient_resp = sum_result.total_patient_resp or 0

            # Only an order the patient owes nothing on releases on approval. IPD used
            # to release too, on continuous billing settled at discharge, which meant an
            # approved IPD order never raised an advance and so never reached the
            # advance-billing screen. Now every order carrying a patient balance raises
            # one and stays NOT_RELEASED (its default) until that advance is paid.
            if total_patient_resp == 0:
                db.execute(text("UPDATE hospital.Service_Order SET PROStatus = 'APPROVED', FinancialStatus = 'CLEARED', ServiceStatus = 'RELEASED', PaymentStatus = 'NOT_REQUIRED', UpdatedAt = NOW() WHERE ServiceOrderId = :order_id"), {"order_id": order_id})
                db.execute(text("UPDATE hospital.Service_OrderItem SET FinancialStatus = 'CLEARED', ServiceStatus = 'RELEASED', PaymentStatus = 'NOT_REQUIRED', UpdatedAt = NOW() WHERE ServiceOrderId = :order_id"), {"order_id": order_id})

                release_order_items(db, order_id, 'SYSTEM_PRO_AUTO_RELEASE', 'Zero patient responsibility')

                for item in payload.Items:
                    log_pro_audit(db, order_id, item.ServiceOrderItemId, uhid, 'SERVICE_RELEASED', 'PENDING', 'RELEASED', "Auto Release (Zero Responsibility)")
            else:
                db.execute(text("UPDATE hospital.Service_Order SET PROStatus = 'APPROVED', FinancialStatus = 'NOT_CLEARED', PaymentStatus = 'UNPAID', UpdatedAt = NOW() WHERE ServiceOrderId = :order_id"), {"order_id": order_id})
                db.execute(text("UPDATE hospital.Service_OrderItem SET FinancialStatus = 'NOT_CLEARED', PaymentStatus = 'UNPAID', UpdatedAt = NOW() WHERE ServiceOrderId = :order_id"), {"order_id": order_id})
                
                # The PRO decides how much is collected up front. Billing_Advance.TotalAmount is
                # the gate amount that has to be paid before the services release, so the advance
                # goes there and the rest stays as the order balance. No advance given (or <= 0)
                # keeps the old behaviour of demanding the whole patient responsibility.
                advance_amount = total_patient_resp
                if payload.AdvanceAmount is not None and payload.AdvanceAmount > 0:
                    advance_amount = min(float(payload.AdvanceAmount), float(total_patient_resp))

                # Re-approving an order used to raise a second advance bill, so one order could
                # end up with several rows and appear to owe a multiple of its real amount. An
                # order gets one outstanding advance: re-approval re-prices the existing row.
                existing = db.execute(text("""
                    SELECT AdvanceId FROM hospital.Billing_Advance
                    WHERE ServiceOrderId = :order_id AND IsDeleted = 0 AND Status <> 'PAID'
                    ORDER BY AdvanceId DESC LIMIT 1
                """), {"order_id": order_id}).fetchone()

                if existing:
                    db.execute(text("""
                        UPDATE hospital.Billing_Advance
                        SET TotalAmount = :TotalAmount, UpdatedAt = NOW()
                        WHERE AdvanceId = :AdvanceId
                    """), {"TotalAmount": advance_amount, "AdvanceId": existing.AdvanceId})
                else:
                    advance_no = f"ADV-{order_id}-{int(datetime.now().timestamp())}"
                    db.execute(text("INSERT INTO hospital.Billing_Advance (AdvanceNo, ServiceOrderId, UHID, TotalAmount, Status) VALUES (:AdvanceNo, :ServiceOrderId, :UHID, :TotalAmount, 'PENDING')"), {"AdvanceNo": advance_no, "ServiceOrderId": order_id, "UHID": uhid, "TotalAmount": advance_amount})

                log_pro_audit(
                    db, order_id, None, uhid, 'ADVANCE_SET',
                    str(total_patient_resp), str(advance_amount),
                    f"Advance to collect up front; balance {float(total_patient_resp) - float(advance_amount):.2f}"
                )
            
            total_insurance = db.execute(text("SELECT SUM(InsuranceCoveredAmount) as total_insurance FROM hospital.Service_OrderItem WHERE ServiceOrderId = :order_id AND IsDeleted = 0"), {"order_id": order_id}).scalar() or 0
            
            if total_insurance > 0:
                claim_no = f"CLM-{order_id}-{int(datetime.now().timestamp())}"
                db.execute(text("INSERT INTO hospital.Billing_InsuranceClaim (ClaimNo, ServiceOrderId, UHID, ClaimAmount, Status) VALUES (:ClaimNo, :ServiceOrderId, :UHID, :ClaimAmount, 'PENDING_CLAIM')"), {"ClaimNo": claim_no, "ServiceOrderId": order_id, "UHID": uhid, "ClaimAmount": total_insurance})
            
        db.commit()
        return {"message": "PRO approval successful", "ServiceOrderId": order_id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/reject")
def reject_pro_order(order_id: int, reason: str = Query(...), db: Session = Depends(get_db)):
    try:
        order_info = db.execute(text("SELECT UHID FROM hospital.Service_Order WHERE ServiceOrderId = :order_id"), {"order_id": order_id}).fetchone()
        uhid = order_info.UHID if order_info else None
        
        if not reason or len(reason.strip()) == 0:
            raise HTTPException(status_code=400, detail="Rejection reason is mandatory")
            
        db.execute(text("UPDATE hospital.Service_Order SET PROStatus = 'REJECTED', UpdatedAt = NOW() WHERE ServiceOrderId = :order_id"), {"order_id": order_id})
        db.execute(text("UPDATE hospital.Service_OrderItem SET PROStatus = 'REJECTED', UpdatedAt = NOW() WHERE ServiceOrderId = :order_id"), {"order_id": order_id})
        
        log_pro_audit(db, order_id, None, uhid, 'SERVICE_REJECTED', 'PENDING', 'REJECTED', reason)
        
        db.commit()
        return {"message": "Order rejected successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/create")
def create_service_order_from_modal(payload: pro_schema.CreateServiceOrderRequest, db: Session = Depends(get_db)):
    """Creates a Service Order from OPD/IPD screens directly with PRO review."""
    try:
        order_no = f"SO-{payload.SourceModule[:2]}-{int(datetime.now().timestamp())}"
        
        # Determine source module enum
        src_mod = payload.SourceModule
        if src_mod not in ['OPD', 'IPD', 'EMERGENCY']:
            src_mod = 'OPD'
            
        order_type = payload.OrderType
        if order_type not in ['LAB', 'RADIOLOGY', 'OPERATION', 'OTHER']:
            order_type = 'OTHER'
            
        db.execute(text("""
            INSERT INTO hospital.Service_Order (
                OrderNo, UHID, EncounterId, AdmissionId, DoctorId, DepartmentId,
                OrderType, SourceModule, OrderDate, OrderStatus, PROStatus,
                PaymentStatus, FinancialStatus, ServiceStatus, AuthorizationStatus,
                CreatedBy, CreatedAt
            ) VALUES (
                :OrderNo, :UHID, :EncounterId, :AdmissionId, :DoctorId, :DepartmentId,
                :OrderType, :SourceModule, NOW(), 'ACTIVE', 'PENDING',
                'UNPAID', 'NOT_CLEARED', 'NOT_RELEASED', 'PENDING',
                'PRO_USER', NOW()
            )
        """), {
            "OrderNo": order_no,
            "UHID": payload.UHID,
            "EncounterId": payload.EncounterId,
            "AdmissionId": payload.AdmissionId,
            "DoctorId": payload.DoctorId,
            "DepartmentId": payload.DepartmentId,
            "OrderType": order_type,
            "SourceModule": src_mod,
        })
        order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        
        for item in payload.Items:
            price = float(item.MasterPrice or 0.0)
            qty = int(item.Quantity or 1)
            gross = price * qty
            
            db.execute(text("""
                INSERT INTO hospital.Service_OrderItem (
                    ServiceOrderId, ItemType, ItemId, ItemName, Quantity, UOM,
                    MasterPrice, OriginalPrice, PROPrice, AuthorizedDiscount,
                    GrossAmount, NetAmount, InsuranceCoveredAmount, PatientResponsibility,
                    PROStatus, PaymentStatus, FinancialStatus, ServiceStatus, AuthorizationStatus,
                    CreatedAt
                ) VALUES (
                    :ServiceOrderId, :ItemType, :ItemId, :ItemName, :Quantity, :UOM,
                    :MasterPrice, :OriginalPrice, :PROPrice, 0.00,
                    :GrossAmount, :NetAmount, 0.00, :PatientResponsibility,
                    'PENDING', 'UNPAID', 'NOT_CLEARED', 'NOT_RELEASED', 'PENDING',
                    NOW()
                )
            """), {
                "ServiceOrderId": order_id,
                "ItemType": item.ItemType if item.ItemType in ['LAB', 'RADIOLOGY', 'OPERATION', 'MEDICINE', 'OTHER'] else 'OTHER',
                "ItemId": str(item.ItemId),
                "ItemName": item.ItemName,
                "Quantity": qty,
                "UOM": item.UOM or "Unit",
                "MasterPrice": price,
                "OriginalPrice": price,
                "PROPrice": price,
                "GrossAmount": gross,
                "NetAmount": gross,
                "PatientResponsibility": gross
            })
            
        log_pro_audit(db, order_id, None, payload.UHID, 'ORDER_CREATED', 'NONE', 'PENDING', f"Created from {payload.SourceModule}")
        db.commit()
        return {"message": "Service order created successfully", "ServiceOrderId": order_id, "OrderNo": order_no}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/by-uhid/{uhid}")
def get_orders_by_uhid(uhid: str, db: Session = Depends(get_db)):
    """Fetch all service orders and items for a patient UHID."""
    try:
        orders_rows = db.execute(text("""
            SELECT so.*, p.PatientName,
                   (SELECT d.DoctorName FROM admin.Master_Doctor_Header d WHERE d.DoctorId = so.DoctorId LIMIT 1) as DoctorName
            FROM hospital.Service_Order so
            LEFT JOIN registration.Patient p ON so.UHID = p.Uhid
            WHERE so.UHID = :uhid AND so.IsDeleted = 0
            ORDER BY so.CreatedAt DESC
        """), {"uhid": uhid}).fetchall()
        
        result_list = []
        for order_row in orders_rows:
            order_dict = dict(order_row._mapping)
            items_rows = db.execute(text("""
                SELECT * FROM hospital.Service_OrderItem 
                WHERE ServiceOrderId = :order_id AND IsDeleted = 0 
            """), {"order_id": order_dict["ServiceOrderId"]}).fetchall()
            order_dict["Items"] = [dict(item._mapping) for item in items_rows]
            
            # Get total advance paid
            adv = db.execute(text("""
                SELECT COALESCE(SUM(PaidAmount), 0) FROM hospital.Billing_Advance 
                WHERE ServiceOrderId = :order_id AND Status = 'PAID'
            """), {"order_id": order_dict["ServiceOrderId"]}).scalar() or 0.0
            order_dict["PaidAdvance"] = float(adv)
            
            result_list.append(order_dict)
            
        return result_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/{order_id}/payment")
def record_advance_payment(order_id: int, payload: pro_schema.AdvancePaymentRequest, db: Session = Depends(get_db)):
    """Records a manual advance payment linked to the Service Order."""
    try:
        order = db.execute(text("SELECT UHID, PROStatus FROM hospital.Service_Order WHERE ServiceOrderId = :id"), {"id": order_id}).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Service Order not found")
            
        uhid = order.UHID
        
        # Settle the advance the approval already raised rather than inserting a second row.
        # This comment always said "check existing advance or create new" but never checked, so
        # every manual payment left a duplicate REC- row alongside the original ADV- one and the
        # order looked like it had collected twice.
        existing = db.execute(text("""
            SELECT AdvanceId, AdvanceNo FROM hospital.Billing_Advance
            WHERE ServiceOrderId = :order_id AND IsDeleted = 0 AND Status <> 'PAID'
            ORDER BY AdvanceId DESC LIMIT 1
        """), {"order_id": order_id}).fetchone()

        pay_is_full = float(payload.PaidAmount) >= float(payload.TotalAmount)

        if existing:
            advance_no = existing.AdvanceNo
            db.execute(text("""
                UPDATE hospital.Billing_Advance
                SET TotalAmount = :TotalAmount, PaidAmount = :PaidAmount,
                    PaymentMode = :PaymentMode, PaymentReference = :PaymentReference,
                    Status = :Status, UpdatedAt = NOW()
                WHERE AdvanceId = :AdvanceId
            """), {
                "TotalAmount": payload.TotalAmount,
                "PaidAmount": payload.PaidAmount,
                "PaymentMode": payload.PaymentMode,
                "PaymentReference": payload.PaymentReference or "",
                "Status": 'PAID' if pay_is_full else 'PARTIALLY_PAID',
                "AdvanceId": existing.AdvanceId,
            })
        else:
            advance_no = f"REC-{order_id}-{int(datetime.now().timestamp())}"
            db.execute(text("""
                INSERT INTO hospital.Billing_Advance (
                    AdvanceNo, ServiceOrderId, UHID, TotalAmount, PaidAmount, PaymentMode, PaymentReference, Status, CreatedAt
                ) VALUES (
                    :AdvanceNo, :ServiceOrderId, :UHID, :TotalAmount, :PaidAmount, :PaymentMode, :PaymentReference, :Status, NOW()
                )
            """), {
                "AdvanceNo": advance_no,
                "ServiceOrderId": order_id,
                "UHID": uhid,
                "TotalAmount": payload.TotalAmount,
                "PaidAmount": payload.PaidAmount,
                "PaymentMode": payload.PaymentMode,
                "PaymentReference": payload.PaymentReference or "",
                "Status": 'PAID' if pay_is_full else 'PARTIALLY_PAID',
            })

        # If paid in full or partial, update payment status
        is_full = pay_is_full
        pay_status = 'PAID' if is_full else 'PARTIALLY_PAID'
        fin_status = 'CLEARED' if is_full else 'PARTIALLY_CLEARED'
        
        db.execute(text("""
            UPDATE hospital.Service_Order
            SET PaymentStatus = :pay_status, FinancialStatus = :fin_status,
                ServiceStatus = CASE WHEN :is_full = 1 THEN 'RELEASED' ELSE ServiceStatus END,
                UpdatedAt = NOW()
            WHERE ServiceOrderId = :order_id
        """), {"pay_status": pay_status, "fin_status": fin_status, "is_full": 1 if is_full else 0, "order_id": order_id})
        
        db.execute(text("""
            UPDATE hospital.Service_OrderItem
            SET PaymentStatus = :pay_status, FinancialStatus = :fin_status,
                ServiceStatus = CASE WHEN :is_full = 1 THEN 'RELEASED' ELSE ServiceStatus END,
                UpdatedAt = NOW()
            WHERE ServiceOrderId = :order_id
        """), {"pay_status": pay_status, "fin_status": fin_status, "is_full": 1 if is_full else 0, "order_id": order_id})
        
        if is_full:
            release_order_items(
                db, order_id, 'PAYMENT_CLEARANCE_SYSTEM', 'Full Advance Payment Received',
            )
            
        log_pro_audit(db, order_id, None, uhid, 'PAYMENT_RECORDED', 'UNPAID', pay_status, f"Paid ₹{payload.PaidAmount} via {payload.PaymentMode}")
        db.commit()
        return {"message": "Payment recorded successfully", "AdvanceNo": advance_no}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit", response_model=List[pro_schema.PROAuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    try:
        logs_query = text("""
            SELECT al.*, p.PatientName
            FROM hospital.PRO_AuditLog al
            LEFT JOIN registration.Patient p ON al.UHID = p.Uhid
            ORDER BY al.CreatedAt DESC
            LIMIT 500
        """)
        rows = db.execute(logs_query).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insurance")
def get_insurance_claims(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT * FROM hospital.Billing_InsuranceClaim
            ORDER BY ClaimId DESC LIMIT 200
        """)).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payments/pending")
def get_pending_payments(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT * FROM hospital.Billing_Advance
            WHERE Status = 'PENDING'
            ORDER BY AdvanceId DESC LIMIT 200
        """)).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

