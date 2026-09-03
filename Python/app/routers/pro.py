"""The PRO desk: review a doctor's service order, price it, approve or reject it.

Every mutation here runs through two shared modules rather than doing its own
arithmetic and its own gating:

* ``core.workflow_gate`` owns the money (``compute_item_amounts``), the
  authorization cap (``approved_insurance_cover``) and the release decision
  (``evaluate_release`` / ``release_item``).
* ``core.billing_engine`` owns the advance bill and the payment ledger.

That split matters because this router previously did all of it inline and got
it wrong in ways that let services through unpaid:

* the approve endpoint stored the client's ``InsuranceCoveredAmount`` and
  ``PatientResponsibility`` verbatim, checking only that they summed to the net.
  Posting ``{"InsuranceCoveredAmount": 4500, "PatientResponsibility": 0}`` on a
  self-pay order therefore passed validation, raised no advance bill, and
  auto-released the service with nothing collected;
* ``GrossAmount`` was set to the unit ``PROPrice``, so every item with
  Quantity > 1 was billed for one unit;
* nothing compared ``PROPrice`` against ``MasterPrice``, so "the master price is
  read-only" was not enforced anywhere;
* the payment endpoint took both the amount owed AND the amount paid from the
  request body, so ``{"TotalAmount": 1, "PaidAmount": 1}`` cleared any order.
"""
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..core import billing_engine as billing
from ..core import workflow_gate as gate
from ..core.rbac import Actor, require_roles
from ..core.workflow_gate import CENT, ZERO, money
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
                -- Operations is defined by WHAT was ordered, not by which module raised it:
                -- an operation on an IPD admission is still an operation. This counted
                -- SourceModule='EMERGENCY', so the tile showed emergency orders of every
                -- type and showed no operations at all.
                (SELECT COUNT(*) FROM hospital.Service_Order WHERE OrderType='OPERATION' AND PROStatus IN ('PENDING', 'UNDER_REVIEW') AND IsDeleted=0) as operations_pending,
                -- Only an APPROVED item the patient actually owes money on is awaiting
                -- payment. Counting every UNPAID row swept in items still under review
                -- and items PRO had rejected, so this tile could never reach zero.
                (SELECT COUNT(*) FROM hospital.Service_OrderItem WHERE PaymentStatus='UNPAID' AND PROStatus='APPROVED' AND PatientResponsibility > 0 AND ServiceStatus <> 'CANCELLED' AND IsDeleted=0) as payment_pending,
                -- Pre-authorization, not claims. A claim is raised after the fact and
                -- says nothing about whether a service may proceed.
                (SELECT COUNT(*) FROM hospital.Ins_PreAuth WHERE UPPER(Status) IN ('PENDING','SUBMITTED')) as insurance_pending,
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
            if status == "PENDING":
                # UNDER_REVIEW is still pending a decision; excluding it hid orders
                # a PRO had opened but not finished.
                where_clauses.append("so.PROStatus IN ('PENDING', 'UNDER_REVIEW')")
            else:
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
            # How much insurance an APPROVED pre-authorization actually permits on
            # this order, so the Price Review drawer shows the ceiling instead of an
            # editable field the backend will silently override.
            order_dict["AuthorizedInsuranceCap"] = float(
                gate.approved_insurance_cover(db, order_dict["ServiceOrderId"]))
            order_dict["AuthorizationStatus"] = gate.authorization_status_for(
                db, order_dict["ServiceOrderId"])
            result_list.append(order_dict)
            
        return result_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/pending", response_model=List[pro_schema.PROOrderResponse])
def get_pending_pro_orders(db: Session = Depends(get_db)):
    # Legacy endpoint mapping to new filter
    return get_pro_orders(status="PENDING", db=db)

def log_pro_audit(db: Session, order_id: int, item_id, uhid: str, action: str,
                  prev, new_val, reason: str, changed_by: str = 'PRO_USER',
                  changed_by_role: str = None):
    """Append one row to the PRO audit trail.

    ``changed_by`` used to be the hardcoded string 'PRO_USER' on every call, so
    the audit log recorded that "PRO_USER" approved everything and could not
    answer who actually did. It now takes the authenticated actor.
    """
    db.execute(text("""
        INSERT INTO hospital.PRO_AuditLog
            (ServiceOrderId, ServiceOrderItemId, UHID, Action, PreviousValue,
             NewValue, Reason, ChangedBy, ChangedByRole)
        VALUES (:order_id, :item_id, :uhid, :action, :prev, :new_val, :reason,
                :changed_by, :changed_by_role)
    """), {
        "order_id": order_id, "item_id": item_id, "uhid": uhid,
        "action": action,
        "prev": None if prev is None else str(prev),
        "new_val": None if new_val is None else str(new_val),
        "reason": (reason or "")[:500],
        "changed_by": (changed_by or "UNATTRIBUTED")[:100],
        "changed_by_role": (changed_by_role or None) and changed_by_role[:100],
    })


