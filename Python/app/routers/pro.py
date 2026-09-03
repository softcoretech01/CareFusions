"""PRO portal: review, price, approve or reject doctor-raised service orders.

The PRO desk is the gate between a doctor ordering a service and the hospital
performing it. Approving raises the advance bill; nothing downstream may run
until that bill is paid and the item is released.

Two rules shape this module:

* The backend owns every number. Prices, discounts, insurance cover and patient
  responsibility are recomputed here from the stored order and the service
  master. A client may propose, never decide -- previously a posted
  ``InsuranceCoveredAmount`` was stored verbatim, so any caller could drive
  patient responsibility to zero and have the service auto-released.
* Approval and advance-bill creation are ONE transaction. There is no state in
  which an order is APPROVED with no advance bill behind it.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.rbac import Actor, get_actor, require_roles
from ..core import workflow_gate as gate
from ..database import get_db
from ..schemas import pro as pro_schema

router = APIRouter(
    prefix="/pro",
    tags=["PRO Portal"]
)


def log_pro_audit(db: Session, order_id: int, item_id, uhid: str, action: str,
                  prev: str, new_val: str, reason: str,
                  actor: Optional[Actor] = None):
    """Write one PRO audit row.

    The actor used to be the hardcoded string 'PRO_USER', which made the audit
    trail unable to answer the only question it exists for: who did this.
    """
    db.execute(text("""
        INSERT INTO hospital.PRO_AuditLog
            (ServiceOrderId, ServiceOrderItemId, UHID, Action, PreviousValue,
             NewValue, Reason, ChangedBy, ChangedByRole)
        VALUES (:order_id, :item_id, :uhid, :action, :prev, :new_val, :reason,
                :changed_by, :changed_role)
    """), {
        "order_id": order_id, "item_id": item_id, "uhid": uhid,
        "action": action, "prev": prev, "new_val": new_val, "reason": reason,
        "changed_by": actor.username if actor else "UNATTRIBUTED",
        "changed_role": actor.role if actor else None,
    })


# ══════════════════════════════════════════════════════════════════════════
# Dashboard
# ══════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/kpis", response_model=pro_schema.PRODashboardKPIs)
def get_dashboard_kpis(db: Session = Depends(get_db)):
    try:
        # Each metric is its own scalar subquery so one missing table zeroes
        # that metric instead of failing the whole dashboard.
        query = text("""
            SELECT
                (SELECT COUNT(*) FROM hospital.Service_OrderItem
                  WHERE PROStatus IN ('PENDING','UNDER_REVIEW') AND IsDeleted=0) AS pending_reviews,
                (SELECT COUNT(*) FROM hospital.Service_Order
                  WHERE SourceModule='OPD' AND PROStatus IN ('PENDING','UNDER_REVIEW') AND IsDeleted=0) AS opd_pending,
                (SELECT COUNT(*) FROM hospital.Service_Order
                  WHERE SourceModule='IPD' AND PROStatus IN ('PENDING','UNDER_REVIEW') AND IsDeleted=0) AS ipd_pending,
                -- Operations are an ORDER TYPE. This counted SourceModule='EMERGENCY'
                -- before, so the "Operations pending" tile showed emergency
                -- registrations and never showed a single operation.
                (SELECT COUNT(*) FROM hospital.Service_Order
                  WHERE OrderType='OPERATION' AND PROStatus IN ('PENDING','UNDER_REVIEW') AND IsDeleted=0) AS operations_pending,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem
                  WHERE PaymentStatus IN ('UNPAID','PARTIALLY_PAID') AND PROStatus='APPROVED' AND IsDeleted=0) AS payment_pending,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem
                  WHERE PROStatus='APPROVED' AND DATE(ReviewedAt)=CURDATE() AND IsDeleted=0) AS approved_today,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem
                  WHERE PROStatus='REJECTED' AND DATE(ReviewedAt)=CURDATE() AND IsDeleted=0) AS rejected_today,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem
                  WHERE ServiceStatus='RELEASED' AND IsDeleted=0) AS services_released,
                (SELECT COUNT(*) FROM hospital.Service_OrderItem
                  WHERE ServiceStatus='NOT_RELEASED' AND PROStatus='APPROVED'
                    AND PaymentStatus IN ('UNPAID','PARTIALLY_PAID') AND IsDeleted=0) AS services_awaiting_clearance
        """)
        result = db.execute(query).fetchone()

        try:
            ins_count = db.execute(text("""
                SELECT COUNT(*) FROM hospital.Ins_PreAuth
                WHERE UPPER(Status) IN ('PENDING','SUBMITTED')
            """)).scalar() or 0
        except Exception:
            ins_count = 0

        if not result:
            return pro_schema.PRODashboardKPIs(
                pending_reviews=0, opd_pending=0, ipd_pending=0, operations_pending=0,
                payment_pending=0, insurance_pending=0, approved_today=0,
                rejected_today=0, services_released=0, services_awaiting_clearance=0)

        data = dict(result._mapping)
        data['insurance_pending'] = ins_count
        return pro_schema.PRODashboardKPIs(**data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════
# Queue
# ══════════════════════════════════════════════════════════════════════════

@router.get("/orders", response_model=List[pro_schema.PROOrderResponse])
def get_pro_orders(
    source_module: Optional[str] = None,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    order_type: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    try:
        where_clauses = ["so.IsDeleted = 0"]
        params: dict = {"limit": limit}

        if source_module:
            where_clauses.append("so.SourceModule = :source_module")
            params['source_module'] = source_module
        if status:
            # PENDING must also surface orders a reviewer opened and left, or
            # they vanish from the queue with no way back.
            if status.upper() == "PENDING":
                where_clauses.append("so.PROStatus IN ('PENDING','UNDER_REVIEW')")
            else:
                where_clauses.append("so.PROStatus = :status")
                params['status'] = status
        if payment_status:
            where_clauses.append("so.PaymentStatus = :payment_status")
            params['payment_status'] = payment_status
        if order_type:
            where_clauses.append("so.OrderType = :order_type")
            params['order_type'] = order_type

        where_sql = " AND ".join(where_clauses)

        # Lab/Radiology create their Service_Order without DoctorId/DepartmentId, and the patient
        # master does not always hold the UHID, so fall back to the originating order row
        # (Lab_Order / Rad_Order) and resolve its ordering doctor through to a department.
        # OrderNumber is unique in each source table and the LAB-/RAD- prefixes never overlap,
        # so the UNION cannot fan a Service_Order row out into duplicates.
        orders_query = text(f"""
            SELECT so.*,
                   COALESCE(
                       p.PatientName,
                       src.PatientName,
                       -- Orders raised straight through the PRO/OPD endpoints have no Lab_Order or
                       -- Rad_Order row to borrow from, but the UHID identifies the patient, so take
                       -- the name off their most recent order. Doctor and department get no such
                       -- fallback: those vary per order and must not be inherited from another one.
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
                       NULLIF(TRIM(src.OrderedBy), '')
                   ) as DoctorName,
                   COALESCE(
                       (SELECT dept.DepartmentName FROM admin.Master_Department dept WHERE dept.DepartmentId = so.DepartmentId LIMIT 1),
                       (SELECT prof.DepartmentName
                          FROM admin.Master_DoctorProfessional_Detail prof
                          JOIN admin.Master_Doctor_Header dh ON dh.DoctorId = prof.DoctorId
                         WHERE dh.IsDeleted = 0
                           AND TRIM(dh.DoctorName) = TRIM(REPLACE(REPLACE(COALESCE(src.OrderedBy, ''), 'Dr.', ''), 'Dr ', ''))
                         LIMIT 1)
                   ) as DepartmentName
            FROM hospital.Service_Order so
            LEFT JOIN registration.Patient p ON so.UHID = p.Uhid
            LEFT JOIN (
                SELECT OrderNumber, PatientName, OrderedBy FROM hospital.Lab_Order
                UNION ALL
                SELECT OrderNumber, PatientName, OrderedBy FROM hospital.Rad_Order
            ) src ON src.OrderNumber = so.OrderNo
            WHERE {where_sql}
            ORDER BY so.CreatedAt DESC
            LIMIT :limit
        """)

        orders_rows = db.execute(orders_query, params).fetchall()
        if not orders_rows:
            return []

        order_ids = [row._mapping["ServiceOrderId"] for row in orders_rows]

        # One query for all items rather than one per order.
        items_rows = db.execute(text("""
            SELECT * FROM hospital.Service_OrderItem
            WHERE ServiceOrderId IN :ids AND IsDeleted = 0
            ORDER BY ServiceOrderItemId
        """), {"ids": tuple(order_ids)}).fetchall()

        items_by_order: dict = {}
        for item in items_rows:
            d = dict(item._mapping)
            items_by_order.setdefault(d["ServiceOrderId"], []).append(d)

        result_list = []
        for order_row in orders_rows:
            order_dict = dict(order_row._mapping)
            oid = order_dict["ServiceOrderId"]
            order_dict["Items"] = items_by_order.get(oid, [])
            # Tell the screen how much insurance is actually authorised, so the
            # reviewer sees the real ceiling instead of a free-text field.
            order_dict["AuthorizedInsuranceCap"] = float(
                gate.approved_insurance_cover(db, oid))
            result_list.append(order_dict)

        return result_list
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/pending", response_model=List[pro_schema.PROOrderResponse])
def get_pending_pro_orders(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    return get_pro_orders(status="PENDING", limit=limit, db=db)


@router.get("/orders/{order_id}/release-status")
def get_release_status(order_id: int, db: Session = Depends(get_db)):
    """Why each item on this order can or cannot be released, item by item.

    This is ``can_release_service`` exposed read-only, so the Service Release
    Monitor shows the actual blocking reasons rather than guessing from status
    columns.
    """
    items = db.execute(text("""
        SELECT ServiceOrderItemId, ItemName, ServiceStatus
        FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :oid AND IsDeleted = 0
        ORDER BY ServiceOrderItemId
    """), {"oid": order_id}).fetchall()

    if not items:
        raise HTTPException(status_code=404, detail="Service order not found")

    out = []
    for row in items:
        decision = gate.evaluate_release(db, row.ServiceOrderItemId)
        out.append({
            "ServiceOrderItemId": row.ServiceOrderItemId,
            "ItemName": row.ItemName,
            "ServiceStatus": row.ServiceStatus,
            "canRelease": decision.allowed,
            "blockers": decision.blockers,
            "patientResponsibility": float(decision.patient_responsibility),
            "paid": float(decision.paid),
        })
    return {"ServiceOrderId": order_id, "items": out}


# ══════════════════════════════════════════════════════════════════════════
# Approve
# ══════════════════════════════════════════════════════════════════════════

@router.post("/orders/{order_id}/approve")
def approve_pro_order(
    order_id: int,
    payload: pro_schema.PROOrderApproveRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("PRO")),
):
    """Approve (and/or reject) the items on an order and raise the advance bill.

    One transaction: item decisions, order status, advance bill and -- when the
    patient owes nothing -- the financial clearance and service release all
    commit together or not at all.
    """
    try:
        # Lock the order first. Two reviewers hitting Approve at the same moment
        # used to both read PROStatus='PENDING' and both raise an advance bill;
        # now the second waits here and then fails the already-approved check.
        order_info = db.execute(text("""
            SELECT ServiceOrderId, UHID, PROStatus, OrderStatus, IsDeleted
            FROM hospital.Service_Order
            WHERE ServiceOrderId = :order_id
            FOR UPDATE
        """), {"order_id": order_id}).fetchone()

        if not order_info or order_info.IsDeleted:
            raise HTTPException(status_code=404, detail="Service Order not found")
        if order_info.OrderStatus == 'CANCELLED':
            raise HTTPException(status_code=409, detail="A cancelled order cannot be approved.")
        if order_info.PROStatus == 'APPROVED':
            raise HTTPException(status_code=409, detail="This order has already been approved. Duplicate approval is not permitted.")
        if order_info.PROStatus == 'REJECTED':
            raise HTTPException(status_code=409, detail="A rejected order cannot be approved. Please create a new order.")

        uhid = order_info.UHID
        if not payload.Items:
            raise HTTPException(status_code=400, detail="At least one item decision is required.")

        insurance_cap_remaining = gate.approved_insurance_cover(db, order_id)
        auth_status = gate.authorization_status_for(db, order_id)

        approved_any = False

        for decision_in in payload.Items:
            db_item = db.execute(text("""
                SELECT ServiceOrderItemId, ItemName, Quantity, MasterPrice, PROPrice,
                       AuthorizedDiscount, PROStatus, IsDeleted
                FROM hospital.Service_OrderItem
                WHERE ServiceOrderItemId = :id AND ServiceOrderId = :oid
                FOR UPDATE
            """), {"id": decision_in.ServiceOrderItemId, "oid": order_id}).fetchone()

            if not db_item or db_item.IsDeleted:
                raise HTTPException(
                    status_code=404,
                    detail=f"Service order item {decision_in.ServiceOrderItemId} is not part of this order.")
            if db_item.PROStatus in ('APPROVED', 'REJECTED'):
                raise HTTPException(
                    status_code=409,
                    detail=f"Item '{db_item.ItemName}' has already been {db_item.PROStatus.lower()}.")

            # ── Rejected item: record the reason, bill nothing ──────────────
            if decision_in.Decision == "REJECTED":
                reason = (decision_in.RejectionReason or "").strip()
                if not reason:
                    raise HTTPException(
                        status_code=400,
                        detail=f"A rejection reason is required for '{db_item.ItemName}'.")
                db.execute(text("""
                    UPDATE hospital.Service_OrderItem
                    SET PROStatus = 'REJECTED', RejectionReason = :reason,
                        ReviewedBy = :by, ReviewedAt = NOW(),
                        GrossAmount = 0, NetAmount = 0,
                        InsuranceCoveredAmount = 0, PatientResponsibility = 0,
                        PaymentStatus = 'NOT_REQUIRED', FinancialStatus = 'NOT_CLEARED',
                        ServiceStatus = 'CANCELLED', UpdatedAt = NOW()
                    WHERE ServiceOrderItemId = :id
                """), {"reason": reason, "by": actor.username,
                       "id": decision_in.ServiceOrderItemId})
                log_pro_audit(db, order_id, decision_in.ServiceOrderItemId, uhid,
                              'ITEM_REJECTED', db_item.PROStatus, 'REJECTED', reason, actor)
                continue

            # ── Approved item: the backend does the arithmetic ──────────────
            problem = gate.validate_pricing(
                item_name=db_item.ItemName,
                master_price=db_item.MasterPrice,
                quantity=db_item.Quantity,
                pro_price=decision_in.PROPrice,
                discount=decision_in.AuthorizedDiscount,
            )
            if problem:
                raise HTTPException(status_code=400, detail=problem)

            amounts = gate.compute_item_amounts(
                quantity=db_item.Quantity,
                pro_price=decision_in.PROPrice,
                discount=decision_in.AuthorizedDiscount,
                insurance_cover=decision_in.InsuranceCoveredAmount,
                insurance_cap=insurance_cap_remaining,
            )
            # Each item consumes part of the order's authorised cover.
            insurance_cap_remaining -= amounts.insurance

            if amounts.insurance > 0 and auth_status not in gate.AUTH_PAYS:
                raise HTTPException(
                    status_code=400,
                    detail=(f"Insurance cover cannot be applied to '{db_item.ItemName}': "
                            f"the pre-authorization for this order is {auth_status}."))

            if gate.money(db_item.PROPrice) != amounts.pro_price:
                log_pro_audit(db, order_id, decision_in.ServiceOrderItemId, uhid,
                              'PRICE_UPDATED', str(db_item.PROPrice),
                              str(amounts.pro_price), "PRO adjusted the price", actor)
            if gate.money(db_item.AuthorizedDiscount) != amounts.discount:
                log_pro_audit(db, order_id, decision_in.ServiceOrderItemId, uhid,
                              'DISCOUNT_UPDATED', str(db_item.AuthorizedDiscount),
                              str(amounts.discount), "PRO authorised a discount", actor)

            params = amounts.as_params()
            params.update({
                "ServiceOrderItemId": decision_in.ServiceOrderItemId,
                "AuthorizationStatus": auth_status,
                "by": actor.username,
            })
            db.execute(text("""
                UPDATE hospital.Service_OrderItem
                SET PROPrice = :PROPrice, AuthorizedDiscount = :AuthorizedDiscount,
                    GrossAmount = :GrossAmount, NetAmount = :NetAmount,
                    InsuranceCoveredAmount = :InsuranceCoveredAmount,
                    PatientResponsibility = :PatientResponsibility,
                    AuthorizationStatus = :AuthorizationStatus,
                    PROStatus = 'APPROVED', RejectionReason = NULL,
                    ReviewedBy = :by, ReviewedAt = NOW(), UpdatedAt = NOW()
                WHERE ServiceOrderItemId = :ServiceOrderItemId
            """), params)

            approved_any = True
            log_pro_audit(db, order_id, decision_in.ServiceOrderItemId, uhid,
                          'SERVICE_APPROVED', 'PENDING', 'APPROVED',
                          f"Approved at {amounts.patient} patient responsibility", actor)

        # ── Every item must be decided before the order moves on ────────────
        undecided = db.execute(text("""
            SELECT COUNT(*) FROM hospital.Service_OrderItem
            WHERE ServiceOrderId = :oid AND IsDeleted = 0
              AND PROStatus NOT IN ('APPROVED','REJECTED')
        """), {"oid": order_id}).scalar()

        if undecided:
            raise HTTPException(
                status_code=400,
                detail=(f"{undecided} item(s) on this order have no decision. Approve or "
                        f"reject every item in one review."))

        db.execute(text("""
            UPDATE hospital.Service_Order
            SET ReviewedBy = :by, ReviewedAt = NOW(), UpdatedAt = NOW()
            WHERE ServiceOrderId = :oid
        """), {"by": actor.username, "oid": order_id})

        if not approved_any:
            # Everything was rejected: no bill, no release.
            gate.sync_order_from_items(db, order_id)
            log_pro_audit(db, order_id, None, uhid, 'SERVICE_REJECTED', 'PENDING',
                          'REJECTED', "All items rejected during review", actor)
            db.commit()
            return {"message": "All items rejected. No advance bill was raised.",
                    "ServiceOrderId": order_id, "AdvanceRaised": False}

        responsibility, _ = gate.order_financials(db, order_id)

        if responsibility <= 0:
            # Nothing to collect. That is still a financial decision, so it is
            # recorded as a clearance and the release goes through the same gate
            # every other release does -- which is what makes it impossible to
            # release an item whose insurance authorization is still pending.
            db.execute(text("""
                UPDATE hospital.Service_OrderItem
                SET PaymentStatus = 'NOT_REQUIRED', UpdatedAt = NOW()
                WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
            """), {"oid": order_id})

            released, blocked = [], []
            item_ids = [r[0] for r in db.execute(text("""
                SELECT ServiceOrderItemId FROM hospital.Service_OrderItem
                WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
            """), {"oid": order_id})]

            for item_id in item_ids:
                decision = gate.release_item(
                    db, item_id=item_id, released_by=actor.username, role=actor.role,
                    reason="Zero patient responsibility",
                    clearance_type="ZERO_RESPONSIBILITY")
                if decision.allowed:
                    released.append(item_id)
                    log_pro_audit(db, order_id, item_id, uhid, 'SERVICE_RELEASED',
                                  'NOT_RELEASED', 'RELEASED',
                                  "Auto-released: nothing payable", actor)
                else:
                    blocked.append({"ServiceOrderItemId": item_id,
                                    "blockers": decision.blockers})

            gate.sync_order_from_items(db, order_id)
            db.commit()
            return {
                "message": ("Approved. Nothing is payable, so the services were released."
                            if not blocked else
                            "Approved. Nothing is payable, but some items could not be released."),
                "ServiceOrderId": order_id,
                "AdvanceRaised": False,
                "PatientResponsibility": 0.0,
                "Released": released,
                "Blocked": blocked,
            }

        # ── Money is owed: raise exactly one advance bill ────────────────────
        advance_no = f"ADV-{order_id}-{int(datetime.now().timestamp())}"
        try:
            db.execute(text("""
                INSERT INTO hospital.Billing_Advance
                    (AdvanceNo, ServiceOrderId, UHID, TotalAmount, PaidAmount, Status, CreatedBy)
                VALUES (:AdvanceNo, :ServiceOrderId, :UHID, :TotalAmount, 0, 'PENDING', :CreatedBy)
            """), {"AdvanceNo": advance_no, "ServiceOrderId": order_id, "UHID": uhid,
                   "TotalAmount": responsibility, "CreatedBy": actor.username})
        except IntegrityError:
            # ux_billing_advance_live_order: a live advance bill already exists
            # for this order. The order cannot be approved twice, so this means
            # a concurrent request won -- report the conflict rather than
            # silently continuing with someone else's bill.
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="An advance bill already exists for this order. It may have been approved concurrently.")

        db.execute(text("""
            UPDATE hospital.Service_OrderItem
            SET PaymentStatus = CASE WHEN PatientResponsibility > 0 THEN 'UNPAID' ELSE 'NOT_REQUIRED' END,
                FinancialStatus = 'NOT_CLEARED', ServiceStatus = 'NOT_RELEASED', UpdatedAt = NOW()
            WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
        """), {"oid": order_id})

        gate.sync_order_from_items(db, order_id)

        log_pro_audit(db, order_id, None, uhid, 'ADVANCE_BILL_CREATED', '0',
                      str(responsibility),
                      f"Advance bill {advance_no} raised for {responsibility}", actor)

        db.commit()
        return {
            "message": "PRO approval successful. Advance bill raised; collect payment in Billing.",
            "ServiceOrderId": order_id,
            "AdvanceRaised": True,
            "AdvanceNo": advance_no,
            "PatientResponsibility": float(responsibility),
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════
# Reject
# ══════════════════════════════════════════════════════════════════════════

@router.post("/orders/{order_id}/reject")
def reject_pro_order(
    order_id: int,
    reason: Optional[str] = Query(None, description="Deprecated: send the reason in the body instead"),
    payload: Optional[pro_schema.PROOrderRejectRequest] = Body(None),
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("PRO")),
):
    """Reject a whole order. The reason is mandatory and is stored on the order.

    It used to live only in PRO_AuditLog, so no screen could tell a doctor why
    their order was refused.
    """
    try:
        final_reason = ((payload.Reason if payload else None) or reason or "").strip()
        if not final_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is mandatory")

        order_info = db.execute(text("""
            SELECT UHID, PROStatus, IsDeleted FROM hospital.Service_Order
            WHERE ServiceOrderId = :order_id
            FOR UPDATE
        """), {"order_id": order_id}).fetchone()

        if not order_info or order_info.IsDeleted:
            raise HTTPException(status_code=404, detail="Service Order not found")
        if order_info.PROStatus == 'REJECTED':
            raise HTTPException(status_code=409, detail="Order is already rejected")
        if order_info.PROStatus == 'APPROVED':
            raise HTTPException(
                status_code=409,
                detail="An approved order cannot be rejected. Cancel the advance bill in Billing first.")

        uhid = order_info.UHID
        db.execute(text("""
            UPDATE hospital.Service_Order
            SET PROStatus = 'REJECTED', RejectionReason = :reason,
                ReviewedBy = :by, ReviewedAt = NOW(),
                PaymentStatus = 'NOT_REQUIRED', FinancialStatus = 'NOT_CLEARED',
                ServiceStatus = 'NOT_RELEASED', UpdatedAt = NOW()
            WHERE ServiceOrderId = :order_id
        """), {"order_id": order_id, "reason": final_reason, "by": actor.username})

        # CANCELLED, not merely un-released: a rejected service must never
        # appear in a Lab, Radiology or OT work queue.
        db.execute(text("""
            UPDATE hospital.Service_OrderItem
            SET PROStatus = 'REJECTED', RejectionReason = :reason,
                ReviewedBy = :by, ReviewedAt = NOW(),
                PaymentStatus = 'NOT_REQUIRED', FinancialStatus = 'NOT_CLEARED',
                ServiceStatus = 'CANCELLED',
                GrossAmount = 0, NetAmount = 0, InsuranceCoveredAmount = 0,
                PatientResponsibility = 0, UpdatedAt = NOW()
            WHERE ServiceOrderId = :order_id AND IsDeleted = 0
        """), {"order_id": order_id, "reason": final_reason, "by": actor.username})

        log_pro_audit(db, order_id, None, uhid, 'SERVICE_REJECTED', 'PENDING',
                      'REJECTED', final_reason, actor)

        db.commit()
        return {"message": "Order rejected successfully", "Reason": final_reason}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════
# Order creation from OPD/IPD screens
# ══════════════════════════════════════════════════════════════════════════

_MASTER_PRICE_SQL = {
    "LAB": "SELECT TestPrice AS Price FROM admin.Master_LabTest "
           "WHERE (TestId = :item_id OR TestName = :item_name) AND IsDeleted = 0 LIMIT 1",
    "RADIOLOGY": "SELECT ServicePrice AS Price FROM admin.Master_RadiologyService "
                 "WHERE (RadiologyServiceId = :item_id OR ServiceName = :item_name) AND IsDeleted = 0 LIMIT 1",
    # Operations live in two masters (major and minor) with lowercase column
    # names and a `status` flag instead of IsDeleted.
    "OPERATION": "SELECT defaultCharge AS Price FROM ("
                 "  SELECT id, operationName, defaultCharge, status FROM admin.Mst_MajorOperation"
                 "  UNION ALL"
                 "  SELECT id, operationName, defaultCharge, status FROM admin.Mst_MinorOperation"
                 ") ops WHERE (ops.id = :item_id OR ops.operationName = :item_name) "
                 "AND COALESCE(ops.status,'Active') <> 'Inactive' LIMIT 1",
}


def _master_price(db: Session, item_type: str, item_id, item_name: str) -> Decimal:
    """Look the price up in the service master.

    A price posted by the client is a suggestion; the master is the record. This
    is what makes "the master price is read-only to the PRO" true rather than a
    UI convention.
    """
    sql = _MASTER_PRICE_SQL.get(item_type)
    if not sql:
        return gate.ZERO
    try:
        numeric_id = int(item_id)
    except (TypeError, ValueError):
        numeric_id = -1
    try:
        row = db.execute(text(sql), {"item_id": numeric_id, "item_name": item_name}).fetchone()
    except Exception:
        return gate.ZERO
    return gate.money(row.Price) if row and row.Price is not None else gate.ZERO


@router.post("/orders/create")
def create_service_order_from_modal(
    payload: pro_schema.CreateServiceOrderRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("PRO", "DOCTOR", "NURSE", "RECEPTION", "IPD")),
):
    """Create a Service Order from an OPD/IPD screen. It starts life PENDING."""
    try:
        src_mod = payload.SourceModule if payload.SourceModule in ('OPD', 'IPD', 'EMERGENCY') else 'OPD'
        order_type = payload.OrderType if payload.OrderType in ('LAB', 'RADIOLOGY', 'OPERATION', 'OTHER') else 'OTHER'

        if not payload.Items:
            raise HTTPException(status_code=400, detail="A service order needs at least one item.")

        order_no = f"SO-{src_mod[:2]}-{int(datetime.now().timestamp())}"

        # Every workflow status is fixed here, not taken from the caller.
        db.execute(text("""
            INSERT INTO hospital.Service_Order (
                OrderNo, UHID, EncounterId, AdmissionId, DoctorId, DepartmentId,
                OrderType, SourceModule, OrderDate, OrderStatus, PROStatus,
                PaymentStatus, FinancialStatus, ServiceStatus, AuthorizationStatus,
                CreatedBy, CreatedAt
            ) VALUES (
                :OrderNo, :UHID, :EncounterId, :AdmissionId, :DoctorId, :DepartmentId,
                :OrderType, :SourceModule, NOW(), 'ACTIVE', 'PENDING',
                'UNPAID', 'NOT_CLEARED', 'NOT_RELEASED', 'NOT_REQUIRED',
                :CreatedBy, NOW()
            )
        """), {
            "OrderNo": order_no, "UHID": payload.UHID,
            "EncounterId": payload.EncounterId, "AdmissionId": payload.AdmissionId,
            "DoctorId": payload.DoctorId, "DepartmentId": payload.DepartmentId,
            "OrderType": order_type, "SourceModule": src_mod,
            "CreatedBy": actor.username,
        })
        order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        for item in payload.Items:
            item_type = item.ItemType if item.ItemType in ('LAB', 'RADIOLOGY', 'OPERATION', 'MEDICINE', 'OTHER') else 'OTHER'
            price = _master_price(db, item_type, item.ItemId, item.ItemName)
            qty = max(1, int(item.Quantity or 1))

            db.execute(text("""
                INSERT INTO hospital.Service_OrderItem (
                    ServiceOrderId, ItemType, ItemId, ItemName, Quantity, UOM,
                    MasterPrice, OriginalPrice, PROPrice, AuthorizedDiscount,
                    GrossAmount, NetAmount, InsuranceCoveredAmount, PatientResponsibility,
                    PROStatus, PaymentStatus, FinancialStatus, ServiceStatus,
                    AuthorizationStatus, CreatedAt
                ) VALUES (
                    :ServiceOrderId, :ItemType, :ItemId, :ItemName, :Quantity, :UOM,
                    :MasterPrice, :MasterPrice, 0.00, 0.00,
                    0.00, 0.00, 0.00, 0.00,
                    'PENDING', 'UNPAID', 'NOT_CLEARED', 'NOT_RELEASED',
                    'NOT_REQUIRED', NOW()
                )
            """), {
                "ServiceOrderId": order_id, "ItemType": item_type,
                "ItemId": str(item.ItemId), "ItemName": item.ItemName,
                "Quantity": qty, "UOM": item.UOM or "Unit", "MasterPrice": price,
            })

        log_pro_audit(db, order_id, None, payload.UHID, 'ORDER_CREATED', 'NONE',
                      'PENDING', f"Created from {src_mod}", actor)
        db.commit()
        return {"message": "Service order created successfully",
                "ServiceOrderId": order_id, "OrderNo": order_no}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders/by-uhid/{uhid}")
def get_orders_by_uhid(uhid: str, db: Session = Depends(get_db)):
    """Every service order for a patient, with what has actually been collected."""
    try:
        orders_rows = db.execute(text("""
            SELECT so.*, p.PatientName,
                   (SELECT d.DoctorName FROM admin.Master_Doctor_Header d
                     WHERE d.DoctorId = so.DoctorId LIMIT 1) as DoctorName
            FROM hospital.Service_Order so
            LEFT JOIN registration.Patient p ON so.UHID = p.Uhid
            WHERE so.UHID = :uhid AND so.IsDeleted = 0
            ORDER BY so.CreatedAt DESC
        """), {"uhid": uhid}).fetchall()

        result_list = []
        for order_row in orders_rows:
            order_dict = dict(order_row._mapping)
            oid = order_dict["ServiceOrderId"]
            items_rows = db.execute(text("""
                SELECT * FROM hospital.Service_OrderItem
                WHERE ServiceOrderId = :order_id AND IsDeleted = 0
            """), {"order_id": oid}).fetchall()
            order_dict["Items"] = [dict(item._mapping) for item in items_rows]

            responsibility, paid = gate.order_financials(db, oid)
            order_dict["PatientResponsibility"] = float(responsibility)
            order_dict["PaidAdvance"] = float(paid)
            order_dict["Outstanding"] = float(max(gate.ZERO, responsibility - paid))
            result_list.append(order_dict)

        return result_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# PRO never collects payment. Collection lives in the Billing portal at
# POST /billing/advance/{advance_id}/pay, which is role-gated to Billing.

@router.get("/audit", response_model=List[pro_schema.PROAuditLogResponse])
def get_audit_logs(limit: int = Query(500, ge=1, le=2000), db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT al.*, p.PatientName
            FROM hospital.PRO_AuditLog al
            LEFT JOIN registration.Patient p ON al.UHID = p.Uhid
            ORDER BY al.CreatedAt DESC
            LIMIT :limit
        """), {"limit": limit}).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insurance")
