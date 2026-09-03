"""The one implementation of "money arrived" and "money went back".

Payment used to be two columns on ``Billing_Advance`` (PaidAmount, PaymentMode)
written directly by whichever router the client happened to call:

* ``pro.py`` took ``TotalAmount`` and ``PaidAmount`` from the request body, so a
  caller could post ``{"TotalAmount": 1, "PaidAmount": 1}`` against a Rs.310,000
  order and have every service on it released.
* ``billing_advance.py`` demanded an exact-to-the-paisa full payment and then
  overwrote ``PaidAmount``, so partial payment was impossible and a second
  instalment erased the first one's mode and reference.
* Neither wrote a row to ``Billing_Payment`` or ``Billing_PaymentAllocation``.
  Both tables existed, both were empty, and "which payments settled this bill?"
  had no answer -- which is also why a reversed payment could not be excluded
  from a final bill.

Everything here works off the SERVER's numbers. The caller says how much cash
they are taking and by what mode; the amount owed, the resulting statuses and
which services that unlocks are all derived from the database.
"""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import workflow_gate as gate
from app.core.workflow_gate import CENT, ZERO, money


# ═══════════════════════════════════════════════════════════════════════════
# Reading an advance bill
# ═══════════════════════════════════════════════════════════════════════════

def load_advance_for_update(db: Session, advance_id: int) -> dict:
    """Lock and return one advance bill, or 404."""
    row = db.execute(text("""
        SELECT * FROM hospital.Billing_Advance
        WHERE AdvanceId = :id AND IsDeleted = 0
        FOR UPDATE
    """), {"id": advance_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Advance bill not found.")
    return dict(row._mapping)


def live_advance_for_order(db: Session, order_id: int, *, for_update: bool = False):
    """The order's single live advance bill, if it has one.

    ``ux_billing_advance_live_order`` guarantees there is at most one, so this
    cannot silently pick between duplicates the way the old
    ``ORDER BY AdvanceId DESC LIMIT 1`` did.
    """
    lock = " FOR UPDATE" if for_update else ""
    row = db.execute(text(f"""
        SELECT * FROM hospital.Billing_Advance
        WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND Status <> 'CANCELLED'
        LIMIT 1{lock}
    """), {"oid": order_id}).fetchone()
    return dict(row._mapping) if row else None


def outstanding_on(advance: dict) -> Decimal:
    """What is still to be collected on this advance bill."""
    return max(ZERO, money(advance["TotalAmount"])
               - money(advance["PaidAmount"]) + money(advance["RefundedAmount"]))


# ═══════════════════════════════════════════════════════════════════════════
# Raising an advance bill
# ═══════════════════════════════════════════════════════════════════════════

def upsert_advance_for_order(db: Session, *, order_id: int, uhid: str,
                             amount, created_by: str) -> dict:
    """Ensure the order has exactly one live advance bill for ``amount``.

    Called from inside the PRO approval transaction, which is what makes
    "APPROVED but no advance bill" unreachable: if this raises, the approval
    rolls back with it.

    Re-approval re-prices the existing row rather than inserting a second one.
    An amount below what has already been collected is refused rather than
    silently written, because that would turn a paid bill into an overpaid one
    with no refund recorded.
    """
    amount = money(amount)
    existing = live_advance_for_order(db, order_id, for_update=True)

    if existing:
        paid = money(existing["PaidAmount"]) - money(existing["RefundedAmount"])
        if amount < paid:
            raise HTTPException(
                status_code=409,
                detail=(f"Cannot re-price this order to {amount}: {paid} has "
                        f"already been collected on advance bill "
                        f"{existing['AdvanceNo']}. Refund the difference first."),
            )
        status = ("PAID" if amount > ZERO and paid + CENT >= amount
                  else "PARTIALLY_PAID" if paid > ZERO else "PENDING")
        db.execute(text("""
            UPDATE hospital.Billing_Advance
            SET TotalAmount = :amount, Status = :status,
                UpdatedBy = :by, UpdatedAt = NOW()
            WHERE AdvanceId = :id
        """), {"amount": amount, "status": status, "by": created_by,
               "id": existing["AdvanceId"]})
        existing["TotalAmount"] = amount
        existing["Status"] = status
        return existing

    advance_no = f"ADV-{order_id}-{uuid.uuid4().hex[:8].upper()}"
    db.execute(text("""
        INSERT INTO hospital.Billing_Advance
            (AdvanceNo, ServiceOrderId, UHID, TotalAmount, PaidAmount,
             RefundedAmount, Status, CreatedBy)
        VALUES (:no, :oid, :uhid, :amount, 0.00, 0.00, 'PENDING', :by)
    """), {"no": advance_no, "oid": order_id, "uhid": uhid,
           "amount": amount, "by": created_by})
    advance_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
    return {
        "AdvanceId": advance_id, "AdvanceNo": advance_no,
        "ServiceOrderId": order_id, "UHID": uhid, "TotalAmount": amount,
        "PaidAmount": ZERO, "RefundedAmount": ZERO, "Status": "PENDING",
    }


def cancel_advance_for_order(db: Session, order_id: int, *, by: str, reason: str) -> None:
    """Void an order's advance bill. Refuses if money was taken against it.

    A rejected or cancelled order must not leave a payable bill standing, but a
    bill that has collected cash cannot simply disappear -- that money has to be
    refunded through :func:`refund_advance`, which keeps the history.
    """
    advance = live_advance_for_order(db, order_id, for_update=True)
    if not advance:
        return
    if money(advance["PaidAmount"]) - money(advance["RefundedAmount"]) > ZERO:
        raise HTTPException(
            status_code=409,
            detail=(f"Advance bill {advance['AdvanceNo']} has "
                    f"{money(advance['PaidAmount'])} collected against it. "
                    f"Refund it before cancelling or rejecting the order."),
        )
    db.execute(text("""
        UPDATE hospital.Billing_Advance
        SET Status = 'CANCELLED', CancelledReason = :reason,
            UpdatedBy = :by, UpdatedAt = NOW()
        WHERE AdvanceId = :id
    """), {"reason": reason[:500], "by": by, "id": advance["AdvanceId"]})


# ═══════════════════════════════════════════════════════════════════════════
# Collecting a payment
# ═══════════════════════════════════════════════════════════════════════════

VALID_MODES = {"CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "NEFT",
               "RTGS", "WALLET", "ONLINE"}

_MODE_ALIASES = {
    "BANKTRANSFER": "BANK_TRANSFER",
    "BANK": "BANK_TRANSFER",
    "NETBANKING": "ONLINE",
    "DEBITCARD": "CARD",
    "CREDITCARD": "CARD",
}


def normalise_mode(mode: str) -> str:
    key = (mode or "").strip().upper().replace(" ", "_").replace("-", "_")
    key = _MODE_ALIASES.get(key.replace("_", ""), key)
    if key == "INSURANCE":
        # Insurance is not a way for a PATIENT to pay. Cover is applied by
        # reducing PatientResponsibility at PRO review against an approved
        # pre-authorization; booking it as a cash receipt made the advance look
        # collected when nothing had been -- which is exactly what happened to
        # advance bills ADV-18 and ADV-20 in this database.
        raise HTTPException(
            status_code=400,
            detail=("'Insurance' is not a patient payment mode. Insurance cover is "
                    "applied at PRO review from an approved pre-authorization; only "
                    "the patient's own share is collected here."),
        )
    if not key:
        raise HTTPException(status_code=400, detail="A payment mode is required.")
    if key not in VALID_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported payment mode '{mode}'. "
                   f"Allowed: {', '.join(sorted(VALID_MODES))}.",
        )
    return key


def collect_payment(db: Session, *, advance: dict, amount, mode: str,
                    reference: Optional[str], collected_by: str,
                    collected_by_role: str = "",
                    idempotency_key: Optional[str] = None,
                    notes: str = "") -> dict:
    """Take money against an advance bill and write the ledger rows.

    Returns the receipt. Does NOT commit and does NOT release anything -- the
    caller decides that, so payment and release share one transaction.

    Overpayment is refused outright. The previous code accepted any amount and
    wrote it into ``PaidAmount``, so a fat-fingered 50,000 on a 5,000 bill both
    over-collected and marked the order PAID with no refund trail.
    """
    amount = money(amount)
    if amount <= ZERO:
        raise HTTPException(status_code=400,
                            detail="Payment amount must be greater than zero.")

    mode = normalise_mode(mode)
    outstanding = outstanding_on(advance)

    if outstanding <= ZERO:
        raise HTTPException(
            status_code=409,
            detail=f"Advance bill {advance['AdvanceNo']} has nothing outstanding.",
        )
    if amount > outstanding + CENT:
        raise HTTPException(
            status_code=400,
            detail=(f"Payment of {amount} exceeds the outstanding {outstanding} on "
                    f"advance bill {advance['AdvanceNo']}. Overpayment is not "
                    f"supported; collect the outstanding amount."),
        )
    if amount > outstanding:
        amount = outstanding  # absorb sub-paisa rounding

    if idempotency_key:
        prior = db.execute(text("""
            SELECT PaymentId, ReceiptNo, Amount FROM hospital.Billing_Payment
            WHERE IdempotencyKey = :key
        """), {"key": idempotency_key}).fetchone()
        if prior:
            # A retried request is not a second payment.
            return {"PaymentId": prior.PaymentId, "ReceiptNo": prior.ReceiptNo,
                    "Amount": money(prior.Amount), "duplicate": True,
                    "AdvanceStatus": advance.get("Status"),
                    "PaidToDate": money(advance["PaidAmount"]),
                    "Outstanding": outstanding}

    receipt_no = f"RCP-{advance['ServiceOrderId']}-{uuid.uuid4().hex[:10].upper()}"
    db.execute(text("""
        INSERT INTO hospital.Billing_Payment
            (ReceiptNo, UHID, Amount, PaymentMode, PaymentReference, Status,
             CollectedBy, CollectedByRole, IdempotencyKey, Notes)
        VALUES (:receipt, :uhid, :amount, :mode, :ref, 'ACTIVE',
                :by, :role, :key, :notes)
    """), {"receipt": receipt_no, "uhid": advance["UHID"], "amount": amount,
           "mode": mode, "ref": (reference or "")[:100], "by": collected_by,
           "role": (collected_by_role or "")[:100], "key": idempotency_key,
           "notes": (notes or "")[:500]})
    payment_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

    db.execute(text("""
        INSERT INTO hospital.Billing_PaymentAllocation
            (PaymentId, AdvanceId, ServiceOrderId, AllocatedAmount, Status)
        VALUES (:pid, :aid, :oid, :amount, 'ACTIVE')
    """), {"pid": payment_id, "aid": advance["AdvanceId"],
           "oid": advance["ServiceOrderId"], "amount": amount})

    new_paid = money(advance["PaidAmount"]) + amount
    total = money(advance["TotalAmount"])
    status = "PAID" if new_paid + CENT >= total else "PARTIALLY_PAID"

    db.execute(text("""
        UPDATE hospital.Billing_Advance
        SET PaidAmount = :paid, Status = :status, PaymentMode = :mode,
            PaymentReference = :ref, UpdatedBy = :by, UpdatedAt = NOW()
        WHERE AdvanceId = :id
    """), {"paid": new_paid, "status": status, "mode": mode,
           "ref": (reference or "")[:100], "by": collected_by,
           "id": advance["AdvanceId"]})

    advance["PaidAmount"] = new_paid
    advance["Status"] = status

    return {"PaymentId": payment_id, "ReceiptNo": receipt_no,
            "Amount": amount, "PaidToDate": new_paid,
            "Outstanding": max(ZERO, total - new_paid),
            "AdvanceStatus": status, "duplicate": False}


# ═══════════════════════════════════════════════════════════════════════════
# Applying the consequences of a payment
# ═══════════════════════════════════════════════════════════════════════════

def apply_financial_status(db: Session, order_id: int) -> None:
    """Set each item's payment / financial status from what has been collected.

    Item-level, and derived: an order whose patient owes 5,000 with 2,000
    collected is PARTIALLY_PAID / PARTIALLY_CLEARED, not PAID / CLEARED. The
    previous code set every item to the same status as the request's "is this
    the full amount?" boolean -- which the client supplied.
    """
    responsibility, paid = gate.order_financials(db, order_id)

    if responsibility <= ZERO:
        payment_status, financial_status = "NOT_REQUIRED", "CLEARED"
    elif paid + CENT >= responsibility:
        payment_status, financial_status = "PAID", "CLEARED"
    elif paid > ZERO:
        payment_status, financial_status = "PARTIALLY_PAID", "PARTIALLY_CLEARED"
    else:
        payment_status, financial_status = "UNPAID", "NOT_CLEARED"

    db.execute(text("""
        UPDATE hospital.Service_OrderItem
        SET PaymentStatus = :pay, FinancialStatus = :fin, UpdatedAt = NOW()
        WHERE ServiceOrderId = :oid AND IsDeleted = 0
          AND PROStatus = 'APPROVED' AND ServiceStatus <> 'CANCELLED'
    """), {"pay": payment_status, "fin": financial_status, "oid": order_id})

    gate.sync_order_from_items(db, order_id)


def release_eligible_items(db: Session, order_id: int, *, released_by: str,
                           role: str, reason: str,
                           clearance_type: str = "PAID") -> list:
    """Release every item on the order that now passes ``can_release_service``.

    Item-level and gate-checked, so a rejected item, a cancelled item, or one
    whose insurance authorization is still pending stays put while its
    fully-paid siblings go through. The old ``release_order_items`` inserted an
    ACTIVE release row for *every* item on the order with no checks at all,
    which is how rejected and unpaid services reached the lab worklist.
    """
    rows = db.execute(text("""
        SELECT ServiceOrderItemId FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :oid AND IsDeleted = 0
        ORDER BY ServiceOrderItemId
    """), {"oid": order_id}).fetchall()

    released = []
    for row in rows:
        decision = gate.release_item(
            db, item_id=row.ServiceOrderItemId, released_by=released_by,
            role=role, reason=reason, clearance_type=clearance_type,
        )
        if decision.allowed:
            released.append(row.ServiceOrderItemId)
    return released


# ═══════════════════════════════════════════════════════════════════════════
# Reversal and refund
# ═══════════════════════════════════════════════════════════════════════════

def reverse_payment(db: Session, *, payment_id: int, by: str, reason: str) -> dict:
    """Reverse a payment: mark it and its allocations REVERSED, undo the release.

    Nothing is deleted. A release that exists because money arrived must not
    survive that money being reversed, so the order's releases are revoked and
    its statuses recomputed.
    """
    row = db.execute(text("""
        SELECT * FROM hospital.Billing_Payment WHERE PaymentId = :id FOR UPDATE
    """), {"id": payment_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found.")
    if row.Status == "REVERSED":
        raise HTTPException(status_code=409, detail="This payment is already reversed.")

    allocations = db.execute(text("""
        SELECT * FROM hospital.Billing_PaymentAllocation
        WHERE PaymentId = :id AND Status = 'ACTIVE'
    """), {"id": payment_id}).fetchall()

    db.execute(text("""
        UPDATE hospital.Billing_Payment
        SET Status = 'REVERSED', ReversedAt = NOW(), ReversedBy = :by,
            ReversalReason = :reason
        WHERE PaymentId = :id
    """), {"by": by, "reason": reason[:500], "id": payment_id})
    db.execute(text("""
        UPDATE hospital.Billing_PaymentAllocation
        SET Status = 'REVERSED' WHERE PaymentId = :id
    """), {"id": payment_id})

    touched_orders = set()
    for alloc in allocations:
        if alloc.AdvanceId:
            db.execute(text("""
                UPDATE hospital.Billing_Advance
                SET PaidAmount = GREATEST(0, PaidAmount - :amt),
                    Status = CASE
                        WHEN GREATEST(0, PaidAmount - :amt) <= 0 THEN 'PENDING'
                        WHEN GREATEST(0, PaidAmount - :amt) < TotalAmount THEN 'PARTIALLY_PAID'
                        ELSE 'PAID' END,
                    UpdatedBy = :by, UpdatedAt = NOW()
                WHERE AdvanceId = :aid
            """), {"amt": money(alloc.AllocatedAmount), "by": by,
                   "aid": alloc.AdvanceId})
        if alloc.ServiceOrderId:
            touched_orders.add(alloc.ServiceOrderId)

    for order_id in touched_orders:
        gate.revoke_releases_for_order(
            db, order_id, by=by,
            reason=f"Payment {row.ReceiptNo} reversed: {reason}"[:500])
        apply_financial_status(db, order_id)

    return {"PaymentId": payment_id, "ReceiptNo": row.ReceiptNo,
            "Amount": money(row.Amount), "OrdersAffected": sorted(touched_orders)}


def refund_advance(db: Session, *, advance_id: int, amount, reason: str,
                   by: str, mode: Optional[str] = None,
                   reference: Optional[str] = None) -> dict:
    """Refund part or all of what was collected on an advance bill.

    A refund is its own transaction. The original payment, its allocation and
    the advance bill all stay exactly as they were -- ``RefundedAmount`` records
    what went back. Deleting the payment row (the previous "refund") destroyed
    the only record that money had ever been taken.
    """
    advance = load_advance_for_update(db, advance_id)
    refundable = money(advance["PaidAmount"]) - money(advance["RefundedAmount"])
    amount = money(amount)

    if amount <= ZERO:
        raise HTTPException(status_code=400,
                            detail="Refund amount must be greater than zero.")
    if amount > refundable:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot refund {amount}: only {refundable} is refundable on "
                   f"advance bill {advance['AdvanceNo']}.",
        )

    refund_no = f"REF-{advance_id}-{uuid.uuid4().hex[:8].upper()}"
    db.execute(text("""
        INSERT INTO hospital.Billing_Refund
            (RefundNo, UHID, AdvanceId, ServiceOrderId, Amount, Reason,
             Status, RefundMode, RefundReference, ProcessedBy, ProcessedAt, CreatedBy)
        VALUES (:no, :uhid, :aid, :oid, :amount, :reason,
                'PAID', :mode, :ref, :by, NOW(), :by)
    """), {"no": refund_no, "uhid": advance["UHID"], "aid": advance_id,
           "oid": advance["ServiceOrderId"], "amount": amount,
           "reason": reason[:500], "mode": (mode or "CASH")[:50],
           "ref": (reference or "")[:100], "by": by})

    db.execute(text("""
        UPDATE hospital.Billing_Advance
        SET RefundedAmount = RefundedAmount + :amount,
            UpdatedBy = :by, UpdatedAt = NOW()
        WHERE AdvanceId = :id
    """), {"amount": amount, "by": by, "id": advance_id})

    order_id = advance["ServiceOrderId"]
    # Money going back can un-clear the order, so releases granted on the
    # strength of that money are withdrawn and the statuses recomputed.
    responsibility, paid = gate.order_financials(db, order_id)
    if paid + CENT < responsibility:
        gate.revoke_releases_for_order(
            db, order_id, by=by, reason=f"Refund {refund_no}: {reason}"[:500])
    apply_financial_status(db, order_id)

    return {"RefundNo": refund_no, "Amount": amount,
            "AdvanceId": advance_id, "ServiceOrderId": order_id}
