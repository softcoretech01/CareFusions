import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'Python'))

from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        sql = text("""
        UPDATE registration.Trn_Appointment 
        SET Type = 'Emergency' 
        WHERE AppointmentId = 1;
        """)
        conn.execute(sql)
        conn.commit()
        print("Updated successfully")
except Exception as e:
    print(f"Error: {e}")