def get_insurance_authorizations(db: Session = Depends(get_db)):
    """Pre-authorizations, which are what gate a service.

    This used to list Billing_InsuranceClaim rows. A claim is raised after the
    service to recover money; it says nothing about whether the service was
    authorised beforehand, so showing claims on an authorization screen invited
    exactly the confusion the workflow forbids.
    """
    try:
        rows = db.execute(text("""
            SELECT pa.*, so.OrderNo, so.SourceModule, so.OrderType
            FROM hospital.Ins_PreAuth pa
            LEFT JOIN hospital.Service_Order so ON so.ServiceOrderId = pa.ServiceOrderId
            ORDER BY pa.PreAuthId DESC
            LIMIT 200
        """)).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payments/pending")
def get_pending_payments(db: Session = Depends(get_db)):
    """Read-only view of advance bills awaiting collection.

    PRO monitors; Billing collects.
    """
    try:
        rows = db.execute(text("""
            SELECT ba.*, p.PatientName,
                   (ba.TotalAmount - ba.PaidAmount + ba.RefundedAmount) AS Outstanding,
                   (SELECT GROUP_CONCAT(soi.ItemName SEPARATOR ', ')
                      FROM hospital.Service_OrderItem soi
                     WHERE soi.ServiceOrderId = ba.ServiceOrderId AND soi.IsDeleted = 0
                    ) as ServiceSummary
            FROM hospital.Billing_Advance ba
            LEFT JOIN registration.Patient p ON ba.UHID = p.Uhid
            WHERE ba.Status IN ('PENDING','PARTIALLY_PAID') AND ba.IsDeleted = 0
            ORDER BY ba.AdvanceId DESC LIMIT 200
        """)).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
