import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'Python'))

from app.database import engine
from sqlalchemy import text
import json

try:
    with engine.connect() as conn:
        sql = text("SHOW COLUMNS FROM registration.Trn_Appointment;")
        result = conn.execute(sql).fetchall()
        cols = [row[0] for row in result]
        print(json.dumps(cols))
except Exception as e:
    print(f"Error: {e}")
