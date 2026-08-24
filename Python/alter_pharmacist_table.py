from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE Master_Pharmacist DROP COLUMN EmployeeCode"))
    db.commit()
    print("Column EmployeeCode dropped successfully.")
except Exception as e:
    db.rollback()
    print(f"Error dropping column: {e}")
