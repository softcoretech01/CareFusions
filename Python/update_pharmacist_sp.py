import sys
import re
from sqlalchemy import text
from app.database import SessionLocal

sql_file = 'sql/pharmacist_master.sql'
with open(sql_file, 'r') as f:
    content = f.read()

# Extract SP block (from CREATE PROCEDURE to END)
match = re.search(r'CREATE PROCEDURE SpMasterPharmacist(.*?)END //', content, re.DOTALL)
if match:
    # MySQL might require DROP PROCEDURE first if not using OR REPLACE
    sp_sql = "CREATE PROCEDURE SpMasterPharmacist" + match.group(1) + "END"
    
    db = SessionLocal()
    try:
        db.execute(text("DROP PROCEDURE IF EXISTS SpMasterPharmacist"))
        db.execute(text(sp_sql))
        db.commit()
        print("Procedure updated successfully")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
else:
    print("Could not find SP in the file")
