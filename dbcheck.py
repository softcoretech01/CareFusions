import sys
sys.path.append('D:\\HMS\\CareFusions\\Python')
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT * FROM hospital.IPD_Admission WHERE Uhid = '2026-0003'"))
for row in res:
    print(dict(row._mapping))
    
res2 = db.execute(text("SELECT * FROM admin.Master_Patient WHERE Uhid = '2026-0003'"))
for row in res2:
    print(dict(row._mapping))
