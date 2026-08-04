import sys
import os
sys.path.append(os.getcwd())
from app.database import engine, SessionLocal
from app.routers.patient_registration import _call_sp

def test_api_call():
    db = SessionLocal()
    try:
        print("Calling _call_sp...")
        result = _call_sp(db, "SELECT_ALL")
        rows = result.fetchall()
        print(f"Success! Fetched {len(rows)} records.")
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_api_call()
