"""The single authority on service-order money and on whether a service may run.

Everything the PRO workflow must guarantee lives here, so that there is exactly
one implementation of each rule instead of one per router:

* ``compute_item_amounts`` -- the arithmetic. The API previously stored whatever
  the client posted, so a discount larger than the price produced a NetAmount of
  -999,899 and the service was released anyway.
* ``approved_insurance_cover`` -- how much insurance is allowed to absorb. The
  API previously trusted a client-supplied ``InsuranceCoveredAmount``, so any
  caller could drive patient responsibility to zero and have a Rs.10,000 MRI
  auto-released without a rupee collected.
* ``evaluate_release`` -- ``can_release_service(ServiceOrderItemId)``. Every
  precondition in the business workflow, checked against ground truth (the
  order, the item, the advance bill, the payments, the authorization) rather
  than against status columns that something else may have written.
* ``assert_execution_allowed`` -- the gate Lab / Radiology / OT call before
  acting on a test. It is FAIL-CLOSED: an order it cannot resolve is refused.
  The previous gate read ``if svc_status and svc_status != 'RELEASED'``, so a
  join that matched nothing returned None and execution proceeded -- which is
  how 18 of 20 lab orders and 19 of 20 radiology orders were executable with no
  PRO approval and no payment at all.

Money is Decimal throughout. Floats were losing paise on every recalculation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

CENT = Decimal("0.01")
ZERO = Decimal("0.00")

# Statuses that mean "this authorization does not block execution".
AUTH_SATISFIED = ("NOT_REQUIRED", "APPROVED", "PARTIALLY_APPROVED")
# Statuses under which insurance may actually absorb part of the bill.
AUTH_PAYS = ("APPROVED", "PARTIALLY_APPROVED")


def money(value) -> Decimal:
    """Coerce anything numeric to a 2-decimal Decimal, rounding half-up."""
    if value is None:
        return ZERO
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


# ═══════════════════════════════════════════════════════════════════════════
# Money
# ═══════════════════════════════════════════════════════════════════════════

@dataclass(frozen=True)
class ItemAmounts:
    quantity: int
    pro_price: Decimal          # per unit
    gross: Decimal              # pro_price * quantity
    discount: Decimal           # clamped to <= gross
    net: Decimal                # gross - discount, never negative
    insurance: Decimal          # clamped to <= net and to the authorized cap
    patient: Decimal            # net - insurance, never negative

    def as_params(self) -> dict:
        return {
            "PROPrice": self.pro_price,
            "AuthorizedDiscount": self.discount,
            "GrossAmount": self.gross,
            "NetAmount": self.net,
            "InsuranceCoveredAmount": self.insurance,
            "PatientResponsibility": self.patient,
        }


def compute_item_amounts(*, quantity, pro_price, discount, insurance_cover,
                         insurance_cap: Optional[Decimal] = None) -> ItemAmounts:
    """Derive every amount on a service item from its inputs.

    Clamping rather than rejecting is deliberate for the *upper* bounds that
    have a natural ceiling (a discount cannot exceed the gross; insurance cannot
    exceed the net or the authorized cap). Inputs that are outright invalid --
    a PRO price above the master price, a negative anything -- are rejected by
    :func:`validate_pricing` before this is called, because silently clamping
    those would hide a mistake instead of surfacing it.
    """
    qty = max(1, int(quantity or 1))
    unit = max(ZERO, money(pro_price))
    gross = money(unit * qty)

    disc = max(ZERO, money(discount))
    if disc > gross:
        disc = gross
    net = gross - disc

    ins = max(ZERO, money(insurance_cover))
    if insurance_cap is not None and ins > insurance_cap:
        ins = money(insurance_cap)
    if ins > net:
        ins = net

    return ItemAmounts(
        quantity=qty, pro_price=unit, gross=gross, discount=disc,
        net=net, insurance=ins, patient=net - ins,
    )


def validate_pricing(*, item_name: str, master_price, quantity, pro_price,
                     discount) -> Optional[str]:
    """Return a human-readable rejection reason, or None if the pricing is legal.

    The master price is read-only to the PRO: they may discount, never inflate.
    The comparison is per unit, because PROPrice is a unit price -- the old
    check compared a line total against a unit master price, so any item with
    quantity > 1 was rejected even when correctly priced.
    """
    unit_master = money(master_price)
    unit_pro = money(pro_price)

    if unit_pro < ZERO:
        return f"'{item_name}': price cannot be negative."
    if money(discount) < ZERO:
        return f"'{item_name}': discount cannot be negative."
    if int(quantity or 1) < 1:
        return f"'{item_name}': quantity must be at least 1."
    if unit_master > ZERO and unit_pro > unit_master:
        return (f"'{item_name}': PRO price {unit_pro} exceeds the master price "
                f"{unit_master}. The master price is read-only and may only be "
                f"discounted.")
    return None


# ═══════════════════════════════════════════════════════════════════════════
# Insurance authorization
# ═══════════════════════════════════════════════════════════════════════════

def approved_insurance_cover(db: Session, service_order_id: int) -> Decimal:
    """The most insurance may absorb on this order, per real pre-authorizations.

    Only pre-authorizations explicitly linked to this service order count. A
    patient having *some* approved pre-auth somewhere does not authorise cover
    on an unrelated order, and a CLAIM is not a pre-authorization -- claims are
    raised after the fact and say nothing about whether this service was
    approved in advance.

    With no linked pre-auth the cap is zero, so insurance cannot reduce what the
    patient owes until the insurance desk links an approved authorization.
    """
    row = db.execute(text("""
        SELECT COALESCE(SUM(COALESCE(ApprovedAmount, 0)), 0) AS cap
        FROM hospital.Ins_PreAuth
        WHERE ServiceOrderId = :oid
          AND UPPER(Status) IN ('APPROVED', 'PARTIALLY_APPROVED')
    """), {"oid": service_order_id}).fetchone()
    return money(row.cap if row else 0)


def authorization_status_for(db: Session, service_order_id: int) -> str:
    """Roll the order's linked pre-authorizations up into one status.

    A REJECTED or EXPIRED authorization must block the service; PENDING and
    SUBMITTED must block it too, because "we asked" is not "they agreed".
    """
    rows = db.execute(text("""
        SELECT UPPER(Status) AS Status
        FROM hospital.Ins_PreAuth
        WHERE ServiceOrderId = :oid
    """), {"oid": service_order_id}).fetchall()
    if not rows:
        return "NOT_REQUIRED"

    statuses = {r.Status for r in rows}
    for blocking in ("REJECTED", "EXPIRED", "PENDING", "SUBMITTED"):
        if blocking in statuses:
            return blocking
    if "PARTIALLY_APPROVED" in statuses:
        return "PARTIALLY_APPROVED"
    if "APPROVED" in statuses:
        return "APPROVED"
    return "PENDING"


# ═══════════════════════════════════════════════════════════════════════════
# can_release_service
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ReleaseDecision:
    allowed: bool
    blockers: list = field(default_factory=list)
    item: Optional[dict] = None
    order: Optional[dict] = None
    patient_responsibility: Decimal = ZERO
    paid: Decimal = ZERO

    def reason(self) -> str:
        return " ".join(self.blockers) if self.blockers else ""


def order_financials(db: Session, service_order_id: int) -> tuple[Decimal, Decimal]:
    """(what the patient owes on this order, what has actually been collected).

    Responsibility counts APPROVED items only -- a rejected item is not payable,
    and including it would make an order permanently unpayable.

    Collected is taken from the live advance bill net of refunds. Payment rows
    in Billing_Payment are the ledger; ``Billing_Advance.PaidAmount`` is the
    running total the payment and reversal routines maintain in the same
    transaction, so the two agree by construction and legacy rows written before
    the ledger existed still report correctly.
    """
    resp = db.execute(text("""
        SELECT COALESCE(SUM(PatientResponsibility), 0) AS total
        FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND PROStatus = 'APPROVED'
          AND ServiceStatus <> 'CANCELLED'
    """), {"oid": service_order_id}).scalar()

    paid = db.execute(text("""
        SELECT COALESCE(SUM(PaidAmount - RefundedAmount), 0) AS paid
        FROM hospital.Billing_Advance
        WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND Status <> 'CANCELLED'
    """), {"oid": service_order_id}).scalar()

    return money(resp), money(paid)


def evaluate_release(db: Session, item_id: int, *, for_update: bool = False) -> ReleaseDecision:
    """``can_release_service(ServiceOrderItemId)``.

    Answers from the underlying facts, never from ``ServiceStatus`` -- the whole
    point is to decide whether that column is *allowed* to say RELEASED.
    """
    lock = " FOR UPDATE" if for_update else ""
    item_row = db.execute(text(f"""
        SELECT * FROM hospital.Service_OrderItem
        WHERE ServiceOrderItemId = :id{lock}
    """), {"id": item_id}).fetchone()

    if not item_row:
        return ReleaseDecision(False, ["Service order item does not exist."])

    item = dict(item_row._mapping)
    if item.get("IsDeleted"):
        return ReleaseDecision(False, ["Service order item has been deleted."], item=item)

    order_row = db.execute(text(f"""
        SELECT * FROM hospital.Service_Order
        WHERE ServiceOrderId = :oid{lock}
    """), {"oid": item["ServiceOrderId"]}).fetchone()

    if not order_row:
        return ReleaseDecision(False, ["Parent service order does not exist."], item=item)

    order = dict(order_row._mapping)
    blockers: list[str] = []

    if order.get("IsDeleted"):
        blockers.append("The service order has been deleted.")
    if order.get("OrderStatus") == "CANCELLED":
        blockers.append("The service order is cancelled.")

    # ── PRO gate ────────────────────────────────────────────────────────────
    if order.get("PROStatus") != "APPROVED":
        blockers.append(
            f"The order has not been approved by PRO (PROStatus="
            f"{order.get('PROStatus')})."
        )
    if item.get("PROStatus") != "APPROVED":
        blockers.append(
            f"This item has not been approved by PRO (PROStatus="
            f"{item.get('PROStatus')})."
        )

    # ── Item lifecycle ──────────────────────────────────────────────────────
    if item.get("ServiceStatus") == "CANCELLED":
        blockers.append("This item is cancelled.")
    if item.get("ServiceStatus") == "COMPLETED":
        blockers.append("This item is already completed.")

    already = db.execute(text("""
        SELECT ServiceReleaseId FROM hospital.Service_Release
        WHERE ServiceOrderItemId = :id AND ReleaseStatus = 'ACTIVE' AND IsDeleted = 0
        LIMIT 1
    """), {"id": item_id}).fetchone()
    if already:
        blockers.append("This item already has an active service release.")

    # ── Insurance authorization ─────────────────────────────────────────────
    auth = authorization_status_for(db, order["ServiceOrderId"])
    if auth not in AUTH_SATISFIED:
        blockers.append(f"Insurance authorization is {auth}.")
    if money(item.get("InsuranceCoveredAmount")) > ZERO and auth not in AUTH_PAYS:
        blockers.append(
            "The item claims insurance cover but no approved pre-authorization "
            "backs it."
        )

    # ── Financial gate ──────────────────────────────────────────────────────
    responsibility, paid = order_financials(db, order["ServiceOrderId"])

    if responsibility > ZERO:
        advance = db.execute(text("""
            SELECT AdvanceId, TotalAmount, PaidAmount, RefundedAmount, Status
            FROM hospital.Billing_Advance
            WHERE ServiceOrderId = :oid AND IsDeleted = 0 AND Status <> 'CANCELLED'
            LIMIT 1
        """), {"oid": order["ServiceOrderId"]}).fetchone()

        if not advance:
            blockers.append(
                "No advance bill exists for this order, so nothing can have "
                "been collected."
            )
        elif paid + CENT < responsibility:
            blockers.append(
                f"Payment is incomplete: {paid} collected of {responsibility} "
                f"payable."
            )

    return ReleaseDecision(
        allowed=not blockers,
        blockers=blockers,
        item=item,
        order=order,
        patient_responsibility=responsibility,
        paid=paid,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Applying a release
# ═══════════════════════════════════════════════════════════════════════════

def record_clearance(db: Session, *, item_id: int, order_id: int,
                     clearance_type: str, amount: Decimal, cleared_by: str,
                     notes: str = "") -> None:
    """Record (idempotently) that this item is financially cleared."""
    db.execute(text("""
        INSERT INTO hospital.Service_FinancialClearance
            (ServiceOrderItemId, ServiceOrderId, ClearanceType, ClearedAmount,
             ClearedBy, Status, Notes)
        SELECT :item_id, :order_id, :ctype, :amount, :by, 'ACTIVE', :notes
        WHERE NOT EXISTS (
            SELECT 1 FROM hospital.Service_FinancialClearance
            WHERE ServiceOrderItemId = :item_id AND Status = 'ACTIVE'
        )
    """), {"item_id": item_id, "order_id": order_id, "ctype": clearance_type,
           "amount": amount, "by": cleared_by, "notes": notes})


def release_item(db: Session, *, item_id: int, released_by: str, role: str,
                 reason: str, clearance_type: str = "PAID") -> ReleaseDecision:
    """Release one item, but only if :func:`evaluate_release` says so.

    Takes the row locks first so two concurrent release attempts serialise; the
    unique index on Service_Release.ActiveItemKey is the backstop if they do
    not.
    """
    decision = evaluate_release(db, item_id, for_update=True)
    if not decision.allowed:
        return decision

    item, order = decision.item, decision.order

    db.execute(text("""
        INSERT INTO hospital.Service_Release
            (ServiceOrderItemId, ReleaseDate, ReleasedBy, ReleasedByRole,
             ReleaseStatus, ReleaseReason)
        VALUES (:item_id, NOW(), :by, :role, 'ACTIVE', :reason)
    """), {"item_id": item_id, "by": released_by, "role": role, "reason": reason})

    db.execute(text("""
        UPDATE hospital.Service_OrderItem
        SET ServiceStatus = 'RELEASED', FinancialStatus = 'CLEARED', UpdatedAt = NOW()
        WHERE ServiceOrderItemId = :id
    """), {"id": item_id})

    record_clearance(
        db, item_id=item_id, order_id=order["ServiceOrderId"],
        clearance_type=clearance_type,
        amount=money(item.get("PatientResponsibility")),
        cleared_by=released_by, notes=reason,
    )

    sync_order_from_items(db, order["ServiceOrderId"])
    return decision


def revoke_releases_for_order(db: Session, order_id: int, *, by: str,
                              reason: str) -> int:
    """Withdraw every active release on an order and undo the item statuses.

    Used when a payment is reversed or an order cancelled: a release that was
    granted because money arrived must not survive that money going away.
    """
    revoked = db.execute(text("""
        UPDATE hospital.Service_Release sr
        JOIN hospital.Service_OrderItem soi
          ON soi.ServiceOrderItemId = sr.ServiceOrderItemId
        SET sr.ReleaseStatus = 'REVOKED', sr.RevokedAt = NOW(),
            sr.RevokedBy = :by, sr.RevokeReason = :reason, sr.UpdatedAt = NOW()
        WHERE soi.ServiceOrderId = :oid AND sr.ReleaseStatus = 'ACTIVE'
    """), {"oid": order_id, "by": by, "reason": reason}).rowcount

    db.execute(text("""
        UPDATE hospital.Service_FinancialClearance
        SET Status = 'REVOKED', RevokedAt = NOW(), RevokedBy = :by
        WHERE ServiceOrderId = :oid AND Status = 'ACTIVE'
    """), {"oid": order_id, "by": by})

    # Items that were only RELEASED go back; ones already IN_PROGRESS or
    # COMPLETED are left alone -- the work happened, and rewriting history to
    # say it did not would be worse than the inconsistency.
    db.execute(text("""
        UPDATE hospital.Service_OrderItem
        SET ServiceStatus = 'NOT_RELEASED', UpdatedAt = NOW()
        WHERE ServiceOrderId = :oid AND ServiceStatus = 'RELEASED' AND IsDeleted = 0
    """), {"oid": order_id})

    sync_order_from_items(db, order_id)
    return revoked


def sync_order_from_items(db: Session, order_id: int) -> None:
    """Roll item statuses up to the order so the two can never contradict.

    The order is the weakest of its items: it is only RELEASED when every
    payable item is, only CLEARED when every item is, and only PAID when every
    item is. Previously the order and its items were written independently, so
    "order RELEASED, item NOT_RELEASED" was an ordinary outcome.
    """
    row = db.execute(text("""
        SELECT
            COUNT(*)                                                      AS total,
            SUM(PROStatus = 'APPROVED')                                   AS approved,
            SUM(PROStatus = 'REJECTED')                                   AS rejected,
            SUM(ServiceStatus IN ('RELEASED','IN_PROGRESS','COMPLETED'))  AS released,
            SUM(ServiceStatus = 'COMPLETED')                              AS completed,
            SUM(ServiceStatus = 'CANCELLED')                              AS cancelled,
            SUM(FinancialStatus = 'CLEARED')                              AS cleared,
            SUM(PaymentStatus IN ('PAID','NOT_REQUIRED'))                 AS paid,
            SUM(PaymentStatus = 'PARTIALLY_PAID')                         AS part_paid
        FROM hospital.Service_OrderItem
        WHERE ServiceOrderId = :oid AND IsDeleted = 0
    """), {"oid": order_id}).fetchone()

    if not row or not row.total:
        return

    total = int(row.total)
    live = total - int(row.cancelled or 0)

    if int(row.rejected or 0) == total:
        pro_status = "REJECTED"
    elif int(row.approved or 0) + int(row.rejected or 0) == total and int(row.approved or 0) > 0:
        pro_status = "APPROVED"
    else:
        pro_status = None  # still under review; leave whatever review set

    if live and int(row.completed or 0) >= live:
        service_status = "COMPLETED"
    elif live and int(row.released or 0) >= live:
        service_status = "RELEASED"
    elif int(row.released or 0) > 0:
        service_status = "IN_PROGRESS"
    else:
        service_status = "NOT_RELEASED"

    if live and int(row.cleared or 0) >= live:
        financial_status = "CLEARED"
    elif int(row.cleared or 0) > 0 or int(row.part_paid or 0) > 0:
        financial_status = "PARTIALLY_CLEARED"
    else:
        financial_status = "NOT_CLEARED"

    if live and int(row.paid or 0) >= live:
        payment_status = "PAID"
    elif int(row.paid or 0) > 0 or int(row.part_paid or 0) > 0:
        payment_status = "PARTIALLY_PAID"
    else:
        payment_status = "UNPAID"

    params = {
        "oid": order_id,
        "service_status": service_status,
        "financial_status": financial_status,
        "payment_status": payment_status,
    }
    pro_sql = ""
    if pro_status:
        pro_sql = "PROStatus = :pro_status,"
        params["pro_status"] = pro_status

    db.execute(text(f"""
        UPDATE hospital.Service_Order
        SET {pro_sql}
            ServiceStatus = :service_status,
            FinancialStatus = :financial_status,
            PaymentStatus = :payment_status,
            UpdatedAt = NOW()
        WHERE ServiceOrderId = :oid
    """), params)


# ═══════════════════════════════════════════════════════════════════════════
# The execution gate (Lab / Radiology / OT)
# ═══════════════════════════════════════════════════════════════════════════

class ServiceNotReleased(HTTPException):
    """Raised when a module tries to act on a service that is not released.

    Subclasses HTTPException so that a router's existing ``except HTTPException:
    raise`` passes it straight through to the client with its real status and
    message, instead of a broad ``except Exception`` flattening the refusal into
    an opaque 500.
    """

    def __init__(self, message: str, *, status_code: int = 403):
        super().__init__(status_code=status_code, detail=message)
        self.message = message


def resolve_item_for_source(db: Session, *, order_no: str,
                            item_name: Optional[str] = None,
                            item_id: Optional[str] = None) -> Optional[dict]:
    """Find the Service_OrderItem behind a Lab/Rad test.

    Matching is by order number plus item identity. ItemId is preferred because
    names collide; the name is the fallback for orders written before ItemId was
    populated.
    """
    conditions = ["so.OrderNo = :order_no", "soi.IsDeleted = 0"]
    params: dict = {"order_no": order_no}

    if item_id is not None and str(item_id).strip() not in ("", "None"):
        conditions.append("(soi.ItemId = :item_id OR soi.ItemName = :item_name)")
        params["item_id"] = str(item_id)
        params["item_name"] = item_name or ""
    elif item_name:
        conditions.append("soi.ItemName = :item_name")
        params["item_name"] = item_name

    row = db.execute(text(f"""
        SELECT soi.*
        FROM hospital.Service_OrderItem soi
        JOIN hospital.Service_Order so ON so.ServiceOrderId = soi.ServiceOrderId
        WHERE {' AND '.join(conditions)}
        ORDER BY soi.ServiceOrderItemId
        LIMIT 1
    """), params).fetchone()

    return dict(row._mapping) if row else None


def assert_execution_allowed(db: Session, *, order_no: str,
                             item_name: Optional[str] = None,
                             item_id: Optional[str] = None,
                             action: str = "execute this service") -> dict:
    """FAIL-CLOSED gate. Returns the item, or raises :class:`ServiceNotReleased`.

    Unresolvable means refused. An order with no service-order backbone never
    passed PRO review, was never billed, and was never released -- treating that
    as permission was the single largest hole in the workflow.
    """
    if not order_no:
        raise ServiceNotReleased(
            f"Cannot {action}: the order has no order number to check against "
            f"the service-release workflow."
        )

    item = resolve_item_for_source(db, order_no=order_no, item_name=item_name,
                                   item_id=item_id)
    if not item:
        raise ServiceNotReleased(
            f"Cannot {action}: order '{order_no}'"
            + (f" / '{item_name}'" if item_name else "")
            + " has no service order behind it, so it has not been through PRO "
              "review, billing or service release. Ask the PRO desk to raise the "
              "service order before proceeding.",
            status_code=409,
        )

    if item.get("ServiceStatus") not in ("RELEASED", "IN_PROGRESS", "COMPLETED"):
        decision = evaluate_release(db, item["ServiceOrderItemId"])
        raise ServiceNotReleased(
            f"Cannot {action}: '{item.get('ItemName')}' is not released. "
            + (decision.reason() or "It has not passed financial clearance.")
        )

    active = db.execute(text("""
        SELECT 1 FROM hospital.Service_Release
        WHERE ServiceOrderItemId = :id AND ReleaseStatus = 'ACTIVE' AND IsDeleted = 0
        LIMIT 1
    """), {"id": item["ServiceOrderItemId"]}).fetchone()
    if not active:
        raise ServiceNotReleased(
            f"Cannot {action}: '{item.get('ItemName')}' is marked "
            f"{item.get('ServiceStatus')} but has no active service release. "
            f"The release was revoked or never granted."
        )

    return item


def _assert_ordered_test_executable(db: Session, *, table_order: str, table_test: str,
                                    order_test_id, action: str) -> dict:
    """Shared gate for a Lab or Radiology ordered test, by its OrderTestId."""
    try:
        test_pk = int(str(order_test_id).replace("TEST-", "").strip())
    except (TypeError, ValueError):
        raise ServiceNotReleased(
            f"Cannot {action}: '{order_test_id}' is not a valid test id.",
            status_code=400,
        )

    row = db.execute(text(f"""
        SELECT h.OrderNumber, t.TestName, t.TestId
        FROM hospital.{table_test} t
        JOIN hospital.{table_order} h ON h.OrderId = t.OrderId
        WHERE t.OrderTestId = :id
        LIMIT 1
    """), {"id": test_pk}).fetchone()

    if not row:
        raise ServiceNotReleased(
            f"Cannot {action}: ordered test {order_test_id} does not exist.",
            status_code=404,
        )

    return assert_execution_allowed(
        db, order_no=row.OrderNumber, item_name=row.TestName,
        item_id=row.TestId, action=action,
    )


def assert_lab_test_executable(db: Session, order_test_id, action: str = "update this lab test") -> dict:
    """Gate a lab test. Raises :class:`ServiceNotReleased` unless it is released."""
    return _assert_ordered_test_executable(
        db, table_order="Lab_Order", table_test="Lab_OrderTest",
        order_test_id=order_test_id, action=action)


def assert_rad_test_executable(db: Session, order_test_id, action: str = "update this radiology test") -> dict:
    """Gate a radiology test. Raises :class:`ServiceNotReleased` unless released."""
    return _assert_ordered_test_executable(
        db, table_order="Rad_Order", table_test="Rad_OrderTest",
        order_test_id=order_test_id, action=action)


def released_item_ids(db: Session, order_nos: Iterable[str]) -> set:
    """Item names that are genuinely released, for filtering execution queues."""
    order_list = [o for o in order_nos if o]
    if not order_list:
        return set()
    rows = db.execute(text("""
        SELECT so.OrderNo, soi.ItemName
        FROM hospital.Service_OrderItem soi
        JOIN hospital.Service_Order so ON so.ServiceOrderId = soi.ServiceOrderId
        JOIN hospital.Service_Release sr
          ON sr.ServiceOrderItemId = soi.ServiceOrderItemId
         AND sr.ReleaseStatus = 'ACTIVE' AND sr.IsDeleted = 0
        WHERE so.OrderNo IN :orders AND soi.IsDeleted = 0
    """), {"orders": tuple(order_list)}).fetchall()
    return {(r.OrderNo, r.ItemName) for r in rows}
