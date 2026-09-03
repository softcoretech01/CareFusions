"""Add the stored serialNo column to the Minor/Major Operation masters.

serialNo is assigned once when a record is created (MAX + 1) and is never
renumbered, so deleting a row leaves a gap - the same way id behaves.

Idempotent: re-running adds no column and backfills no rows. Uses the app's own
engine so it always targets the database the API is talking to.

    python add_operations_serialno.py
"""
from sqlalchemy import text

from app.database import engine

TABLES = ("Mst_MinorOperation", "Mst_MajorOperation")

HAS_COLUMN = text("""
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = :table_name
       AND COLUMN_NAME  = 'serialNo'
""")

if __name__ == "__main__":
    with engine.begin() as conn:
        for table in TABLES:  # fixed names, so the f-strings below are safe
            if conn.execute(HAS_COLUMN, {"table_name": table}).scalar():
                print(f"{table}: serialNo already present")
            else:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN serialNo INT NULL AFTER id"))
                print(f"{table}: serialNo column added")

            # Number the rows that predate the column, oldest first, so they
            # read 1..N. Rows that already have a serialNo are left alone.
            filled = conn.execute(text(f"""
                UPDATE {table} t
                  JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM {table}) x
                    ON x.id = t.id
                   SET t.serialNo = x.rn
                 WHERE t.serialNo IS NULL
            """)).rowcount
            print(f"{table}: backfilled {filled} row(s)")
