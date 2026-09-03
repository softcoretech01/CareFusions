import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def clean_database():
    with engine.begin() as conn:
        print("Cleaning PatientVisit table...")
        # Update Table to remove 'Dr. Assigned'
        update_sql = text("""
            UPDATE registration.PatientVisit
            SET Doctor = NULL
            WHERE Doctor = 'Dr. Assigned';
        """)
        conn.execute(update_sql)
        print("Done cleaning PatientVisit!")

if __name__ == "__main__":
    clean_database()
