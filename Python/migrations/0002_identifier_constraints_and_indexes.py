"""Constrain requisition numbers, and index the two hot per-patient columns.

Backlog items 11 and 12.

* ``inventory.PurchaseRequisition.PrNo`` was the only key identifier column in
  the schema without a unique index -- OrderNo, AdvanceNo, AdmissionNumber and
  all three Uhid columns already have one. It is also the only one that produced
  a real duplicate, because the Low Stock Monitor derived the number from a row
  count. The application now assigns it server-side from the highest issued;
  this makes the database enforce what the application assumes.

* ``hospital.Rad_Order.Uhid`` and ``hospital.Trn_OpdVisit.Uhid`` are joined by
  UHID on screens that load a single patient, and neither had an index. Harmless
  at today's row counts and quadratic later.

Both are additive. Nothing is dropped and no row is modified.

    python migrations/0002_identifier_constraints_and_indexes.py            # check
    python migrations/0002_identifier_constraints_and_indexes.py --apply    # do it
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text                                   # noqa: E402
from app.database import SessionLocal                         # noqa: E402

# (schema, table, column, index name, unique)
INDEXES = [
    ("inventory", "PurchaseRequisition", "PrNo",  "UQ_PurchaseRequisition_PrNo", True),
    ("hospital",  "Rad_Order",           "Uhid",  "IDX_Rad_Order_Uhid",          False),
    ("hospital",  "Trn_OpdVisit",        "Uhid",  "IDX_Trn_OpdVisit_Uhid",       False),
]


def existing_index(db, schema, table, column):
    return db.execute(text("""
        SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = :s AND TABLE_NAME = :t AND COLUMN_NAME = :c
        LIMIT 1
    """), {"s": schema, "t": table, "c": column}).scalar()


def duplicates(db, schema, table, column):
    return db.execute(text(f"""
        SELECT COUNT(*) FROM (
            SELECT {column} FROM {schema}.{table}
            WHERE {column} IS NOT NULL
            GROUP BY {column} HAVING COUNT(*) > 1
        ) d
    """)).scalar()


def main(apply: bool) -> int:
    db = SessionLocal()
    added = skipped = blocked = 0
    try:
        for schema, table, column, name, unique in INDEXES:
            target = f"{schema}.{table}.{column}"

            if existing_index(db, schema, table, column):
                print(f"  SKIP     {target} — already indexed")
                skipped += 1
                continue

            if unique:
                dupes = duplicates(db, schema, table, column)
                if dupes:
                    # Refuse rather than fail halfway: a unique index cannot be
                    # created over duplicates, and picking which row to renumber
                    # is a business decision, not a migration's.
                    print(f"  BLOCKED  {target} — {dupes} duplicate value(s); resolve them first")
                    blocked += 1
                    continue

            ddl = (f"CREATE {'UNIQUE ' if unique else ''}INDEX {name} "
                   f"ON {schema}.{table} ({column})")
            print(f"  {'ADD     ' if apply else 'WOULD ADD'} {target} — {ddl}")
            if apply:
                db.execute(text(ddl))
            added += 1

        if apply:
            db.commit()

        print()
        print(f"  added   : {added}")
        print(f"  skipped : {skipped}")
        print(f"  blocked : {blocked}")
        print()
        print("APPLIED" if apply else "DRY RUN — nothing changed. Re-run with --apply.")
        return 1 if blocked else 0
    except Exception as exc:
        db.rollback()
        print(f"FAILED, rolled back: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main(apply="--apply" in sys.argv))
