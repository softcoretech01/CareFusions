from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
print(db.execute(text("SELECT AdmissionId, Uhid, Status, CurrentBedId FROM hospital.IPD_Admission WHERE Uhid = 'UHID-2026-0003'")).fetchall())
db.close()
