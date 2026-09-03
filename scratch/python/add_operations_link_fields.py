"""Add the medications / procedures / equipment columns to the operation masters.

Each holds a comma-separated list of names picked from the corresponding master
(Medicine, Procedure, Equipment) on the Add/Edit screen.

Idempotent: columns that already exist are left alone. Uses the app's own engine
so it always targets the database the API is talking to.

    python add_operations_link_fields.py
"""
from sqlalchemy import text

from app.database import engine

TABLES = ("Mst_MinorOperation", "Mst_MajorOperation")

# column name -> definition, added after `department`
COLUMNS = {
    "medications": "VARCHAR(500) NULL",
    "procedures":  "VARCHAR(500) NULL",
    "equipment":   "VARCHAR(500) NULL",
}

HAS_COLUMN = text("""
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = :table_name
       AND COLUMN_NAME  = :column_name
""")

if __name__ == "__main__":
    with engine.begin() as conn:
        for table in TABLES:  # fixed names, so the f-strings below are safe
            for column, definition in COLUMNS.items():
                if conn.execute(HAS_COLUMN, {"table_name": table, "column_name": column}).scalar():
                    print(f"{table}.{column}: already present")
                else:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition} AFTER department"))
                    print(f"{table}.{column}: added")
