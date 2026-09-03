from app.database import SessionLocal
from sqlalchemy import text

def add_operations_data_column():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE hospital.IPD_Admission ADD COLUMN OperationsData JSON NULL;"))
        db.commit()
        print("Successfully added OperationsData column")
    except Exception as e:
        print(f"Error (might already exist): {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_operations_data_column()
