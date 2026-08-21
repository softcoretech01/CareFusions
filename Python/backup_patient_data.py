"""Dump every patient-attached table to a re-runnable .sql file.

There is no mysqldump on this machine's PATH, so this writes the same thing by
hand: a DELETE + INSERT block per table, wrapped in FOREIGN_KEY_CHECKS=0 so the
rows can go back in any order. Run this before truncate_patient_data.py.

    python backup_patient_data.py [--out FILE]
"""
import argparse
import datetime
import os
from decimal import Decimal

from sqlalchemy import text

from app.database import engine
from patient_data_tables import PATIENT_TABLES


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float, Decimal)):
        return str(value)
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return "'" + str(value) + "'"
    if isinstance(value, (bytes, bytearray)):
        return "0x" + value.hex()
    escaped = (str(value)
               .replace("\\", "\\\\")
               .replace("'", "\'")
               .replace("\n", "\n")
               .replace("\r", "\r"))
    return "'" + escaped + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="output .sql path")
    args = ap.parse_args()

    out = args.out or os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "backups",
        "patient_data_backup.sql",
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)

    total = 0
    with engine.connect() as conn, open(out, "w", encoding="utf-8") as fh:
        fh.write("-- CareFusions patient-data backup\n")
        fh.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")

        for schema, table in PATIENT_TABLES:
            cols = [r[0] for r in conn.execute(text(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = :s AND TABLE_NAME = :t "
                "ORDER BY ORDINAL_POSITION"), {"s": schema, "t": table})]
            if not cols:
                print(f"  !! {schema}.{table} does not exist - skipped")
                continue

            rows = conn.execute(text(f"SELECT * FROM `{schema}`.`{table}`")).fetchall()
            total += len(rows)
            fh.write(f"-- {schema}.{table} ({len(rows)} rows)\n")
            fh.write(f"DELETE FROM `{schema}`.`{table}`;\n")
            if rows:
                collist = ", ".join(f"`{c}`" for c in cols)
                for row in rows:
                    values = ", ".join(literal(v) for v in row)
                    fh.write(f"INSERT INTO `{schema}`.`{table}` ({collist}) VALUES ({values});\n")
            fh.write("\n")
            print(f"  {len(rows):>6}  {schema}.{table}")

        fh.write("SET FOREIGN_KEY_CHECKS = 1;\n")

    size = os.path.getsize(out)
    print(f"\n{total} rows -> {out}  ({size:,} bytes)")
    print("Restore with:  mysql < " + out + "   (or run the file in your SQL client)")


if __name__ == "__main__":
    main()