def release_order_items(db: Session, order_id: int, released_by: str, reason: str,
                        role: str = "SYSTEM", clearance_type: str = "PAID") -> list:
    """Release the order's items -- each one only if it passes every gate.

    Kept under its old name because ``billing_advance`` imports it, but the
    behaviour is now the opposite of what it was. It used to insert an ACTIVE
    ``Service_Release`` row for *every* item on the order with no checks at all,
    which is how a rejected item, an item whose insurance authorization was
    still pending, and an item on a part-paid order all reached the technician
    worklists. It now delegates to ``billing_engine.release_eligible_items``,
    which runs ``can_release_service`` per item and skips the ones that fail.
    """
    return billing.release_eligible_items(
        db, order_id, released_by=released_by, role=role, reason=reason,
        clearance_type=clearance_type,
    )


def _lock_order(db: Session, order_id: int) -> dict:
    """Take a row lock on the order, or 404.

    The lock is what makes two simultaneous approvals of the same order
    serialise. Without it both transactions read "no advance bill exists", both
    inserted one, and the loser died on a duplicate-key error *after* having
    already written its approval.
    """
    row = db.execute(text("""
        SELECT * FROM hospital.Service_Order
        WHERE ServiceOrderId = :id AND IsDeleted = 0
        FOR UPDATE
    """), {"id": order_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Service order not found.")
    return dict(row._mapping)


@router.post("/orders/{order_id}/approve")
def approve_pro_order(
    order_id: int,
    payload: pro_schema.PROOrderApproveRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("PRO")),
):
    """Review an order: price each item, approve or reject it, raise the advance bill.

    The whole review is ONE transaction. PRO approval and the advance bill it
    obliges are written together or not at all, so the state "PROStatus =
    APPROVED with no advance bill" -- which order 19 (RAD-D0C30821) was sitting
    in, released and unpaid -- cannot be produced.

    Nothing financial is taken from the request except the two figures the PRO
    is actually allowed to set: the unit ``PROPrice`` and the
    ``AuthorizedDiscount``. Quantity comes from the stored item, the master
    price is read-only, insurance cover is capped at what an approved
    pre-authorization linked to this order permits, and patient responsibility
    is the remainder. The old endpoint stored the client's insurance and
    patient figures after checking only that they added up to the net -- so
    "insurance pays all of it" was a claim the client could simply make.
    """
    order = _lock_order(db, order_id)
    uhid = order["UHID"]

    if order.get("OrderStatus") == "CANCELLED":
        raise HTTPException(status_code=409, detail="This service order is cancelled.")

    if not payload.Items:
        raise HTTPException(status_code=400, detail="At least one item must be reviewed.")

    try:
        # ── Load the items being reviewed, locked ───────────────────────────
        item_ids = [i.ServiceOrderItemId for i in payload.Items]
        if len(set(item_ids)) != len(item_ids):
            raise HTTPException(status_code=400,
                                detail="The same item appears more than once in this review.")

        stored_rows = db.execute(text("""
            SELECT * FROM hospital.Service_OrderItem
            WHERE ServiceOrderItemId IN :ids AND IsDeleted = 0
            FOR UPDATE
        """), {"ids": tuple(item_ids)}).fetchall()
        stored = {r.ServiceOrderItemId: dict(r._mapping) for r in stored_rows}

        missing = [i for i in item_ids if i not in stored]
        if missing:
            raise HTTPException(
                status_code=404,
                detail=f"Service order item(s) {missing} do not exist or are deleted.")

        wrong_order = [i for i, row in stored.items()
                       if row["ServiceOrderId"] != order_id]
        if wrong_order:
            raise HTTPException(
                status_code=400,
                detail=f"Item(s) {wrong_order} do not belong to service order {order_id}.")

        # Re-reviewing an item whose service has already been paid for or
        # performed would silently re-price work that is done and money that is
        # collected. Re-review of a still-pending decision is fine.
        frozen = [i for i, row in stored.items()
                  if row.get("ServiceStatus") in ("IN_PROGRESS", "COMPLETED")
                  or row.get("PaymentStatus") in ("PAID", "PARTIALLY_PAID")]
        if frozen:
            raise HTTPException(
                status_code=409,
                detail=(f"Item(s) {frozen} have already been paid for or performed and "
                        f"cannot be re-priced. Cancel and re-order instead."))

        # ── Insurance: what an approved pre-authorization actually permits ──
        cap_remaining = gate.approved_insurance_cover(db, order_id)
        auth_status = gate.authorization_status_for(db, order_id)

        approved_any = False

        for line in payload.Items:
            row = stored[line.ServiceOrderItemId]
            name = row["ItemName"]

            # ── Rejection ───────────────────────────────────────────────────
            if line.Decision == "REJECTED":
                if not (line.RejectionReason or "").strip():
                    raise HTTPException(
                        status_code=400,
                        detail=f"A rejection reason is mandatory for '{name}'.")
                db.execute(text("""
                    UPDATE hospital.Service_OrderItem
                    SET PROStatus = 'REJECTED', RejectionReason = :reason,
                        ReviewedBy = :by, ReviewedAt = NOW(),
                        PROPrice = 0.00, AuthorizedDiscount = 0.00,
                        GrossAmount = 0.00, NetAmount = 0.00,
                        InsuranceCoveredAmount = 0.00, PatientResponsibility = 0.00,
                        PaymentStatus = 'NOT_REQUIRED', FinancialStatus = 'NOT_CLEARED',
                        UpdatedAt = NOW()
                    WHERE ServiceOrderItemId = :id
                """), {"reason": line.RejectionReason.strip()[:500],
                       "by": actor.username, "id": line.ServiceOrderItemId})
                log_pro_audit(db, order_id, line.ServiceOrderItemId, uhid,
                              'SERVICE_REJECTED', row.get("PROStatus"), 'REJECTED',
                              line.RejectionReason.strip(), actor.username, actor.role)
                continue

            # ── Pricing, validated against the STORED master price ──────────
            quantity = int(row.get("Quantity") or 1)
            problem = gate.validate_pricing(
                item_name=name,
                master_price=row.get("MasterPrice"),
                quantity=quantity,
                pro_price=line.PROPrice,
                discount=line.AuthorizedDiscount,
            )
            if problem:
                raise HTTPException(status_code=400, detail=problem)

            amounts = gate.compute_item_amounts(
                quantity=quantity,
                pro_price=line.PROPrice,
                discount=line.AuthorizedDiscount,
                insurance_cover=line.InsuranceCoveredAmount,
                insurance_cap=cap_remaining,
            )
            # The cap is a pool across the order's items, so each item consumes
            # from it rather than every item claiming the whole authorised sum.
            cap_remaining = max(ZERO, cap_remaining - amounts.insurance)

            prev_price = money(row.get("PROPrice"))
            prev_disc = money(row.get("AuthorizedDiscount"))

            params = amounts.as_params()
            params.update({"id": line.ServiceOrderItemId, "by": actor.username})
            db.execute(text("""
                UPDATE hospital.Service_OrderItem
                SET PROPrice = :PROPrice, AuthorizedDiscount = :AuthorizedDiscount,
                    GrossAmount = :GrossAmount, NetAmount = :NetAmount,
                    InsuranceCoveredAmount = :InsuranceCoveredAmount,
                    PatientResponsibility = :PatientResponsibility,
                    PROStatus = 'APPROVED', RejectionReason = NULL,
                    AuthorizationStatus = :AuthStatus,
                    ReviewedBy = :by, ReviewedAt = NOW(), UpdatedAt = NOW()
                WHERE ServiceOrderItemId = :id
            """), {**params, "AuthStatus": auth_status})

            if prev_price != amounts.pro_price:
                log_pro_audit(db, order_id, line.ServiceOrderItemId, uhid,
                              'PRICE_UPDATED', prev_price, amounts.pro_price,
                              f"Master {money(row.get('MasterPrice'))} x{quantity}",
                              actor.username, actor.role)
            if prev_disc != amounts.discount:
                log_pro_audit(db, order_id, line.ServiceOrderItemId, uhid,
                              'DISCOUNT_UPDATED', prev_disc, amounts.discount,
                              "PRO authorized discount", actor.username, actor.role)
            if money(line.InsuranceCoveredAmount) != amounts.insurance:
                # Visible when the request asked for more cover than the
                # authorization permits, which is the case worth auditing.
                log_pro_audit(db, order_id, line.ServiceOrderItemId, uhid,
                              'INSURANCE_CAPPED', money(line.InsuranceCoveredAmount),
                              amounts.insurance,
                              f"Capped to approved pre-authorization ({auth_status})",
                              actor.username, actor.role)

            log_pro_audit(db, order_id, line.ServiceOrderItemId, uhid,
                          'SERVICE_APPROVED', row.get("PROStatus"), 'APPROVED',
                          f"Net {amounts.net}, patient {amounts.patient}",
                          actor.username, actor.role)
            approved_any = True

        # ── Order-level rollup, derived from the items ──────────────────────
        db.execute(text("""
            UPDATE hospital.Service_Order
            SET ReviewedBy = :by, ReviewedAt = NOW(),
                AuthorizationStatus = :auth, UpdatedAt = NOW()
            WHERE ServiceOrderId = :oid
        """), {"by": actor.username, "auth": auth_status, "oid": order_id})

        gate.sync_order_from_items(db, order_id)

        still_pending = db.execute(text("""
            SELECT COUNT(*) FROM hospital.Service_OrderItem
            WHERE ServiceOrderId = :oid AND IsDeleted = 0
              AND PROStatus IN ('PENDING', 'UNDER_REVIEW')
        """), {"oid": order_id}).scalar()

        responsibility, paid = gate.order_financials(db, order_id)

        advance_no = None
        released = []

        if still_pending:
            # A part-reviewed order raises nothing yet: billing an order whose
            # remaining items are still unpriced would demand the wrong amount.
            message = (f"{len(payload.Items)} item(s) reviewed. "
                       f"{still_pending} item(s) still awaiting review.")

        elif not approved_any:
            # Every item was rejected. Nothing is payable, so any advance bill
            # raised by an earlier partial approval is voided.
            billing.cancel_advance_for_order(
                db, order_id, by=actor.username,
                reason="All items rejected at PRO review")
            gate.revoke_releases_for_order(
                db, order_id, by=actor.username,
                reason="All items rejected at PRO review")
            message = "All items rejected. No advance bill raised."

        elif responsibility <= ZERO:
            # Nothing for the patient to pay -- fully covered, or fully
            # discounted. Release still goes through the gate, so an order whose
            # insurance authorization is PENDING stays blocked instead of
            # auto-releasing on a cover that has not been agreed.
            billing.apply_financial_status(db, order_id)
            released = billing.release_eligible_items(
                db, order_id, released_by=actor.username, role=actor.role,
                reason="Zero patient responsibility at PRO approval",
                clearance_type="INSURANCE_COVERED" if auth_status in gate.AUTH_PAYS
                               else "ZERO_RESPONSIBILITY",
            )
            for item_id in released:
                log_pro_audit(db, order_id, item_id, uhid, 'SERVICE_RELEASED',
                              'NOT_RELEASED', 'RELEASED',
                              "Auto-released: nothing payable by the patient",
                              actor.username, actor.role)
            message = ("Approved. Nothing payable by the patient; "
                       f"{len(released)} service(s) released.")
            if not released:
                message = ("Approved with nothing payable, but release is still "
                           "blocked: " + (gate.evaluate_release(
                               db, item_ids[0]).reason() or "see the release monitor."))

        else:
            # The money case. The advance bill is raised for the FULL patient
            # responsibility, because release requires that amount collected --
            # billing less than it (which the old AdvanceAmount parameter did)
            # left the patient paid up on paper and the service still blocked.
            advance = billing.upsert_advance_for_order(
                db, order_id=order_id, uhid=uhid, amount=responsibility,
                created_by=actor.username)
            advance_no = advance["AdvanceNo"]
            billing.apply_financial_status(db, order_id)
            log_pro_audit(db, order_id, None, uhid, 'ADVANCE_RAISED',
                          None, responsibility,
                          f"Advance bill {advance_no} raised at PRO approval",
                          actor.username, actor.role)
            message = (f"Approved. Advance bill {advance_no} for {responsibility} "
                       f"raised; services stay blocked until it is paid at Billing.")

        db.commit()
        return {
            "message": message,
            "ServiceOrderId": order_id,
            "AdvanceNo": advance_no,
            "PatientResponsibility": float(responsibility),
            "AuthorizedInsuranceCap": float(gate.approved_insurance_cover(db, order_id)),
            "AuthorizationStatus": auth_status,
            "ItemsReleased": released,
            "ItemsAwaitingReview": int(still_pending or 0),
        }

    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This order was approved by another user at the same moment. "
                   "Reload the order and check its advance bill before retrying.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/{order_id}/reject")
