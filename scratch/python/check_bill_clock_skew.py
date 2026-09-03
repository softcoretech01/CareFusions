"""Check which clock stamped each bill, and whether a backend still runs old code.

Columns:

    Skew   = CreatedDate - BillDate, in minutes.
             -330 : a row repaired by fix_bill_dates_tz.py, or written by an
                    IST host back when MySQL still answered NOW() in UTC.
                0 : BillDate and CreatedDate agree. After the timezone fix this
                    is the correct, expected state for every new bill.

    AgeMin = NOW() - CreatedDate, in minutes. This is the reliable test.
             Generate a bill, run this, and look at the top row:
                ~0   -> that backend has the fix (app/database.py pins IST)
                ~330 -> that backend is still on the old code; redeploy and
                        restart it, or its bills keep landing 5h30m in the past

Run:  python check_bill_clock_skew.py
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from app.database import engine

QUERY = """
    SELECT {pk}, BillNumber, BillDate, CreatedDate,
           TIMESTAMPDIFF(MINUTE, BillDate, CreatedDate) AS SkewMinutes,
           TIMESTAMPDIFF(MINUTE, CreatedDate, NOW()) AS AgeMinutes
    FROM hospital.{table}
    ORDER BY {pk} DESC
    LIMIT 15
"""


def main():
    with engine.connect() as con:
        print(f"MySQL NOW()          : {con.execute(text('SELECT NOW()')).scalar()}")
        print(f"This host now()      : {datetime.now()}")
        tz = con.execute(text("SELECT @@global.time_zone, @@session.time_zone")).fetchone()
        print(f"MySQL time_zone      : global={tz[0]} session={tz[1]}")
        print(f"Host TZ env          : {os.environ.get('TZ', '(unset)')}")

        for table, pk in (("OpBill", "OpBillId"), ("IpBill", "IpBillId")):
            print(f"\n--- hospital.{table} (most recent first) ---")
            try:
                rows = con.execute(text(QUERY.format(table=table, pk=pk))).fetchall()
            except Exception as exc:
                print(f"  skipped: {exc}")
                continue
            for r in rows:
                print(f"  {r[1]:<14} BillDate={r[2]}  CreatedDate={r[3]}"
                      f"  skew={r[4]:>5} min  age={r[5]:>6} min")


if __name__ == "__main__":
    main()
