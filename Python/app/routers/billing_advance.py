"""Billing's advance-payment desk: collect what the PRO desk priced.

The division of labour the workflow requires is that the PRO desk decides what a
service costs and Billing decides that money has arrived. Neither decides both.

What this router does NOT do any more:

* **Demand an exact full payment.** ``pay_advance_bill`` rejected anything that
  was not the total to the paisa, so partial payment -- the ordinary case for a
  large IPD advance -- was impossible through the API at all.
* **Overwrite ``PaidAmount``.** A second instalment replaced the first rather
  than adding to it, and took the first one's mode and reference with it.
* **Blind-release the order.** It set every item on the order to RELEASED /
  CLEARED / PAID and inserted an ACTIVE release row for each, without consulting
  PRO status, insurance authorization, cancellation or the amount actually
  collected. That is how order 19 ended up RELEASED with NOT_CLEARED and no
  advance bill at all.

Every one of those now goes through ``core.billing_engine`` and
``core.workflow_gate``, which are the same code paths the PRO router uses.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core import billing_engine as billing
from ..core import workflow_gate as gate
from ..core.rbac import Actor, require_roles
from ..core.workflow_gate import ZERO, money
from ..database import get_db
from ..schemas import billing_advance as schemas

router = APIRouter(
    prefix="/billing/advance",
    tags=["Advance Billing"]
)


# The full charge breakdown, so Billing can explain a bill rather than just
# quote a total. Only APPROVED, live items are payable -- including rejected or
# cancelled ones in the totals would ask the patient for services nobody is
# going to perform.
_ADVANCE_SELECT = """
    SELECT adv.*,
           (adv.TotalAmount - adv.PaidAmount + adv.RefundedAmount) AS Outstanding,
           so.OrderNo, so.OrderType, so.SourceModule, so.PROStatus,
           so.AuthorizationStatus,
           -- OP / IP / EMG, for the grid's Type column. Derived from the order's
           -- SourceModule so the billing desk can tell an outpatient advance from
           -- an inpatient one without opening the order.
           CASE so.SourceModule
                WHEN 'OPD' THEN 'OP'
                WHEN 'IPD' THEN 'IP'
                WHEN 'EMERGENCY' THEN 'EMG'
           END AS VisitType,
           -- Department, resolved the same way the PRO screens do. Lab and
           -- Radiology raise their service orders with no DepartmentId, so the
           -- master lookup alone returns nothing for most rows; the admission and
           -- the patient's registration are the fallbacks that actually answer.
           COALESCE(
               (SELECT dept.DepartmentName FROM admin.Master_Department dept
                 WHERE dept.DepartmentId = so.DepartmentId LIMIT 1),
               NULLIF(TRIM(adm.Specialty), ''),
               (SELECT app.Department FROM admin.Trn_Appointment app
                 WHERE app.Uhid = adv.UHID AND app.IsDeleted = 0
                 ORDER BY app.AppointmentId DESC LIMIT 1),
               NULLIF(TRIM(pr.Department), '')
           ) AS DepartmentName,
           COALESCE(
               (SELECT d.DoctorName FROM admin.Master_Doctor_Header d
                 WHERE d.DoctorId = so.DoctorId LIMIT 1),
               NULLIF(TRIM(adm.AdmittingDoctor), ''),
               NULLIF(TRIM(pr.PrimaryDoctor), '')
           ) AS DoctorName,
           -- The patient master is not the only place a name lives: a UHID may only
           -- exist in the registration table, on an admission, or on the lab /
           -- radiology order that started this. Row 2 and row 3 of this grid showed
           -- "—" for a patient whose name every other screen displays.
           COALESCE(
               NULLIF(TRIM(p.PatientName), ''),
               NULLIF(TRIM(pr.PatientName), ''),
               NULLIF(TRIM(adm.PatientName), ''),
               (SELECT x.PatientName
                  FROM (
                      SELECT Uhid, PatientName, OrderedAt FROM hospital.Lab_Order
                      UNION ALL
                      SELECT Uhid, PatientName, OrderedAt FROM hospital.Rad_Order
                  ) x
                 WHERE x.Uhid = adv.UHID AND NULLIF(TRIM(x.PatientName), '') IS NOT NULL
                 ORDER BY x.OrderedAt DESC
                 LIMIT 1)
           ) AS PatientName,
           agg.ServiceSummary, agg.GrossAmount, agg.DiscountAmount, agg.NetAmount,
           agg.InsuranceCoveredAmount, agg.PatientResponsibility
    FROM hospital.Billing_Advance adv
    LEFT JOIN hospital.Service_Order so ON so.ServiceOrderId = adv.ServiceOrderId
    LEFT JOIN registration.Patient p ON p.Uhid = adv.UHID
    LEFT JOIN registration.PatientRegistration pr ON pr.Uhid = adv.UHID
    LEFT JOIN hospital.IPD_Admission adm ON (
        (so.AdmissionId IS NOT NULL AND adm.AdmissionId = so.AdmissionId)
        OR (so.AdmissionId IS NULL AND so.SourceModule = 'IPD'
            AND adm.Uhid = adv.UHID AND adm.IsDeleted = 0)
    )
    LEFT JOIN (
        SELECT ServiceOrderId,
               GROUP_CONCAT(ItemName ORDER BY ServiceOrderItemId SEPARATOR ', ') AS ServiceSummary,
               SUM(GrossAmount)            AS GrossAmount,
               SUM(AuthorizedDiscount)     AS DiscountAmount,
               SUM(NetAmount)              AS NetAmount,
               SUM(InsuranceCoveredAmount) AS InsuranceCoveredAmount,
               SUM(PatientResponsibility)  AS PatientResponsibility
        FROM hospital.Service_OrderItem
        WHERE IsDeleted = 0 AND PROStatus = 'APPROVED' AND ServiceStatus <> 'CANCELLED'
        GROUP BY ServiceOrderId
    ) agg ON agg.ServiceOrderId = adv.ServiceOrderId
