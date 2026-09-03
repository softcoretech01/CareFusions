import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def check_db():
    try:
        with engine.begin() as conn:
            result = conn.execute(text("SELECT PatientId, RegistrationDate, CreatedDate FROM registration.PatientRegistration LIMIT 10;"))
            for row in result:
                print(row)
                
            print("Testing SP with '2026-08-01' and '2026-08-04'...")
            cursor = conn.connection.cursor()
            cursor.execute("CALL registration.SpGetRegistrationReports('2026-08-01', '2026-08-04')")
            print("KPIs:", cursor.fetchone())
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_db()
