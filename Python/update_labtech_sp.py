import sys
import re
from sqlalchemy import text
from app.database import SessionLocal

sql_file = 'sql/lab_technician_master.sql'
with open(sql_file, 'r') as f:
    content = f.read()

# Extract SP block (from CREATE PROCEDURE to END)
match = re.search(r'CREATE PROCEDURE SpMasterLabTechnician(.*?)END //', content, re.DOTALL)
if match:
    sp_sql = "CREATE PROCEDURE SpMasterLabTechnician" + match.group(1) + "END"
    
    db = SessionLocal()
    try:
        db.execute(text("DROP PROCEDURE IF EXISTS SpMasterLabTechnician"))
        db.execute(text(sp_sql))
        db.commit()
        print("Procedure updated successfully")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
else:
    print("Could not find SP in the file")
