"""Wipe every patient record and everything hanging off it.

Masters (admin.Master_*), the ward/bed layout, pharmacy stock, equipment
calibration logs and the whole inventory schema are left untouched - see
patient_data_tables.py for the exact list and the reasoning.

TRUNCATE is DDL: it commits immediately and cannot be rolled back, so this is a
dry run unless you pass --apply. Take a backup first:

    python backup_patient_data.py
    python truncate_patient_data.py            # dry run - shows what would go
    python truncate_patient_data.py --apply    # actually wipes
"""
import argparse

from sqlalchemy import text

from app.database import engine
from patient_data_tables import PATIENT_TABLES


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="actually truncate; without it nothing is written")
    args = ap.parse_args()

    with engine.connect() as conn:
        counts = {}
        for schema, table in PATIENT_TABLES:
            exists = conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.TABLES "
                "WHERE TABLE_SCHEMA = :s AND TABLE_NAME = :t"),
                {"s": schema, "t": table}).scalar()
            if not exists:
                print(f"  !! {schema}.{table} does not exist - skipped")
                continue
            counts[(schema, table)] = conn.execute(
                text(f"SELECT COUNT(*) FROM `{schema}`.`{table}`")).scalar()

        total = sum(counts.values())
        occupied = conn.execute(text(
            "SELECT COUNT(*) FROM hospital.IPD_Bed WHERE Status <> 'Available'")).scalar()

        for (schema, table), n in counts.items():
            print(f"  {n:>6}  {schema}.{table}")
        print(f"\n{total} rows across {len(counts)} tables")
        print(f"{occupied} bed(s) will be reset to Available")

        if not args.apply:
            print("\nDRY RUN - nothing was deleted. Re-run with --apply to wipe.")
            return

        # FK checks off so the truncate order does not matter, and so TRUNCATE
        # is allowed on tables that are the target of a foreign key at all.
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for schema, table in counts:
            conn.execute(text(f"TRUNCATE TABLE `{schema}`.`{table}`"))

        # Bed occupancy is derived from admissions, which are now gone.
        conn.execute(text(
            "UPDATE hospital.IPD_Bed SET Status = 'Available' WHERE Status <> 'Available'"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        conn.commit()

        remaining = sum(
            conn.execute(text(f"SELECT COUNT(*) FROM `{s}`.`{t}`")).scalar()
            for s, t in counts)
        print(f"\nWiped {total} rows. {remaining} rows remain in those tables.")


if __name__ == "__main__":
    main()
