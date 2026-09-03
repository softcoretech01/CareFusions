import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def seed_visits():
    with engine.begin() as conn:
        print("Seeding visits...")
        
        # Get all patients
        patients = conn.execute(text("SELECT * FROM registration.patientregistration")).fetchall()
        
        count = 0
        for p in patients:
            # Check if visit already exists
            check = conn.execute(text("SELECT COUNT(*) FROM registration.PatientVisit WHERE Uhid = :u"), {"u": p.Uhid}).scalar()
            if check == 0:
                # Insert initial visit
                sql1 = text("""
                INSERT INTO registration.PatientVisit (
                    Uhid, VisitDate, VisitTime, VisitType, Department, Doctor, Status, Notes
                ) VALUES (
                    :Uhid, :Date, '09:30 AM', :Type, :Dept, :Doc, 'Completed', 'Initial consultation and registration.'
                )
                """)
                conn.execute(sql1, {
                    "Uhid": p.Uhid,
                    "Date": p.RegistrationDate,
                    "Type": p.PatientType or 'OP',
                    "Dept": p.Department or 'General Medicine',
                    "Doc": p.PrimaryDoctor or 'Dr. Assigned'
                })
                
                # Insert follow-up
                import datetime
                sql2 = text("""
                INSERT INTO registration.PatientVisit (
                    Uhid, VisitDate, VisitTime, VisitType, Department, Doctor, Status, Notes
                ) VALUES (
                    :Uhid, :Date, '10:15 AM', 'Follow-up', :Dept, :Doc, 'Scheduled', 'Routine checkup.'
                )
                """)
                conn.execute(sql2, {
                    "Uhid": p.Uhid,
                    "Date": datetime.date.today(),
                    "Dept": p.Department or 'General Medicine',
                    "Doc": p.PrimaryDoctor or 'Dr. Assigned'
                })
                count += 2
                
        print(f"Seeded {count} visits!")

if __name__ == "__main__":
    seed_visits()