"""


@router.get("")
@router.get("/")
def list_advance_bills(
    status: Optional[str] = Query(None, description="Filter by Status, e.g. PAID or PENDING"),
    db: Session = Depends(get_db),
):
    """All advance bills, newest first, with the charge breakdown behind each."""
    try:
        where = ["adv.IsDeleted = 0"]
        params = {}
        if status:
            where.append("adv.Status = :status")
            params["status"] = status
        rows = db.execute(
            text(f"{_ADVANCE_SELECT} WHERE {' AND '.join(where)} ORDER BY adv.AdvanceId DESC"),
            params).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", response_model=List[schemas.AdvanceBillResponse])
def get_pending_advance_bills(db: Session = Depends(get_db)):
    """Advance bills with money still to collect.

    The filter is the outstanding balance, not ``Status = 'PENDING'``. Under the
    old filter a bill went from the screen the moment a single rupee was taken
    against it, because that flipped the status to PARTIALLY_PAID -- so the
    balance was never chased.
    """
    try:
        rows = db.execute(text(f"""
            {_ADVANCE_SELECT}
            WHERE adv.IsDeleted = 0
              AND adv.Status IN ('PENDING', 'PARTIALLY_PAID')
              AND (adv.TotalAmount - adv.PaidAmount + adv.RefundedAmount) > 0
            ORDER BY adv.CreatedAt DESC
        """)).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{advance_id}", response_model=schemas.AdvanceBillResponse)
def get_advance_bill(advance_id: int, db: Session = Depends(get_db)):
    row = db.execute(text(f"{_ADVANCE_SELECT} WHERE adv.AdvanceId = :id AND adv.IsDeleted = 0"),
                     {"id": advance_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Advance bill not found.")
    return dict(row._mapping)


@router.get("/{advance_id}/payments")
def list_advance_payments(advance_id: int, db: Session = Depends(get_db)):
    """The receipts behind an advance bill, reversed ones included.

    There was no way to answer this at all: payment was two columns on the
    advance bill, so the second instalment erased the record of the first.
    """
    rows = db.execute(text("""
        SELECT pay.PaymentId, pay.ReceiptNo, pay.PaymentDate, pay.PaymentMode,
               pay.PaymentReference, pay.Status, pay.CollectedBy, pay.CollectedByRole,
               pay.ReversedAt, pay.ReversedBy, pay.ReversalReason,
               alloc.AllocatedAmount, alloc.Status AS AllocationStatus
        FROM hospital.Billing_PaymentAllocation alloc
        JOIN hospital.Billing_Payment pay ON pay.PaymentId = alloc.PaymentId
        WHERE alloc.AdvanceId = :id
        ORDER BY pay.PaymentId DESC
    """), {"id": advance_id}).fetchall()

    refunds = db.execute(text("""
        SELECT RefundId, RefundNo, Amount, Reason, Status, RefundMode,
               RefundReference, ProcessedBy, ProcessedAt
        FROM hospital.Billing_Refund WHERE AdvanceId = :id ORDER BY RefundId DESC
    """), {"id": advance_id}).fetchall()

    return {"AdvanceId": advance_id,
            "Payments": [dict(r._mapping) for r in rows],
            "Refunds": [dict(r._mapping) for r in refunds]}


# ══════════════════════════════════════════════════════════════════════════
# Collecting
# ══════════════════════════════════════════════════════════════════════════

class PayRequest(BaseModel):
    Amount: float = Field(gt=0, description="Cash actually being taken now.")
    PaymentMode: str = Field(description="CASH, CARD, UPI, BANK_TRANSFER, CHEQUE, ...")
    PaymentReference: Optional[str] = None
    # A retried POST carrying the same key returns the original receipt rather
    # than collecting the money twice.
    IdempotencyKey: Optional[str] = Field(default=None, max_length=120)
    Notes: Optional[str] = None


@router.post("/{advance_id}/pay")
def pay_advance_bill(
    advance_id: int,
    payload: PayRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Collect against an advance bill and release whatever that unlocks.

    Partial payments are supported and release nothing: an item is released only
    when ``can_release_service`` passes, which requires the order's whole patient
    responsibility to be collected. Release is decided per item, so a rejected or
    unauthorised item stays blocked while its siblings go through.
    """
    try:
        advance = billing.load_advance_for_update(db, advance_id)
        order_id = advance["ServiceOrderId"]

        order = db.execute(text("""
            SELECT OrderNo, PROStatus, OrderStatus FROM hospital.Service_Order
            WHERE ServiceOrderId = :oid FOR UPDATE
        """), {"oid": order_id}).fetchone()
        if not order:
            raise HTTPException(status_code=409,
                                detail="This advance bill has no service order behind it.")
        if order.OrderStatus == 'CANCELLED':
            raise HTTPException(status_code=409,
                                detail=f"Order {order.OrderNo} is cancelled. Do not collect against it.")
        if order.PROStatus != 'APPROVED':
            # Never checked before, so money could be taken against a PENDING or
            # REJECTED order -- and taking it released the services.
            raise HTTPException(
                status_code=409,
                detail=(f"Order {order.OrderNo} is {order.PROStatus} at PRO review. "
                        f"Payment can only be collected once the PRO desk has approved it."))

        receipt = billing.collect_payment(
            db, advance=advance, amount=payload.Amount, mode=payload.PaymentMode,
            reference=payload.PaymentReference, collected_by=actor.username,
            collected_by_role=actor.role, idempotency_key=payload.IdempotencyKey,
            notes=payload.Notes or f"Advance against {order.OrderNo}",
        )

        billing.apply_financial_status(db, order_id)
        released = billing.release_eligible_items(
            db, order_id, released_by=actor.username, role=actor.role,
            reason=f"Advance bill {advance['AdvanceNo']} settled (receipt {receipt['ReceiptNo']})",
        )

        db.execute(text("""
            INSERT INTO hospital.PRO_AuditLog
                (ServiceOrderId, UHID, Action, PreviousValue, NewValue, Reason,
                 ChangedBy, ChangedByRole)
            VALUES (:oid, :uhid, 'PAYMENT_RECORDED', :prev, :new, :reason, :by, :role)
        """), {"oid": order_id, "uhid": advance["UHID"],
               "prev": str(money(advance["PaidAmount"]) - receipt["Amount"]),
               "new": str(receipt["PaidToDate"]),
               "reason": f"Receipt {receipt['ReceiptNo']} via {payload.PaymentMode}",
               "by": actor.username, "role": actor.role})

        db.commit()

        blockers = []
        if not released:
            # Tell the desk WHY nothing opened up, rather than reporting success
            # on a payment that changed nothing the patient can see.
            items = db.execute(text("""
                SELECT ServiceOrderItemId FROM hospital.Service_OrderItem
                WHERE ServiceOrderId = :oid AND IsDeleted = 0
                  AND ServiceStatus = 'NOT_RELEASED'
            """), {"oid": order_id}).fetchall()
            for row in items:
                decision = gate.evaluate_release(db, row.ServiceOrderItemId)
                if decision.blockers:
                    blockers.append({"ServiceOrderItemId": row.ServiceOrderItemId,
                                     "blockers": decision.blockers})

        return {
            "message": ("Payment already recorded." if receipt["duplicate"]
                        else f"Payment recorded. {len(released)} service(s) released."),
            "AdvanceId": advance_id,
            "AdvanceNo": advance["AdvanceNo"],
            "ReceiptNo": receipt["ReceiptNo"],
            "AmountCollected": float(receipt["Amount"]),
            "PaidToDate": float(receipt["PaidToDate"]),
            "Outstanding": float(receipt["Outstanding"]),
            "Status": receipt["AdvanceStatus"],
            "ItemsReleased": released,
            "StillBlocked": blockers,
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


# ══════════════════════════════════════════════════════════════════════════
# Reversal and refund -- history is preserved, never deleted
# ══════════════════════════════════════════════════════════════════════════

class ReasonRequest(BaseModel):
    Reason: str = Field(min_length=1, max_length=500)


class RefundRequest(BaseModel):
    Amount: float = Field(gt=0)
    Reason: str = Field(min_length=1, max_length=500)
    RefundMode: Optional[str] = "CASH"
    RefundReference: Optional[str] = None


@router.post("/payments/{payment_id}/reverse")
def reverse_payment(
    payment_id: int,
    payload: ReasonRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Reverse a payment taken in error, and withdraw what it unlocked.

    The payment row stays, marked REVERSED with who did it and why. A service
    released because that money arrived is un-released, unless it has already
    been started or performed -- rewriting the record of work that happened
    would be worse than the inconsistency.
    """
    try:
        result = billing.reverse_payment(
            db, payment_id=payment_id, by=actor.username, reason=payload.Reason)
        db.commit()
        return {"message": f"Payment {result['ReceiptNo']} reversed.", **{
            k: (float(v) if k == "Amount" else v) for k, v in result.items()}}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{advance_id}/refund")
def refund_advance_bill(
    advance_id: int,
    payload: RefundRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Refund money collected on an advance bill, as its own transaction.

    The original payment, its allocation and the advance bill are all left
    exactly as they were; ``RefundedAmount`` records what went back. Refunding
    below what the patient owes withdraws the releases, because the clearance
    that justified them no longer holds.
    """
    try:
        result = billing.refund_advance(
            db, advance_id=advance_id, amount=payload.Amount,
            reason=payload.Reason, by=actor.username,
            mode=payload.RefundMode, reference=payload.RefundReference)
        db.commit()
        return {"message": f"Refund {result['RefundNo']} recorded.",
                "RefundNo": result["RefundNo"],
                "Amount": float(result["Amount"]),
                "AdvanceId": result["AdvanceId"],
                "ServiceOrderId": result["ServiceOrderId"]}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{advance_id}/cancel")
def cancel_advance_bill(
    advance_id: int,
    payload: ReasonRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING", "PRO")),
):
    """Void an unpaid advance bill. Soft, and refused once money is on it."""
    try:
        advance = billing.load_advance_for_update(db, advance_id)
        if advance["Status"] == "CANCELLED":
            raise HTTPException(status_code=409, detail="This advance bill is already cancelled.")
        billing.cancel_advance_for_order(
            db, advance["ServiceOrderId"], by=actor.username, reason=payload.Reason)
        gate.revoke_releases_for_order(
            db, advance["ServiceOrderId"], by=actor.username,
            reason=f"Advance bill cancelled: {payload.Reason}")
        billing.apply_financial_status(db, advance["ServiceOrderId"])
        db.commit()
        return {"message": "Advance bill cancelled.", "AdvanceId": advance_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ``pro.py`` imported ``release_order_items`` from here in an earlier revision;
# the dependency now points the other way. Re-exported so any straggler import
# keeps working and resolves to the gate-checked implementation.
from .pro import release_order_items  # noqa: E402,F401
