from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE hospital.Lab_OrderTest ADD COLUMN ResultSummary TEXT"))
    print("Lab_OrderTest migrated")
except Exception as e:
    print("Lab_OrderTest error:", e)

try:
    db.execute(text("ALTER TABLE hospital.Rad_OrderTest ADD COLUMN ResultSummary TEXT"))
    print("Rad_OrderTest migrated")
except Exception as e:
    print("Rad_OrderTest error:", e)

db.commit()
db.close()
