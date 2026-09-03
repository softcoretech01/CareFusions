"""Advance billing: the only place patient money is collected for a service order.

PRO approves and raises the bill; Billing collects against it. Collection now
writes a real ledger:

* ``Billing_Payment``      -- one row per receipt, with who collected it.
* ``Billing_PaymentAllocation`` -- what that receipt was applied to.
* ``Billing_Refund``       -- refunds as their own transaction.

Before this, a payment was two columns on the advance bill (``PaidAmount`` and
``PaymentMode``). A second instalment overwrote the first one's mode and
reference, no receipt number existed, nobody was recorded as having taken the
money, and a payment could not be reversed without deleting financial history.

Release is no longer a side effect of payment. Paying calls the same
``can_release_service`` gate every other release goes through, per item -- which
is what stops a part-rejected order from releasing its rejected items the moment
the approved ones are paid for.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.rbac import Actor, require_roles
from ..core import workflow_gate as gate
from ..database import get_db
from ..schemas import billing_advance as schemas

router = APIRouter(
    prefix="/billing/advance",
    tags=["Advance Billing"]
)

# The full financial picture Billing needs on one row: what was charged, what
# insurance absorbs, what the patient owes, what has come in, what is left.
_ADVANCE_SELECT = """
    SELECT
        ba.*,
        COALESCE(
            p.PatientName,
            (SELECT x.PatientName
               FROM (
                   SELECT Uhid, PatientName, OrderedAt FROM hospital.Lab_Order
                   UNION ALL
                   SELECT Uhid, PatientName, OrderedAt FROM hospital.Rad_Order
               ) x
              WHERE x.Uhid = ba.UHID AND NULLIF(TRIM(x.PatientName), '') IS NOT NULL
              ORDER BY x.OrderedAt DESC
              LIMIT 1),
            ba.UHID
        ) AS PatientName,
        (ba.TotalAmount - ba.PaidAmount + ba.RefundedAmount) AS Outstanding,
        so.OrderNo,
        so.SourceModule,
        so.OrderType,
        so.PROStatus,
        so.AuthorizationStatus,
        (SELECT COALESCE(SUM(soi.GrossAmount), 0) FROM hospital.Service_OrderItem soi
          WHERE soi.ServiceOrderId = ba.ServiceOrderId AND soi.IsDeleted = 0
            AND soi.PROStatus = 'APPROVED') AS GrossAmount,
        (SELECT COALESCE(SUM(soi.AuthorizedDiscount), 0) FROM hospital.Service_OrderItem soi
          WHERE soi.ServiceOrderId = ba.ServiceOrderId AND soi.IsDeleted = 0
            AND soi.PROStatus = 'APPROVED') AS DiscountAmount,
        (SELECT COALESCE(SUM(soi.NetAmount), 0) FROM hospital.Service_OrderItem soi
          WHERE soi.ServiceOrderId = ba.ServiceOrderId AND soi.IsDeleted = 0
            AND soi.PROStatus = 'APPROVED') AS NetAmount,
        (SELECT COALESCE(SUM(soi.InsuranceCoveredAmount), 0) FROM hospital.Service_OrderItem soi
          WHERE soi.ServiceOrderId = ba.ServiceOrderId AND soi.IsDeleted = 0
            AND soi.PROStatus = 'APPROVED') AS InsuranceCoveredAmount,
        (SELECT COALESCE(SUM(soi.PatientResponsibility), 0) FROM hospital.Service_OrderItem soi
          WHERE soi.ServiceOrderId = ba.ServiceOrderId AND soi.IsDeleted = 0
            AND soi.PROStatus = 'APPROVED') AS PatientResponsibility,
        (SELECT GROUP_CONCAT(soi.ItemName ORDER BY soi.ServiceOrderItemId SEPARATOR ', ')
           FROM hospital.Service_OrderItem soi
          WHERE soi.ServiceOrderId = ba.ServiceOrderId AND soi.IsDeleted = 0
            AND soi.PROStatus = 'APPROVED') AS ServiceSummary
    FROM hospital.Billing_Advance ba
    LEFT JOIN registration.Patient p ON ba.UHID = p.Uhid
    LEFT JOIN hospital.Service_Order so ON so.ServiceOrderId = ba.ServiceOrderId
