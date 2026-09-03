"""Create the Mst_WardCharge table the ward-charge API reads.

The router was already wired up but the table did not exist, so every call to
/api/v1/ward-charges/ returned a 500 and the screen showed "No records found".

Idempotent: safe to re-run. Uses the app's own engine so it always targets the
database the API is talking to.

    python create_ward_charge_table.py
"""
from sqlalchemy import text

from app.database import engine

CREATE = """
CREATE TABLE IF NOT EXISTS Mst_WardCharge (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    WardType VARCHAR(50) NOT NULL,
    Charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Description VARCHAR(250) NULL,
    Remarks VARCHAR(250) NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
    IsDeleted TINYINT(1) NOT NULL DEFAULT 0,
    CreatedBy VARCHAR(50),
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy VARCHAR(50),
    UpdatedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
"""

# For a table created before Description/Remarks existed.
COLUMNS = {"Description": "VARCHAR(250) NULL", "Remarks": "VARCHAR(250) NULL"}

HAS_COLUMN = text("""
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'Mst_WardCharge'
       AND COLUMN_NAME  = :column_name
""")

if __name__ == "__main__":
    with engine.begin() as conn:
        conn.execute(text(CREATE))
        print("Mst_WardCharge: ready")
        for column, definition in COLUMNS.items():
            if conn.execute(HAS_COLUMN, {"column_name": column}).scalar():
                print(f"Mst_WardCharge.{column}: already present")
            else:
                conn.execute(text(f"ALTER TABLE Mst_WardCharge ADD COLUMN {column} {definition} AFTER Charge"))
                print(f"Mst_WardCharge.{column}: added")
