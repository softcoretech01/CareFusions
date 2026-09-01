from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
print(db.execute(text("SELECT OrderTestId, OrderId, TestName FROM hospital.Lab_OrderTest WHERE OrderId = 19")).fetchall())
print(db.execute(text("SELECT OrderTestId, OrderId, Modality FROM hospital.Rad_OrderTest WHERE OrderId = 13")).fetchall())
db.close()
