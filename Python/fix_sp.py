import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def run():
    print("Connecting to DB...")
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        print("Connected.")
        
        print("Reading opd_visit.sql...")
        with open("sql/opd_visit.sql", "r") as f:
            sql_script = f.read()
            
        proc_start = sql_script.find("CREATE PROCEDURE SpOpdVisit")
        proc_end = sql_script.find("END$$", proc_start)
        proc_body = sql_script[proc_start:proc_end+3]
        
        try:
            conn.execute(text("USE hospital"))
            conn.execute(text("DROP PROCEDURE IF EXISTS SpOpdVisit"))
            print("Dropped SP in hospital schema")
        except Exception as e:
            print(f"Drop SP failed in hospital schema: {e}")
            
        try:
            conn.execute(text("USE admin"))
            conn.execute(text("DROP PROCEDURE IF EXISTS SpOpdVisit"))
            print("Dropped SP in admin schema")
        except Exception as e:
            print(f"Drop SP failed in admin schema: {e}")
            
        try:
            conn.execute(text("USE hospital"))
            conn.execute(text(proc_body))
            print("Recreated SP in hospital schema")
        except Exception as e:
            print(f"Create SP failed: {e}")
            
if __name__ == "__main__":
    run()