def reject_pro_order(
    order_id: int,
    payload: Optional[pro_schema.PROOrderRejectRequest] = Body(default=None),
    reason: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("PRO")),
):
    """Reject every item on an order, with a mandatory reason.

    Rejection now also UNDOES what an earlier approval put in place: it voids
    the advance bill and revokes the releases. Previously it flipped two status
    columns and left the advance bill payable and the releases ACTIVE, so a
    rejected order stayed on the billing screen and its services stayed on the
    technician worklists.

    The reason may arrive in the body or, for the existing frontend, as a query
    parameter. The old handler raised HTTPException(400) for a missing reason
    inside a ``try`` whose ``except Exception`` re-wrapped it as a 500, so the
    client saw "Internal Server Error" instead of being told what was missing.
    """
    text_reason = ((payload.Reason if payload else None) or reason or "").strip()
    if not text_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is mandatory.")

    order = _lock_order(db, order_id)
    uhid = order["UHID"]

    performed = db.execute(text("""
        SELECT ItemName FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :oid AND IsDeleted = 0
          AND ServiceStatus IN ('IN_PROGRESS', 'COMPLETED')
    """), {"oid": order_id}).fetchall()
    if performed:
        raise HTTPException(
            status_code=409,
            detail=("Cannot reject: " + ", ".join(r.ItemName for r in performed) +
                    " has already been performed. Cancel the remaining items instead."))

    try:
        # Refuses if money was collected -- that has to be refunded first, which
        # keeps the financial history intact rather than stranding a paid bill
        # against a rejected order.
        billing.cancel_advance_for_order(
            db, order_id, by=actor.username, reason=f"Order rejected: {text_reason}")
        gate.revoke_releases_for_order(
            db, order_id, by=actor.username, reason=f"Order rejected: {text_reason}")

        db.execute(text("""
            UPDATE hospital.Service_OrderItem
            SET PROStatus = 'REJECTED', RejectionReason = :reason,
                ReviewedBy = :by, ReviewedAt = NOW(),
                PaymentStatus = 'NOT_REQUIRED', FinancialStatus = 'NOT_CLEARED',
                ServiceStatus = 'NOT_RELEASED', UpdatedAt = NOW()
            WHERE ServiceOrderId = :oid AND IsDeleted = 0
              AND ServiceStatus NOT IN ('IN_PROGRESS', 'COMPLETED')
        """), {"reason": text_reason[:500], "by": actor.username, "oid": order_id})

        db.execute(text("""
            UPDATE hospital.Service_Order
            SET PROStatus = 'REJECTED', RejectionReason = :reason,
                ReviewedBy = :by, ReviewedAt = NOW(),
                PaymentStatus = 'NOT_REQUIRED', FinancialStatus = 'NOT_CLEARED',
                ServiceStatus = 'NOT_RELEASED', UpdatedAt = NOW()
            WHERE ServiceOrderId = :oid
        """), {"reason": text_reason[:500], "by": actor.username, "oid": order_id})

        log_pro_audit(db, order_id, None, uhid, 'SERVICE_REJECTED',
                      order.get("PROStatus"), 'REJECTED', text_reason,
                      actor.username, actor.role)
        db.commit()
        return {"message": "Order rejected. Advance bill voided and releases revoked.",
                "ServiceOrderId": order_id, "Reason": text_reason}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders/create")
