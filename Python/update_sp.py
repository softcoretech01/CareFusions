import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database import engine
from sqlalchemy import text

with engine.connect() as connection:
    with open('sql/opd_visit.sql', 'r') as f:
        sql = f.read()
    
    parts = sql.split('DELIMITER $$')
    if len(parts) > 1:
        sp_def = parts[1].split('$$')[0]
        raw_conn = connection.connection
        with raw_conn.cursor() as cursor:
            cursor.execute("DROP PROCEDURE IF EXISTS hospital.SpOpdVisit")
            cursor.execute("DROP PROCEDURE IF EXISTS SpOpdVisit")
            cursor.execute(sp_def.strip())
        connection.commit()
        print("Procedure updated successfully.")
    else:
        print("Could not find DELIMITER // in the file")
