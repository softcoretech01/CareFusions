from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
print(db.execute(text("DESCRIBE hospital.Lab_OrderTest")).fetchall())
print(db.execute(text("DESCRIBE hospital.Lab_Order")).fetchall())
db.close()
