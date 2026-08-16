import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def apply_and_fix():
    with engine.connect() as con:
        # 1. Update duplicate UHIDs in PatientRegistration
        print("Fixing duplicate UHIDs in PatientRegistration...")
        patients = con.execute(text("SELECT PatientId, Uhid FROM registration.PatientRegistration ORDER BY PatientId")).mappings().all()
        
        seen_uhids = set()
        for p in patients:
            uhid = p['Uhid']
            if uhid in seen_uhids:
                # generate a unique one
                new_uhid = f"{uhid}-DUPE-{p['PatientId']}"
                con.execute(text("UPDATE registration.PatientRegistration SET Uhid = :new_uhid WHERE PatientId = :pid"), 
                            {"new_uhid": new_uhid, "pid": p['PatientId']})
                print(f"Fixed duplicate UHID {uhid} -> {new_uhid}")
            seen_uhids.add(uhid)
            
        con.commit()
        print("Database UHID fix complete.")

if __name__ == "__main__":
    apply_and_fix()
