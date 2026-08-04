import sys
import os
import random
from datetime import date, timedelta
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def seed_trends():
    today = date(2026, 8, 4)
    try:
        with engine.begin() as conn:
            print("Seeding trend data for the last 7 days...")
            
            # Loop over the last 7 days
            for i in range(1, 7): # from 1 to 6 days ago
                past_date = today - timedelta(days=i)
                date_str = past_date.isoformat()
                
                # Generate random counts for each day to make a nice curve
                op_count = random.randint(3, 8)
                walkin_count = random.randint(1, 5)
                emergency_count = random.randint(0, 2)
                
                # Insert OP Patients (PatientRegistration)
                for j in range(op_count):
                    uhid = f"UHID-OP-{past_date.strftime('%d')}-{j}"
                    conn.execute(text(f"""
                        INSERT IGNORE INTO registration.PatientRegistration 
                        (Uhid, PatientName, RegistrationDate, PatientType, Status)
                        VALUES ('{uhid}', 'Trend Patient OP {j}', '{date_str}', 'OP', 'Active')
                    """))
                
                # Insert Walk-In Patients (QuickRegistration)
                for j in range(walkin_count):
                    uhid = f"UHID-QK-{past_date.strftime('%d')}-{j}"
                    conn.execute(text(f"""
                        INSERT IGNORE INTO registration.QuickRegistration 
                        (Uhid, PatientName, RegistrationDate, Status)
                        VALUES ('{uhid}', 'Trend Patient WalkIn {j}', '{date_str}', 'Active')
                    """))
                    
                # Insert Emergency Patients (EmergencyRegistration)
                for j in range(emergency_count):
                    uhid = f"UHID-EM-{past_date.strftime('%d')}-{j}"
                    conn.execute(text(f"""
                        INSERT IGNORE INTO registration.EmergencyRegistration 
                        (Uhid, PatientName, RegistrationDate, Status)
                        VALUES ('{uhid}', 'Trend Patient EM {j}', '{date_str}', 'Active')
                    """))
                    
            print("Successfully seeded 7 days of trend data!")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    seed_trends()
