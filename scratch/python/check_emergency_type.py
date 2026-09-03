import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def check_db():
    try:
        with engine.begin() as conn:
            result = conn.execute(text("SELECT PatientId, Uhid, PatientName, PatientType FROM registration.PatientRegistration WHERE Uhid = 'UHID-EM-2026-0001';"))
            for row in result:
                print(row)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_db()