"""


@router.get("/all", response_model=List[schemas.AdvanceBillResponse])
def get_all_advance_bills(limit: int = Query(300, ge=1, le=1000),
                          db: Session = Depends(get_db)):
    """Every advance bill, newest first."""
    try:
        rows = db.execute(text(_ADVANCE_SELECT + """
            WHERE ba.IsDeleted = 0
            ORDER BY ba.CreatedAt DESC
            LIMIT :limit
        """), {"limit": limit}).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", response_model=List[schemas.AdvanceBillResponse])
def get_pending_advance_bills(limit: int = Query(300, ge=1, le=1000),
                              db: Session = Depends(get_db)):
    """Advance bills still awaiting collection."""
    try:
        rows = db.execute(text(_ADVANCE_SELECT + """
            WHERE ba.Status IN ('PENDING','PARTIALLY_PAID') AND ba.IsDeleted = 0
            ORDER BY ba.CreatedAt DESC
            LIMIT :limit
        """), {"limit": limit}).fetchall()
        return [dict(row._mapping) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{advance_id}")
def get_advance_bill(advance_id: int, db: Session = Depends(get_db)):
    """One advance bill with its item breakdown and its payment history."""
    row = db.execute(text(_ADVANCE_SELECT + " WHERE ba.AdvanceId = :id AND ba.IsDeleted = 0"),
                     {"id": advance_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Advance bill not found")

    bill = dict(row._mapping)

    bill["Items"] = [dict(r._mapping) for r in db.execute(text("""
        SELECT ServiceOrderItemId, ItemName, ItemType, Quantity, MasterPrice, PROPrice,
               AuthorizedDiscount, GrossAmount, NetAmount, InsuranceCoveredAmount,
               PatientResponsibility, PROStatus, PaymentStatus, FinancialStatus,
               ServiceStatus, RejectionReason
        FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :oid AND IsDeleted = 0
        ORDER BY ServiceOrderItemId
    """), {"oid": bill["ServiceOrderId"]})]

    bill["Payments"] = [dict(r._mapping) for r in db.execute(text("""
        SELECT pay.PaymentId, pay.ReceiptNo, pay.PaymentDate, pay.Amount,
               pay.PaymentMode, pay.PaymentReference, pay.Status,
               pay.CollectedBy, pay.ReversalReason, alloc.AllocatedAmount
        FROM hospital.Billing_PaymentAllocation alloc
        JOIN hospital.Billing_Payment pay ON pay.PaymentId = alloc.PaymentId
        WHERE alloc.AdvanceId = :id
        ORDER BY pay.PaymentId DESC
    """), {"id": advance_id})]

    return bill


# ══════════════════════════════════════════════════════════════════════════
# Collection
# ══════════════════════════════════════════════════════════════════════════

class AdvancePaymentIn(BaseModel):
    PaymentMode: str = Field(min_length=1, description="Cash, Card, UPI, BankTransfer")
    PaymentReference: Optional[str] = None
    Amount: float
    # Optional caller-supplied key. Re-POSTing the same key returns the original
    # receipt instead of taking the money a second time, which is what makes a
    # double-clicked Pay button safe.
    IdempotencyKey: Optional[str] = None


@router.post("/{advance_id}/pay")
def pay_advance_bill(
    advance_id: int,
    payload: AdvancePaymentIn,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Collect against an advance bill and release whatever that unlocks.

    Partial payment leaves the service NOT_RELEASED. Full payment releases each
    item that passes ``can_release_service`` -- rejected, cancelled and
    authorization-blocked items stay put.
    """
    try:
        if payload.IdempotencyKey:
            existing = db.execute(text("""
                SELECT PaymentId, ReceiptNo, Amount FROM hospital.Billing_Payment
                WHERE IdempotencyKey = :key
            """), {"key": payload.IdempotencyKey}).fetchone()
            if existing:
                return {
                    "message": "This payment was already recorded.",
                    "duplicate": True,
                    "PaymentId": existing.PaymentId,
                    "ReceiptNo": existing.ReceiptNo,
                    "amount": float(existing.Amount),
                }

        adv = db.execute(text("""
            SELECT * FROM hospital.Billing_Advance
            WHERE AdvanceId = :id AND IsDeleted = 0
            FOR UPDATE
        """), {"id": advance_id}).fetchone()

        if not adv:
            raise HTTPException(status_code=404, detail="Advance bill not found")
        if adv.Status == 'CANCELLED':
            raise HTTPException(status_code=409, detail="This advance bill has been cancelled.")
        if adv.Status == 'PAID':
            raise HTTPException(status_code=400, detail="Advance bill is already fully paid")

        # The order must still be approved. An order rejected or cancelled after
        # the bill was raised must not be collectable.
        order = db.execute(text("""
            SELECT ServiceOrderId, PROStatus, OrderStatus, IsDeleted
            FROM hospital.Service_Order WHERE ServiceOrderId = :oid FOR UPDATE
        """), {"oid": adv.ServiceOrderId}).fetchone()
        if not order or order.IsDeleted:
            raise HTTPException(status_code=409, detail="The service order behind this bill no longer exists.")
        if order.PROStatus != 'APPROVED' or order.OrderStatus == 'CANCELLED':
            raise HTTPException(
                status_code=409,
                detail=(f"This bill cannot be collected: the service order is "
                        f"{order.PROStatus}/{order.OrderStatus}."))

        total_amount = gate.money(adv.TotalAmount)
        already_paid = gate.money(adv.PaidAmount)
        refunded = gate.money(adv.RefundedAmount)
        outstanding = total_amount - already_paid + refunded

        payment_amount = gate.money(payload.Amount)
        if payment_amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
        if payment_amount > outstanding + gate.CENT:
            raise HTTPException(
                status_code=400,
                detail=(f"Payment amount ({payment_amount}) exceeds the outstanding amount "
                        f"({outstanding}). Overpayment is not permitted."))

        # ── Ledger ──────────────────────────────────────────────────────────
        receipt_no = f"RCP-{advance_id}-{int(datetime.now().timestamp() * 1000)}"
        try:
            db.execute(text("""
                INSERT INTO hospital.Billing_Payment
                    (ReceiptNo, UHID, Amount, PaymentMode, PaymentReference, Status,
                     CollectedBy, CollectedByRole, IdempotencyKey)
                VALUES (:receipt, :uhid, :amount, :mode, :ref, 'ACTIVE', :by, :role, :key)
            """), {"receipt": receipt_no, "uhid": adv.UHID, "amount": payment_amount,
                   "mode": payload.PaymentMode, "ref": payload.PaymentReference,
                   "by": actor.username, "role": actor.role,
                   "key": payload.IdempotencyKey})
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409,
                                detail="This payment has already been recorded.")

        payment_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        db.execute(text("""
            INSERT INTO hospital.Billing_PaymentAllocation
                (PaymentId, AdvanceId, ServiceOrderId, AllocatedAmount, Status)
            VALUES (:pid, :aid, :oid, :amount, 'ACTIVE')
        """), {"pid": payment_id, "aid": advance_id, "oid": adv.ServiceOrderId,
               "amount": payment_amount})

        new_paid = already_paid + payment_amount
        is_fully_paid = new_paid + gate.CENT >= total_amount + refunded

        db.execute(text("""
            UPDATE hospital.Billing_Advance
            SET PaidAmount = :paid, PaymentMode = :mode, PaymentReference = :ref,
                Status = :status, UpdatedBy = :by, UpdatedAt = NOW()
            WHERE AdvanceId = :id
        """), {"paid": new_paid, "mode": payload.PaymentMode,
               "ref": payload.PaymentReference,
               "status": 'PAID' if is_fully_paid else 'PARTIALLY_PAID',
               "by": actor.username, "id": advance_id})

        db.execute(text("""
            UPDATE hospital.Service_OrderItem
            SET PaymentStatus = :pay_status, FinancialStatus = :fin_status, UpdatedAt = NOW()
            WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
        """), {"pay_status": 'PAID' if is_fully_paid else 'PARTIALLY_PAID',
               "fin_status": 'CLEARED' if is_fully_paid else 'PARTIALLY_CLEARED',
               "oid": adv.ServiceOrderId})

        # ── Release, item by item, through the gate ─────────────────────────
        released, blocked = [], []
        if is_fully_paid:
            item_ids = [r[0] for r in db.execute(text("""
                SELECT ServiceOrderItemId FROM hospital.Service_OrderItem
                WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
                ORDER BY ServiceOrderItemId
            """), {"oid": adv.ServiceOrderId})]

            for item_id in item_ids:
                decision = gate.release_item(
                    db, item_id=item_id, released_by=actor.username, role=actor.role,
                    reason=f"Advance bill {adv.AdvanceNo} paid in full",
                    clearance_type="PAID")
                if decision.allowed:
                    released.append(item_id)
                else:
                    blocked.append({"ServiceOrderItemId": item_id,
                                    "blockers": decision.blockers})

        gate.sync_order_from_items(db, adv.ServiceOrderId)
        db.commit()

        remaining = total_amount + refunded - new_paid
        if is_fully_paid:
            message = "Advance payment complete."
            if released:
                message += f" {len(released)} service(s) released."
            if blocked:
                message += (f" {len(blocked)} service(s) could not be released yet — "
                            f"see 'blocked'.")
        else:
            message = (f"Partial payment of {payment_amount} recorded. "
                       f"Outstanding: {remaining}. Services stay blocked until paid in full.")

        return {
            "message": message,
            "status": 'PAID' if is_fully_paid else 'PARTIALLY_PAID',
            "PaymentId": payment_id,
            "ReceiptNo": receipt_no,
            "paid": float(new_paid),
            "outstanding": float(max(gate.ZERO, remaining)),
            "released": released,
            "blocked": blocked,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════
# Reversal, cancellation, refund
# ══════════════════════════════════════════════════════════════════════════

class ReasonIn(BaseModel):
    Reason: str = Field(min_length=1, max_length=500)


@router.post("/payments/{payment_id}/reverse")
def reverse_payment(
    payment_id: int,
    payload: ReasonIn,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Reverse a payment WITHOUT deleting it, and take back what it unlocked.

    The payment row stays and is marked REVERSED; its allocations are marked
    REVERSED; the advance bill's collected total drops; and any release that
    money bought is revoked. A service must not stay open because of money that
    is no longer there.
    """
    try:
        pay = db.execute(text("""
            SELECT * FROM hospital.Billing_Payment WHERE PaymentId = :id FOR UPDATE
        """), {"id": payment_id}).fetchone()
        if not pay:
            raise HTTPException(status_code=404, detail="Payment not found")
        if pay.Status == 'REVERSED':
            raise HTTPException(status_code=409, detail="This payment is already reversed")

        allocations = db.execute(text("""
            SELECT * FROM hospital.Billing_PaymentAllocation
            WHERE PaymentId = :id AND Status = 'ACTIVE' FOR UPDATE
        """), {"id": payment_id}).fetchall()

        db.execute(text("""
            UPDATE hospital.Billing_Payment
            SET Status = 'REVERSED', ReversedAt = NOW(), ReversedBy = :by,
                ReversalReason = :reason, UpdatedAt = NOW()
            WHERE PaymentId = :id
        """), {"id": payment_id, "by": actor.username, "reason": payload.Reason})

        db.execute(text("""
            UPDATE hospital.Billing_PaymentAllocation
            SET Status = 'REVERSED', UpdatedAt = NOW()
            WHERE PaymentId = :id AND Status = 'ACTIVE'
        """), {"id": payment_id})

        touched_orders = set()
        for alloc in allocations:
            if alloc.AdvanceId:
                db.execute(text("""
                    UPDATE hospital.Billing_Advance
                    SET PaidAmount = GREATEST(0, PaidAmount - :amount),
                        Status = CASE
                            WHEN GREATEST(0, PaidAmount - :amount) <= 0 THEN 'PENDING'
                            WHEN GREATEST(0, PaidAmount - :amount) + RefundedAmount < TotalAmount
                                 THEN 'PARTIALLY_PAID'
                            ELSE Status END,
                        UpdatedBy = :by, UpdatedAt = NOW()
                    WHERE AdvanceId = :aid
                """), {"amount": alloc.AllocatedAmount, "aid": alloc.AdvanceId,
                       "by": actor.username})
            if alloc.ServiceOrderId:
                touched_orders.add(alloc.ServiceOrderId)

        for order_id in touched_orders:
            gate.revoke_releases_for_order(
                db, order_id, by=actor.username,
                reason=f"Payment {pay.ReceiptNo} reversed: {payload.Reason}")
            db.execute(text("""
                UPDATE hospital.Service_OrderItem
                SET PaymentStatus = 'UNPAID', FinancialStatus = 'NOT_CLEARED', UpdatedAt = NOW()
                WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
            """), {"oid": order_id})
            gate.sync_order_from_items(db, order_id)

        db.commit()
        return {"message": f"Payment {pay.ReceiptNo} reversed.",
                "ReleasesRevokedForOrders": sorted(touched_orders)}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{advance_id}/cancel")
def cancel_advance_bill(
    advance_id: int,
    payload: ReasonIn,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Cancel an unpaid advance bill so the order can be rejected or re-raised."""
    try:
        adv = db.execute(text("""
            SELECT * FROM hospital.Billing_Advance WHERE AdvanceId = :id AND IsDeleted = 0
            FOR UPDATE
        """), {"id": advance_id}).fetchone()
        if not adv:
            raise HTTPException(status_code=404, detail="Advance bill not found")
        if gate.money(adv.PaidAmount) > 0:
            raise HTTPException(
                status_code=409,
                detail=("Money has been collected against this bill. Reverse or refund the "
                        "payments first, so the financial history stays intact."))

        db.execute(text("""
            UPDATE hospital.Billing_Advance
            SET Status = 'CANCELLED', CancelledReason = :reason,
                UpdatedBy = :by, UpdatedAt = NOW()
            WHERE AdvanceId = :id
        """), {"id": advance_id, "reason": payload.Reason, "by": actor.username})

        gate.revoke_releases_for_order(
            db, adv.ServiceOrderId, by=actor.username,
            reason=f"Advance bill cancelled: {payload.Reason}")
        gate.sync_order_from_items(db, adv.ServiceOrderId)
        db.commit()
        return {"message": "Advance bill cancelled."}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


class RefundIn(BaseModel):
    Amount: float = Field(gt=0)
    Reason: str = Field(min_length=1, max_length=500)
    RefundMode: Optional[str] = "Cash"
    RefundReference: Optional[str] = None


@router.post("/{advance_id}/refund")
def refund_advance(
    advance_id: int,
    payload: RefundIn,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING")),
):
    """Refund money collected on an advance bill.

    Creates a refund transaction. The original payment and its allocation are
    left exactly as they were -- the money did arrive, and the record of that
    must survive it going back out.
    """
    try:
        adv = db.execute(text("""
            SELECT * FROM hospital.Billing_Advance WHERE AdvanceId = :id AND IsDeleted = 0
            FOR UPDATE
        """), {"id": advance_id}).fetchone()
        if not adv:
            raise HTTPException(status_code=404, detail="Advance bill not found")

        amount = gate.money(payload.Amount)
        refundable = gate.money(adv.PaidAmount) - gate.money(adv.RefundedAmount)
        if amount > refundable:
            raise HTTPException(
                status_code=400,
                detail=f"Refund of {amount} exceeds the {refundable} available to refund.")

        refund_no = f"REF-{advance_id}-{int(datetime.now().timestamp())}"
        db.execute(text("""
            INSERT INTO hospital.Billing_Refund
                (RefundNo, UHID, AdvanceId, ServiceOrderId, Amount, Reason, Status,
                 RefundMode, RefundReference, ApprovedBy, ProcessedBy, ProcessedAt, CreatedBy)
            VALUES (:no, :uhid, :aid, :oid, :amount, :reason, 'PAID', :mode, :ref,
                    :by, :by, NOW(), :by)
        """), {"no": refund_no, "uhid": adv.UHID, "aid": advance_id,
               "oid": adv.ServiceOrderId, "amount": amount, "reason": payload.Reason,
               "mode": payload.RefundMode, "ref": payload.RefundReference,
               "by": actor.username})

        db.execute(text("""
            UPDATE hospital.Billing_Advance
            SET RefundedAmount = RefundedAmount + :amount,
                Status = CASE WHEN PaidAmount - (RefundedAmount + :amount) < TotalAmount
                              THEN 'PARTIALLY_PAID' ELSE Status END,
                UpdatedBy = :by, UpdatedAt = NOW()
            WHERE AdvanceId = :id
        """), {"amount": amount, "id": advance_id, "by": actor.username})

        # Refunding below the payable amount takes the release back with it.
        responsibility, paid = gate.order_financials(db, adv.ServiceOrderId)
        if paid + gate.CENT < responsibility:
            gate.revoke_releases_for_order(
                db, adv.ServiceOrderId, by=actor.username,
                reason=f"Refund {refund_no}: {payload.Reason}")
            db.execute(text("""
                UPDATE hospital.Service_OrderItem
                SET PaymentStatus = 'PARTIALLY_PAID', FinancialStatus = 'PARTIALLY_CLEARED',
                    UpdatedAt = NOW()
                WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
            """), {"oid": adv.ServiceOrderId})

        gate.sync_order_from_items(db, adv.ServiceOrderId)
        db.commit()
        return {"message": f"Refund {refund_no} recorded.", "RefundNo": refund_no,
                "Amount": float(amount)}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
