import sys
import os
sys.path.append(os.getcwd())
from app.database import engine, SessionLocal
from app.routers.emergency_registration import _call_sp as call_sp_emergency
from app.schemas.emergency_registration import EmergencyRegistrationResponse
from pydantic import ValidationError

def test_validation():
    db = SessionLocal()
    try:
        rows = call_sp_emergency(db, "SELECT_ALL")
        
        for i, d in enumerate(rows):
            try:
                # Attempt to validate with Pydantic
                EmergencyRegistrationResponse(**dict(d))
            except ValidationError as e:
                print(f"Validation failed for Emergency row {i} (Uhid: {dict(d).get('Uhid')}):")
                print(e)
                return
        print("All Emergency Registration rows validated successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    test_validation()
