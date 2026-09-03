"""One-shot repair for bills whose BillDate was stamped in UTC.

Before the timezone fix, BillDate came from the API process clock:

    * bills raised from a developer machine (IST) -> BillDate is IST,
      so BillDate is 5h30m AHEAD of CreatedDate (which MySQL wrote in UTC)
    * bills raised from the internal server (UTC) -> BillDate equals
      CreatedDate exactly, i.e. 5h30m BEHIND the real wall-clock time

The second group sorts into the wrong place in Billing Reports (ordered by
BillDate DESC) and lands on the previous day when raised before 05:30 IST.
This script shifts that group forward by 5h30m so every bill is IST.

Dry run (default) prints what would change:

    python fix_bill_dates_tz.py

Apply, passing the highest bill id that predates the timezone fix so bills
raised after the fix - which correctly have BillDate == CreatedDate in IST -
are never touched:

    python fix_bill_dates_tz.py --apply --max-op-id 40 --max-ip-id 12
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from app.database import engine

OFFSET_MINUTES = 330  # UTC -> IST

TABLES = (
    ("OpBill", "OpBillId", "max_op_id"),
    ("IpBill", "IpBillId", "max_ip_id"),
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write the changes")
    ap.add_argument("--max-op-id", type=int, help="highest OpBillId to repair")
    ap.add_argument("--max-ip-id", type=int, help="highest IpBillId to repair")
    args = ap.parse_args()

    with engine.begin() as con:
        for table, pk, arg_name in TABLES:
            max_id = getattr(args, arg_name)
            print(f"\n=== hospital.{table} ===")
            where = f"TIMESTAMPDIFF(MINUTE, BillDate, CreatedDate) = 0"
            params = {}
            if max_id is not None:
                where += f" AND {pk} <= :max_id"
                params["max_id"] = max_id

            try:
                rows = con.execute(
                    text(f"""
                        SELECT {pk}, BillNumber, PatientName, BillDate,
                               DATE_ADD(BillDate, INTERVAL {OFFSET_MINUTES} MINUTE) AS Corrected
                        FROM hospital.{table}
                        WHERE {where}
                        ORDER BY {pk}
                    """),
                    params,
                ).fetchall()
            except Exception as exc:
                print(f"  skipped: {exc}")
                continue

            if not rows:
                print("  nothing to repair")
                continue

            for r in rows:
                print(f"  {pk}={r[0]:<5} {r[1]:<14} {str(r[2])[:16]:<16} {r[3]}  ->  {r[4]}")

            if not args.apply:
                print(f"  DRY RUN: {len(rows)} row(s) would be shifted +{OFFSET_MINUTES} min")
                continue

            if max_id is None:
                print(f"  REFUSED: pass --{arg_name.replace('_', '-')} so bills raised"
                      f" after the timezone fix are not shifted a second time")
                continue

            res = con.execute(
                text(f"""
                    UPDATE hospital.{table}
                    SET BillDate = DATE_ADD(BillDate, INTERVAL {OFFSET_MINUTES} MINUTE)
                    WHERE {where}
                """),
                params,
            )
            print(f"  APPLIED: {res.rowcount} row(s) shifted +{OFFSET_MINUTES} min")


if __name__ == "__main__":
    main()
