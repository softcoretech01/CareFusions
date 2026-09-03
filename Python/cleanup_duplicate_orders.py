"""Void the duplicate lab / radiology orders created by repeated "Update EMR" clicks.

Background: re-submitting a consultation's order list created a fresh order every
time, so one entry by the doctor became up to five identical lab orders and three
radiology orders, each with its own service order and its own row for the PRO
desk to price. The bug is fixed (see app/routers/_order_dedupe.py); this clears
the rows it already produced.

What survives is decided from ``Trn_OpdVisitLabOrder`` / ``Trn_OpdVisitRadiologyOrder``
-- what the doctor actually wrote on the visit -- not from the duplicated orders
themselves.

Selection rule, per patient and test name:

  1. An order with money collected, an active release, or a recorded result is
     ALWAYS kept. Real money and real work outrank tidiness.
  2. Otherwise the most recent ordering group is kept, because that is the
     submission the doctor last confirmed.
  3. Everything else in that (patient, test) set is voided.

Nothing is hard-deleted. Service orders are soft-deleted (IsDeleted = 1), the
source Lab_Order / Rad_Order rows and their tests are marked Cancelled, and any
advance bill is cancelled -- so the rows leave the screens and the worklists but
the history stays in the database and can be restored.

Run with --apply to commit; without it, this is a dry run.

    Python/venv/Scripts/python.exe Python/cleanup_duplicate_orders.py
    Python/venv/Scripts/python.exe Python/cleanup_duplicate_orders.py --apply
"""
import sys
from collections import defaultdict

sys.path.insert(0, ".")

from sqlalchemy import text

from app.database import engine

APPLY = "--apply" in sys.argv
REASON = "Duplicate created by repeated EMR submission; superseded."


def norm(name) -> str:
    return " ".join(str(name or "").split()).casefold()


def load_orders(conn):
    """Every OPD lab/radiology service order, with whatever is attached to it."""
    return conn.execute(text("""
        SELECT so.ServiceOrderId, so.OrderNo, so.OrderGroupNo, so.OrderType,
               so.UHID, so.CreatedAt, so.PROStatus,
               (SELECT GROUP_CONCAT(ItemName ORDER BY ServiceOrderItemId)
                  FROM hospital.Service_OrderItem i
                 WHERE i.ServiceOrderId = so.ServiceOrderId AND i.IsDeleted = 0) AS Tests,
               (SELECT COALESCE(SUM(PaidAmount - RefundedAmount), 0)
                  FROM hospital.Billing_Advance a
                 WHERE a.ServiceOrderId = so.ServiceOrderId AND a.Status <> 'CANCELLED') AS Collected,
               (SELECT COUNT(*) FROM hospital.Service_OrderItem i
                  JOIN hospital.Service_Release sr ON sr.ServiceOrderItemId = i.ServiceOrderItemId
                 WHERE i.ServiceOrderId = so.ServiceOrderId AND sr.ReleaseStatus = 'ACTIVE') AS Releases,
               (SELECT COUNT(*) FROM hospital.Lab_OrderTest t
                  JOIN hospital.Lab_Order h ON h.OrderId = t.OrderId
                 WHERE h.OrderNumber = so.OrderNo
                   AND (COALESCE(t.ResultValue, '') <> ''
                        OR UPPER(COALESCE(t.Status, '')) NOT IN ('PENDING', 'ORDERED'))) AS LabWork,
               (SELECT COUNT(*) FROM hospital.Rad_OrderTest t
                  JOIN hospital.Rad_Order h ON h.OrderId = t.OrderId
                 WHERE h.OrderNumber = so.OrderNo
                   AND (COALESCE(t.ResultValue, '') <> ''
                        OR UPPER(COALESCE(t.Status, '')) NOT IN ('PENDING', 'ORDERED'))) AS RadWork
        FROM hospital.Service_Order so
        WHERE so.IsDeleted = 0
          AND so.SourceModule = 'OPD'
          AND so.OrderType IN ('LAB', 'RADIOLOGY')
        ORDER BY so.UHID, so.CreatedAt, so.ServiceOrderId
    """)).fetchall()