def create_service_order_from_modal(
    payload: pro_schema.CreateServiceOrderRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("PRO", "DOCTOR", "NURSE", "RECEPTION", "IPD")),
):
    """Raise a Service Order from an OPD/IPD screen. It starts PENDING and unpriced.

    The master price is looked up in the service catalogue, never taken from the
    request. The old handler did ``price = float(item.MasterPrice or 0.0)`` and
    wrote that into ``MasterPrice`` -- which made "the PRO may not exceed the
    master price" unenforceable, since a caller who wanted to charge 50,000 for
    a 500-rupee test simply declared the master price to be 50,000.

    Every amount other than the master price starts at zero and every status
    starts at its beginning value: pricing is the PRO's decision at review, and
    the previous version pre-filled PROPrice / NetAmount / PatientResponsibility
    from the same untrusted number.
    """
    order_type = payload.OrderType if payload.OrderType in (
        'LAB', 'RADIOLOGY', 'OPERATION', 'OTHER') else 'OTHER'
    src_mod = payload.SourceModule if payload.SourceModule in (
        'OPD', 'IPD', 'EMERGENCY') else 'OPD'

    if not payload.Items:
        raise HTTPException(status_code=400,
                            detail="A service order needs at least one item.")

    try:
        order_no = f"SO-{src_mod[:2]}-{int(datetime.now().timestamp())}"
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
            "OrderNo": order_no,
            "UHID": payload.UHID,
            "EncounterId": payload.EncounterId,
            "AdmissionId": payload.AdmissionId,
            "DoctorId": payload.DoctorId,
            "DepartmentId": payload.DepartmentId,
            "OrderType": order_type,
            "SourceModule": src_mod,
            "CreatedBy": actor.username,
        })
        order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        unpriced = []
        for item in payload.Items:
            item_type = item.ItemType if item.ItemType in (
                'LAB', 'RADIOLOGY', 'OPERATION', 'MEDICINE', 'OTHER') else 'OTHER'

            catalogue_price = gate.lookup_master_price(
                db, item_type=item_type, item_id=item.ItemId, item_name=item.ItemName)
            if catalogue_price is None:
                # Not in any catalogue: recorded at zero so the PRO desk has to
                # price it deliberately, rather than inheriting a number the
                # caller made up.
                catalogue_price = ZERO
                unpriced.append(item.ItemName)

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
                "ServiceOrderId": order_id,
                "ItemType": item_type,
                "ItemId": str(item.ItemId),
                "ItemName": item.ItemName,
                "Quantity": max(1, int(item.Quantity or 1)),
                "UOM": item.UOM or "Unit",
                "MasterPrice": catalogue_price,
            })

        log_pro_audit(db, order_id, None, payload.UHID, 'ORDER_CREATED', 'NONE',
                      'PENDING', f"Created from {src_mod}",
                      actor.username, actor.role)
        db.commit()
        return {
            "message": "Service order created and sent to PRO for review.",
            "ServiceOrderId": order_id,
            "OrderNo": order_no,
            "UnpricedItems": unpriced,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/{order_id}/detail")
def get_order_detail(order_id: int, db: Session = Depends(get_db)):
    """Everything the PRO desk needs about one order, in a single call.

    The order, the tests on it with their pricing and release state, the advance
    bill and receipts behind it, the insurance authorizations, the audit trail,
    and the patient's full record.

    The patient is resolved across all three registration tables. A UHID can be
    registered through the full form, quick registration or emergency
    registration, and the PRO screens only ever carry the UHID -- so a lookup
    against ``registration.Patient`` alone (which is what the list query falls
    back on) misses everyone admitted through the other two doors and the drawer
    would show a patient with no details at all.
    """
    order_row = db.execute(text("""
        SELECT so.*,
               (SELECT d.DoctorName FROM admin.Master_Doctor_Header d
                 WHERE d.DoctorId = so.DoctorId LIMIT 1) AS DoctorName,
               (SELECT dept.DepartmentName FROM admin.Master_Department dept
                 WHERE dept.DepartmentId = so.DepartmentId LIMIT 1) AS DepartmentName
        FROM hospital.Service_Order so
        WHERE so.ServiceOrderId = :oid AND so.IsDeleted = 0
    """), {"oid": order_id}).fetchone()
    if not order_row:
        raise HTTPException(status_code=404, detail="Service order not found.")

    order = dict(order_row._mapping)
    uhid = order["UHID"]

    # ── The tests / services on the order ───────────────────────────────────
    items = [dict(r._mapping) for r in db.execute(text("""
        SELECT * FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :oid AND IsDeleted = 0
        ORDER BY ServiceOrderItemId
    """), {"oid": order_id}).fetchall()]

    for item in items:
        item["Releases"] = [dict(r._mapping) for r in db.execute(text("""
            SELECT ServiceReleaseId, ReleaseDate, ReleasedBy, ReleasedByRole,
                   ReleaseStatus, ReleaseReason, RevokedAt, RevokedBy, RevokeReason
            FROM hospital.Service_Release
            WHERE ServiceOrderItemId = :id
            ORDER BY ServiceReleaseId DESC
        """), {"id": item["ServiceOrderItemId"]}).fetchall()]
        # Why this item can or cannot be performed, straight from the gate the
        # backend actually enforces -- so the drawer explains the same thing the
        # API would refuse with, instead of guessing from status columns.
        decision = gate.evaluate_release(db, item["ServiceOrderItemId"])
        item["CanRelease"] = decision.allowed
        item["Blockers"] = decision.blockers

    # ── The patient, across every registration route ────────────────────────
    patient = None
    for query in (
        """SELECT 'FULL' AS RegistrationMode, Uhid, Title, PatientName, Gender,
                  DateOfBirth, Age, NULL AS ApproximateAge, MaritalStatus, BloodGroup,
                  Nationality, Religion, Occupation, MobileNumber, AlternateMobile,
                  Email, Address1, Address2, City, District, State, Country, PinCode,
                  EmergencyContactName, EmergencyRelationship, EmergencyMobile,
                  Allergies, ChronicDiseases, CurrentMedication,
                  InsuranceRequired, InsuranceProvider, Tpa, PolicyNumber, ValidTill,
                  PatientType, ReferredBy, PrimaryDoctor, Department,
                  RegistrationDate, NULL AS VisitType, NULL AS Priority, NULL AS VisitReason
             FROM registration.PatientRegistration
            WHERE Uhid = :uhid AND COALESCE(IsDeleted, 0) = 0 LIMIT 1""",
        """SELECT 'QUICK' AS RegistrationMode, Uhid, Title, PatientName, Gender,
                  DateOfBirth, Age, NULL AS ApproximateAge, NULL AS MaritalStatus,
                  NULL AS BloodGroup, NULL AS Nationality, NULL AS Religion,
                  NULL AS Occupation, MobileNumber, AlternateMobile,
                  NULL AS Email, NULL AS Address1, NULL AS Address2, NULL AS City,
                  NULL AS District, NULL AS State, NULL AS Country, NULL AS PinCode,
                  NULL AS EmergencyContactName, NULL AS EmergencyRelationship,
                  NULL AS EmergencyMobile, NULL AS Allergies, NULL AS ChronicDiseases,
                  NULL AS CurrentMedication,
                  InsuranceRequired, InsuranceProvider, Tpa, PolicyNumber, ValidTill,
                  NULL AS PatientType, NULL AS ReferredBy, NULL AS PrimaryDoctor,
                  NULL AS Department, RegistrationDate, VisitType, Priority, VisitReason
             FROM registration.QuickRegistration
            WHERE Uhid = :uhid AND COALESCE(IsDeleted, 0) = 0 LIMIT 1""",
        """SELECT 'EMERGENCY' AS RegistrationMode, Uhid, NULL AS Title, PatientName,
                  Gender, NULL AS DateOfBirth, NULL AS Age, ApproximateAge,
                  NULL AS MaritalStatus, NULL AS BloodGroup, NULL AS Nationality,
                  NULL AS Religion, NULL AS Occupation,
                  EmergencyContactPhone AS MobileNumber, NULL AS AlternateMobile,
                  NULL AS Email, NULL AS Address1, NULL AS Address2, NULL AS City,
                  NULL AS District, NULL AS State, NULL AS Country, NULL AS PinCode,
                  EmergencyContactName, NULL AS EmergencyRelationship,
                  EmergencyContactPhone AS EmergencyMobile, NULL AS Allergies,
                  NULL AS ChronicDiseases, NULL AS CurrentMedication,
                  InsuranceRequired, InsuranceProvider, Tpa, PolicyNumber, ValidTill,
                  NULL AS PatientType, NULL AS ReferredBy, NULL AS PrimaryDoctor,
                  NULL AS Department, RegistrationDate, NULL AS VisitType,
                  NULL AS Priority, NULL AS VisitReason
             FROM registration.EmergencyRegistration
            WHERE Uhid = :uhid AND COALESCE(IsDeleted, 0) = 0 LIMIT 1""",
    ):
        try:
            row = db.execute(text(query), {"uhid": uhid}).fetchone()
        except Exception:
            continue
        if row:
            patient = dict(row._mapping)
            break

    if patient is None:
        # Last resort: the name carried on the originating lab/radiology order or
        # the admission, so the drawer at least identifies who this is.
        row = db.execute(text("""
            SELECT PatientName FROM (
                SELECT Uhid, PatientName, OrderedAt FROM hospital.Lab_Order
                UNION ALL
                SELECT Uhid, PatientName, OrderedAt FROM hospital.Rad_Order
            ) x WHERE x.Uhid = :uhid AND NULLIF(TRIM(x.PatientName), '') IS NOT NULL
            ORDER BY x.OrderedAt DESC LIMIT 1
        """), {"uhid": uhid}).fetchone()
        patient = {"Uhid": uhid, "PatientName": row.PatientName if row else None,
                   "RegistrationMode": "UNKNOWN"}

    # ── Admission, when this is an inpatient order ──────────────────────────
    admission = None
    adm_row = db.execute(text("""
        SELECT AdmissionId, AdmissionNumber, AdmissionDate, DischargeDate,
               AdmittingDoctor, Specialty, Status, CurrentWardId, CurrentBedId
        FROM hospital.IPD_Admission
        WHERE (AdmissionId = :adm_id OR (:adm_id IS NULL AND Uhid = :uhid))
          AND IsDeleted = 0
        ORDER BY AdmissionId DESC LIMIT 1
    """), {"adm_id": order.get("AdmissionId"), "uhid": uhid}).fetchone()
    if adm_row:
        admission = dict(adm_row._mapping)

    # ── Money ───────────────────────────────────────────────────────────────
    advance_row = db.execute(text("""
        SELECT AdvanceId, AdvanceNo, TotalAmount, PaidAmount, RefundedAmount,
               (TotalAmount - PaidAmount + RefundedAmount) AS Outstanding,
               Status, PaymentMode, PaymentReference, CreatedAt
        FROM hospital.Billing_Advance
        WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND Status <> 'CANCELLED'
        LIMIT 1
    """), {"oid": order_id}).fetchone()

    payments = [dict(r._mapping) for r in db.execute(text("""
        SELECT pay.ReceiptNo, pay.PaymentDate, pay.PaymentMode, pay.PaymentReference,
               pay.Status, pay.CollectedBy, alloc.AllocatedAmount
        FROM hospital.Billing_PaymentAllocation alloc
        JOIN hospital.Billing_Payment pay ON pay.PaymentId = alloc.PaymentId
        WHERE alloc.ServiceOrderId = :oid
        ORDER BY pay.PaymentId DESC
    """), {"oid": order_id}).fetchall()]

    responsibility, paid = gate.order_financials(db, order_id)

    authorizations = [dict(r._mapping) for r in db.execute(text("""
        SELECT PreAuthId, PreAuthNumber, InsurerName, RequestedAmount,
               ApprovedAmount, UPPER(Status) AS Status, DecisionReason,
               RequestDate, DecisionDate
        FROM hospital.Ins_PreAuth
        WHERE ServiceOrderId = :oid ORDER BY PreAuthId DESC
    """), {"oid": order_id}).fetchall()]

    audit = [dict(r._mapping) for r in db.execute(text("""
        SELECT LogId, ServiceOrderItemId, Action, PreviousValue, NewValue, Reason,
               ChangedBy, ChangedByRole, CreatedAt
        FROM hospital.PRO_AuditLog
        WHERE ServiceOrderId = :oid ORDER BY LogId DESC LIMIT 100
    """), {"oid": order_id}).fetchall()]

    return {
        "Order": order,
        "Items": items,
        "Patient": patient,
        "Admission": admission,
        "Advance": dict(advance_row._mapping) if advance_row else None,
        "Payments": payments,
        "Authorizations": authorizations,
        "AuthorizationStatus": gate.authorization_status_for(db, order_id),
        "AuthorizedInsuranceCap": float(gate.approved_insurance_cover(db, order_id)),
        "PatientResponsibility": float(responsibility),
        "AmountPaid": float(paid),
        "Outstanding": float(max(ZERO, responsibility - paid)),
        "Audit": audit,
    }

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
def record_advance_payment(
    order_id: int,
    payload: pro_schema.AdvancePaymentRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Collect an advance payment against an order. Billing only.

    Two things changed here, both of them the difference between a gate and a
    formality:

    * **The PRO desk can no longer take money.** Pricing and collecting are
      separated on purpose -- the person who decides what a service costs must
      not also be the person who records that it was paid for. The endpoint is
      kept (the PRO screen links to it) but now answers 403 to a PRO user.
    * **The amounts come from the database.** ``TotalAmount`` and ``PaidAmount``
      both used to be read from the request body and written straight to the
      advance bill, so ``{"TotalAmount": 1, "PaidAmount": 1}`` marked any order
      PAID and released every service on it. Only ``PaidAmount`` is read now,
      and it is checked against the outstanding balance the server computes.

    Release is decided per item by ``can_release_service``, so a part payment
    releases nothing and an order whose insurance authorization is still pending
    stays blocked even when fully paid.
    """
    order = _lock_order(db, order_id)

    if order.get("PROStatus") != 'APPROVED':
        # The old handler never looked at PROStatus, so a payment could be
        # recorded against a PENDING or REJECTED order and release it.
        raise HTTPException(
            status_code=409,
            detail=(f"Order {order['OrderNo']} is {order.get('PROStatus')} at PRO "
                    f"review. Payment can only be collected on an approved order."))

    advance = billing.live_advance_for_order(db, order_id, for_update=True)
    if not advance:
        raise HTTPException(
            status_code=409,
            detail=("This order has no advance bill. It must be approved by the PRO "
                    "desk, which raises the bill, before payment can be collected."))

    try:
        receipt = billing.collect_payment(
            db, advance=advance, amount=payload.PaidAmount,
            mode=payload.PaymentMode, reference=payload.PaymentReference,
            collected_by=actor.username, collected_by_role=actor.role,
            idempotency_key=payload.IdempotencyKey,
            notes=f"Advance collected against {order['OrderNo']}",
        )

        billing.apply_financial_status(db, order_id)
        released = billing.release_eligible_items(
            db, order_id, released_by=actor.username, role=actor.role,
            reason=f"Advance bill {advance['AdvanceNo']} settled (receipt {receipt['ReceiptNo']})",
        )

        log_pro_audit(db, order_id, None, order["UHID"], 'PAYMENT_RECORDED',
                      None, receipt["Amount"],
                      f"Receipt {receipt['ReceiptNo']} via {payload.PaymentMode}",
                      actor.username, actor.role)
        db.commit()
        return {
            "message": ("Payment already recorded." if receipt["duplicate"]
                        else "Payment recorded."),
            "AdvanceNo": advance["AdvanceNo"],
            "ReceiptNo": receipt["ReceiptNo"],
            "AmountCollected": float(receipt["Amount"]),
            "PaidToDate": float(receipt["PaidToDate"]),
            "Outstanding": float(receipt["Outstanding"]),
            "PaymentStatus": receipt["AdvanceStatus"],
            "ItemsReleased": released,
        }
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This payment was already recorded by a concurrent request.")
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
            SELECT pa.PreAuthId, pa.PreAuthNumber, pa.Uhid AS UHID, pa.ServiceOrderId,
                   pa.PatientName, pa.InsurerName, pa.Diagnosis,
                   pa.RequestedAmount, pa.ApprovedAmount, pa.DecisionReason,
                   pa.RequestDate, pa.DecisionDate,
                   so.OrderNo, so.OrderType, so.PROStatus, so.ServiceStatus,
                   -- A pre-authorization that has already been claimed against is
                   -- shown as CLAIMED rather than as still-open authorization.
                   CASE
                     WHEN EXISTS (SELECT 1 FROM hospital.Billing_InsuranceClaim cl
                                   WHERE cl.ServiceOrderId = pa.ServiceOrderId
                                     AND COALESCE(cl.IsDeleted, 0) = 0) THEN 'CLAIMED'
                     ELSE UPPER(pa.Status)
                   END AS Status
            -- hospital.Billing_PreAuth does not exist in this database, so this
            -- endpoint was returning 500 on every call. Ins_PreAuth is the table
            -- that actually holds pre-authorizations, and it is the one the release
            -- gate reads -- so the screen and the gate now agree. Claims link back
            -- by ServiceOrderId; Billing_InsuranceClaim has no PreAuthId column.
            FROM hospital.Ins_PreAuth pa
            LEFT JOIN hospital.Service_Order so ON so.ServiceOrderId = pa.ServiceOrderId
            ORDER BY pa.PreAuthId DESC LIMIT 200
        """)).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payments/pending")
def get_pending_payments(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT adv.*,
                   (adv.TotalAmount - adv.PaidAmount + adv.RefundedAmount) AS Outstanding
            FROM hospital.Billing_Advance adv
            JOIN hospital.Service_Order so ON so.ServiceOrderId = adv.ServiceOrderId
            -- Filtered on Status='PENDING' alone, this dropped every PARTIALLY_PAID
            -- bill off the list, so a balance was never chased. The real question is
            -- whether anything is outstanding.
            WHERE adv.IsDeleted = 0 AND so.IsDeleted = 0
              AND adv.Status IN ('PENDING', 'PARTIALLY_PAID')
              AND (adv.TotalAmount - adv.PaidAmount + adv.RefundedAmount) > 0
            ORDER BY adv.AdvanceId DESC LIMIT 200
        """)).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

