"""Which lab / radiology orders the PRO desk has cleared for the floor to perform.

An order raised in OPD or on a ward is not automatically work to be done: the PRO
desk prices and approves it first, and an uninsured patient pays the advance before
the service is released. Until then the order should not sit on a technician's
worklist as if it were ready.

Clearance, per the agreed rule:

  * no PRO service order at all  -> visible. Most orders predate the PRO wiring and
    hiding them would empty the worklists of real, pending clinical work.
  * PRO not approved             -> hidden.
  * approved + patient insured   -> visible. Cover settles the bill; the scan is not
    held up waiting for money at the counter.
  * approved + no insurance      -> visible only once the service is RELEASED, which
    is what paying the advance sets.

Completed work is never hidden by the caller — a finished scan and its report stay
on the worklist whatever the billing says.
"""

from sqlalchemy import text
from sqlalchemy.orm import Session


# A patient counts as insured on the same terms the UI uses: a policy in the
# insurance register, or provider/policy details captured at registration.
_INSURED = """
    EXISTS (
        SELECT 1 FROM hospital.Ins_Policy pol
         WHERE pol.Uhid = so.UHID
    )
    OR EXISTS (
        SELECT 1 FROM registration.PatientRegistration pr
         WHERE pr.Uhid = so.UHID
           AND COALESCE(pr.IsDeleted, 0) = 0
           AND LOWER(TRIM(COALESCE(pr.InsuranceRequired, ''))) = 'yes'
           AND (
               NULLIF(TRIM(COALESCE(pr.InsuranceProvider, '')), '') IS NOT NULL
               OR NULLIF(TRIM(COALESCE(pr.PolicyNumber, '')), '') IS NOT NULL
           )
    )
"""


def admission_has_cleared_operation(db: Session, admission_id) -> bool:
    """Whether the EMR may record an operation against this admission.

    Same clearance rule as the worklists, expressed per admission. The old check
    looked for `OrderType LIKE '%OT%' OR = 'SURGERY'`, neither of which an operation
    order can ever satisfy — the type is 'OPERATION', which contains no "OT", and
    'SURGERY' is not in the enum. (The LIKE only ever matched 'OTHER'.) So the EMR
    stayed locked no matter how the PRO desk had ruled.
    """
    if not admission_id:
        return False
    try:
        row = db.execute(text(f"""
            SELECT 1
            FROM hospital.Service_Order so
            JOIN hospital.Service_OrderItem soi ON soi.ServiceOrderId = so.ServiceOrderId
            WHERE so.AdmissionId = :adm_id
              AND so.IsDeleted = 0
              AND COALESCE(soi.IsDeleted, 0) = 0
              AND (so.OrderType = 'OPERATION' OR soi.ItemType = 'OPERATION')
              AND (
                    soi.ServiceStatus IN ('RELEASED', 'COMPLETED')
                    OR (so.PROStatus = 'APPROVED' AND ({_INSURED}))
              )
            LIMIT 1
        """), {"adm_id": admission_id}).scalar()
        return row is not None
    except Exception:
        return False


def blocked_order_numbers(db: Session, order_type: str) -> set:
    """Order numbers whose PRO clearance is still outstanding.

    Returns the OrderNo values to hide. Anything absent from this set is visible,
    which deliberately includes orders with no service order at all.
    """
    try:
        rows = db.execute(text(f"""
            SELECT so.OrderNo
            FROM hospital.Service_Order so
            WHERE so.IsDeleted = 0
              AND so.OrderType = :order_type
              AND NOT (
                    so.PROStatus = 'APPROVED'
                    AND (so.ServiceStatus = 'RELEASED' OR ({_INSURED}))
              )
        """), {"order_type": order_type}).fetchall()
        return {r.OrderNo for r in rows if r.OrderNo}
    except Exception:
        # Never let a clearance lookup take the worklist down with it: showing an
        # extra order is recoverable, an empty worklist during a clinic is not.
        return set()