def is_protected(o) -> bool:
    """Money collected, work released, or a result recorded — never void these."""
    return float(o.Collected or 0) > 0 or o.Releases > 0 or (o.LabWork + o.RadWork) > 0


def doctor_intent(conn) -> dict:
    """How many lab tests and radiology studies the doctor wrote, per patient.

    Read from the visit record, which is the doctor's own note of what they
    ordered and is untouched by the duplication bug. This is what makes the
    cleanup safe on a case the test-name rule alone gets wrong: Durai has two
    rejected CT orders AND a paid MRI, and matching on test name would never
    compare a CT to an MRI, so both would survive. The visit says one radiology
    study, so only one is kept.
    """
    intent = defaultdict(int)
    for r in conn.execute(text("""
        SELECT v.Uhid, 'LAB' AS OrderType, COUNT(DISTINCT l.TestName) AS n
        FROM hospital.Trn_OpdVisit v
        JOIN hospital.Trn_OpdVisitLabOrder l ON l.VisitId = v.VisitId
        GROUP BY v.Uhid
        UNION ALL
        SELECT v.Uhid, 'RADIOLOGY', COUNT(DISTINCT CONCAT(r.Modality, '/', r.BodyPart))
        FROM hospital.Trn_OpdVisit v
        JOIN hospital.Trn_OpdVisitRadiologyOrder r ON r.VisitId = v.VisitId
        GROUP BY v.Uhid
    """)):
        intent[(r.Uhid, r.OrderType)] = int(r.n)
    return intent


def plan(orders, intent):
    """Return (keep, void) partitions plus an explanation per bucket.

    One bucket per (patient, LAB|RADIOLOGY). The doctor's visit record says how
    many orders of that kind should survive; protected orders are kept first,
    then the most recent fill the remaining slots.
    """
    buckets = defaultdict(list)
    for o in orders:
        buckets[(o.UHID, o.OrderType)].append(o)

    keep, void, notes = [], [], []
    for (uhid, otype), group in sorted(buckets.items()):
        expected = intent.get((uhid, otype))

        if expected is None:
            # No visit record to judge against — fall back to the conservative
            # rule: one order per distinct test name, keeping protected ones.
            by_test = defaultdict(list)
            for o in group:
                by_test[norm(o.Tests)].append(o)
            expected = len(by_test)
            notes.append(f"  {uhid:<15} {otype:<10}: no visit record; keeping one "
                         f"order per distinct test ({expected}).")

        protected = [o for o in group if is_protected(o)]
        rest = sorted((o for o in group if not is_protected(o)),
                      key=lambda o: (o.CreatedAt, o.ServiceOrderId), reverse=True)

        survivors = list(protected)
        if len(survivors) > expected:
            notes.append(f"  ! {uhid:<13} {otype:<10}: {len(protected)} orders carry "
                         f"payment or work but the doctor ordered {expected} — all kept, "
                         f"needs a human decision.")
        else:
            survivors += rest[:expected - len(survivors)]

        survivor_ids = {o.ServiceOrderId for o in survivors}
        keep.extend(survivors)
        dropped = [o for o in group if o.ServiceOrderId not in survivor_ids]
        void.extend(dropped)

        if len(group) > len(survivors):
            notes.append(f"  {uhid:<15} {otype:<10}: {len(group)} orders, doctor ordered "
                         f"{expected} -> keep {sorted(survivor_ids)}, void "
                         f"{sorted(o.ServiceOrderId for o in dropped)}")
    return keep, void, notes


