import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'Python'))

from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        sql = text("SHOW CREATE PROCEDURE hospital.SpOpdVisit;")
        result = conn.execute(sql).fetchone()
        print(result[2])
except Exception as e:
    print(f"Error: {e}")
