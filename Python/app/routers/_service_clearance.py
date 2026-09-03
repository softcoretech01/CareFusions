"""Which lab / radiology / OT work the floor is actually cleared to perform.

An order raised in OPD or on a ward is not automatically work to be done: the PRO
desk prices and approves it, an advance bill is raised, the patient pays, and only
then is the service released. Until that happens the order should not sit on a
technician's worklist looking like it is ready.

The rule used to be a looser, separate one:

    no PRO service order at all   -> VISIBLE
    approved + patient is insured -> VISIBLE (whatever the authorization said)
    approved + no insurance       -> visible once ServiceStatus said RELEASED

Both exemptions were holes, and they put this module in direct conflict with
``core.workflow_gate``, which is what actually decides whether the work may
proceed:

* "no service order" meant the 14 lab orders and 15 radiology orders in this
  database that predate the PRO wiring all showed as ready work -- and the gate
  refuses every one of them, so a technician could open a study and be told
  "not released" with nothing on the worklist to explain it;
* "patient is insured" let *having a policy* stand in for *this order being
  authorised*. A patient with any policy on file had their scans shown as ready
  regardless of whether the insurer had approved anything;
* ``ServiceStatus = 'RELEASED'`` is a column something else may have written. A
  release revoked when a payment was reversed left that column stale.

The rule is now the same one ``assert_execution_allowed`` enforces: work appears
when it has a live ``Service_Release``. Nothing silently disappears --
:func:`held_back_orders` returns what is held and why, so the worklist can show a
"waiting on the PRO desk / waiting on payment" section instead of a blank screen.

Completed work is never hidden by the caller: a finished scan and its report stay
on the worklist whatever the billing says.
"""

from sqlalchemy import text
from sqlalchemy.orm import Session


# An order is cleared for the floor when at least one of its items holds an
# ACTIVE release. Item-level enforcement is the execution gate's job; this is the
# order-level view the worklists need.
_RELEASED_ORDERS = """
    SELECT DISTINCT so.OrderNo
    FROM hospital.Service_Order so
    JOIN hospital.Service_OrderItem soi
      ON soi.ServiceOrderId = so.ServiceOrderId AND COALESCE(soi.IsDeleted, 0) = 0
    JOIN hospital.Service_Release sr
      ON sr.ServiceOrderItemId = soi.ServiceOrderItemId
     AND sr.ReleaseStatus = 'ACTIVE' AND COALESCE(sr.IsDeleted, 0) = 0
    WHERE so.IsDeleted = 0 AND so.OrderType = :order_type
"""


# Lab and Radiology keep their orders in separate tables; the worklist filter has
# to consider every order, including those with no Service_Order at all -- which
# is precisely the case the old rule waved through.
_SOURCE_ORDERS = """
    SELECT OrderNumber FROM hospital.Lab_Order WHERE :order_type = 'LAB'
    UNION ALL
    SELECT OrderNumber FROM hospital.Rad_Order WHERE :order_type = 'RADIOLOGY'
    UNION ALL
    SELECT OrderNo AS OrderNumber FROM hospital.Service_Order
    WHERE OrderType = :order_type AND IsDeleted = 0
"""


def blocked_order_numbers(db: Session, order_type: str) -> set:
    """Order numbers to hide from the execution worklist.

    Fail-CLOSED, matching the execution gate: an order that cannot be shown to
    hold a live release is blocked. The previous version returned an empty set on
    any error, "so a clearance lookup never takes the worklist down" -- which
    meant a malformed query silently unblocked every order in the hospital. For a
    financial gate that failure mode is the wrong way round.
    """
    rows = db.execute(text(f"""
        SELECT src.OrderNumber
        FROM ({_SOURCE_ORDERS}) src
        WHERE src.OrderNumber NOT IN ({_RELEASED_ORDERS})
    """), {"order_type": order_type}).fetchall()
    return {r.OrderNumber for r in rows if r.OrderNumber}


def held_back_orders(db: Session, order_type: str) -> dict:
    """``{OrderNo: reason}`` for everything the clearance rule is holding.

    So a worklist can say *why* a study is not on it. Without this the tightened
    rule would just make orders vanish, which is how the previous behaviour got
    loosened to "show everything" in the first place.
    """
    rows = db.execute(text("""
        SELECT so.OrderNo, so.PROStatus, so.PaymentStatus, so.FinancialStatus,
               so.ServiceStatus,
               (SELECT COUNT(*) FROM hospital.Service_OrderItem soi
                 JOIN hospital.Service_Release sr
                   ON sr.ServiceOrderItemId = soi.ServiceOrderItemId
                  AND sr.ReleaseStatus = 'ACTIVE'
                WHERE soi.ServiceOrderId = so.ServiceOrderId) AS ActiveReleases
        FROM hospital.Service_Order so
        WHERE so.IsDeleted = 0 AND so.OrderType = :order_type
    """), {"order_type": order_type}).fetchall()

    known = {}
    for r in rows:
        if r.ActiveReleases:
            continue
        if r.PROStatus == 'REJECTED':
            known[r.OrderNo] = "Rejected by the PRO desk."
        elif r.PROStatus in ('PENDING', 'UNDER_REVIEW'):
            known[r.OrderNo] = "Awaiting PRO review."
        elif r.FinancialStatus != 'CLEARED':
            known[r.OrderNo] = f"Awaiting payment ({r.PaymentStatus})."
        else:
            known[r.OrderNo] = "Awaiting service release."

    source = "Lab_Order" if order_type == 'LAB' else "Rad_Order"
    orphans = db.execute(text(f"""
        SELECT h.OrderNumber FROM hospital.{source} h
        LEFT JOIN hospital.Service_Order so ON so.OrderNo = h.OrderNumber
        WHERE so.ServiceOrderId IS NULL
    """)).fetchall()
    for r in orphans:
        known[r.OrderNumber] = ("No PRO service order exists for this order, so it "
                                "has not been reviewed, billed or released.")
    return known


def admission_has_cleared_operation(db: Session, admission_id) -> bool:
    """Whether the EMR may record an operation against this admission.

    Same rule as the worklists, expressed per admission: there must be a live
    release on an OPERATION item.

    Two separate bugs lived here. The original check looked for
    ``OrderType LIKE '%OT%' OR = 'SURGERY'``, neither of which an operation order
    can satisfy -- the type is 'OPERATION', which contains no "OT", and 'SURGERY'
    is not in the enum -- so the EMR stayed locked however the PRO desk had
    ruled. The replacement then over-corrected by accepting
    ``PROStatus = 'APPROVED' AND patient is insured``, which unlocked an
    operation on the strength of the patient merely holding a policy.
    """
    if not admission_id:
        return False
    row = db.execute(text("""
        SELECT 1
        FROM hospital.Service_Order so
        JOIN hospital.Service_OrderItem soi
          ON soi.ServiceOrderId = so.ServiceOrderId AND COALESCE(soi.IsDeleted, 0) = 0
        JOIN hospital.Service_Release sr
          ON sr.ServiceOrderItemId = soi.ServiceOrderItemId
         AND sr.ReleaseStatus = 'ACTIVE' AND COALESCE(sr.IsDeleted, 0) = 0
        WHERE so.AdmissionId = :adm_id
          AND so.IsDeleted = 0
          AND (so.OrderType = 'OPERATION' OR soi.ItemType = 'OPERATION')
        LIMIT 1
    """), {"adm_id": admission_id}).scalar()
    return row is not None