def void_order(conn, o):
    """Soft-void one service order and everything hanging off it."""
    # 1. Any advance bill. Guarded: cancel only an unpaid one.
    conn.execute(text("""
        UPDATE hospital.Billing_Advance
        SET Status = 'CANCELLED', CancelledReason = :reason, UpdatedAt = NOW()
        WHERE ServiceOrderId = :oid AND Status <> 'CANCELLED'
          AND (PaidAmount - RefundedAmount) <= 0
    """), {"oid": o.ServiceOrderId, "reason": REASON[:500]})

    # 2. The service order and its items.
    conn.execute(text("""
        UPDATE hospital.Service_OrderItem
        SET ServiceStatus = 'CANCELLED', IsDeleted = 1, UpdatedAt = NOW()
        WHERE ServiceOrderId = :oid
    """), {"oid": o.ServiceOrderId})
    conn.execute(text("""
        UPDATE hospital.Service_Order
        SET OrderStatus = 'CANCELLED', ServiceStatus = 'CANCELLED',
            CancelledReason = :reason, IsDeleted = 1, UpdatedAt = NOW()
        WHERE ServiceOrderId = :oid
    """), {"oid": o.ServiceOrderId, "reason": REASON[:500]})

    # 3. The source order, so it also leaves the lab / radiology worklists.
    src = "Lab" if o.OrderType == "LAB" else "Rad"
    conn.execute(text(f"""
        UPDATE hospital.{src}_OrderTest t
        JOIN hospital.{src}_Order h ON h.OrderId = t.OrderId
        SET t.Status = 'Cancelled'
        WHERE h.OrderNumber = :no
    """), {"no": o.OrderNo})
    conn.execute(text(f"""
        UPDATE hospital.{src}_Order SET Status = 'Cancelled', ModifiedDate = NOW()
        WHERE OrderNumber = :no
    """), {"no": o.OrderNo})

    # 4. Audit trail, so the void is explainable later.
    conn.execute(text("""
        INSERT INTO hospital.PRO_AuditLog
            (ServiceOrderId, UHID, Action, PreviousValue, NewValue, Reason,
             ChangedBy, ChangedByRole)
        VALUES (:oid, :uhid, 'ORDER_VOIDED', :prev, 'CANCELLED', :reason,
                'DUPLICATE_CLEANUP', 'SYSTEM')
    """), {"oid": o.ServiceOrderId, "uhid": o.UHID,
           "prev": o.PROStatus, "reason": REASON[:500]})


def main():
    with engine.begin() as conn:
        orders = load_orders(conn)
        intent = doctor_intent(conn)
        keep, void, notes = plan(orders, intent)

        print(f"{'APPLY' if APPLY else 'DRY RUN'} — {len(orders)} OPD lab/radiology orders\n")
        print("Doctor's own visit record (what should survive):")
        for (uhid, otype), n in sorted(intent.items()):
            print(f"  {uhid:<15} {otype:<10} {n}")

        print("\nDuplicate sets:")
        for n in notes:
            print(n)

        print(f"\nKEEP ({len({o.ServiceOrderId for o in keep})}):")
        for o in sorted({o.ServiceOrderId: o for o in keep}.values(), key=lambda x: x.ServiceOrderId):
            flags = []
            if float(o.Collected or 0) > 0: flags.append(f"paid {o.Collected}")
            if o.Releases: flags.append("released")
            if o.LabWork + o.RadWork: flags.append("has result")
            print(f"  #{o.ServiceOrderId:<3} {o.OrderNo:<16} {o.UHID} {o.Tests:<18} "
                  f"{o.PROStatus:<9} {' '.join(flags)}")

        print(f"\nVOID ({len(void)}):")
        for o in void:
            print(f"  #{o.ServiceOrderId:<3} {o.OrderNo:<16} {o.UHID} {o.Tests:<18} {o.PROStatus}")

        # Safety net: nothing with money or work may ever reach the void list.
        unsafe = [o.ServiceOrderId for o in void if is_protected(o)]
        assert not unsafe, f"REFUSING: {unsafe} carry payment or work"

        if not APPLY:
            print("\nDry run — nothing changed. Re-run with --apply to commit.")
            raise SystemExit

        for o in void:
            void_order(conn, o)
        print(f"\nVoided {len(void)} duplicate order(s).")


if __name__ == "__main__":
    main()
