import os
import sys

# Add the project root to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Delete from Service_OrderItem where ServiceOrderId is linked to these patients
    db.execute(text("""
        DELETE FROM hospital.Service_OrderItem 
        WHERE ServiceOrderId IN (
            SELECT ServiceOrderId FROM hospital.Service_Order 
            WHERE UHID IN ('UHID-2026-0001', 'UHID-2026-0012')
        )
    """))
    
    # Delete from Service_Order
    result = db.execute(text("""
        DELETE FROM hospital.Service_Order 
        WHERE UHID IN ('UHID-2026-0001', 'UHID-2026-0012')
    """))
    
    db.commit()
    print(f"Deleted {result.rowcount} rows from hospital.Service_Order.")
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
