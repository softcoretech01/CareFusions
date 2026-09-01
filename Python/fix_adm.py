from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
db.execute(text("UPDATE hospital.IPD_Admission SET Status='Discharged', CurrentBedId=NULL WHERE Uhid='UHID-2026-0003'"))
db.commit()
db.close()
