import os
import sys

# add current directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def run():
    print("Connecting to DB...")
    with engine.connect() as conn:
        print("Connected.")
        
        # 1. Alter table
        print("Altering table...")
        try:
            conn.execute(text("ALTER TABLE hospital.Trn_OpdVisitRadiologyOrder ADD COLUMN ServiceName VARCHAR(200) NULL AFTER VisitId"))
        except Exception as e:
            print("Alter table failed (maybe column exists?):", e)
            
        print("Reading opd_visit.sql...")
        with open("sql/opd_visit.sql", "r") as f:
            sql_script = f.read()
            
        # The script has DELIMITER $$, which sqlalchemy doesn't support natively.
        # So we just extract the CREATE PROCEDURE part.
        proc_start = sql_script.find("CREATE PROCEDURE SpOpdVisit")
        proc_end = sql_script.find("END$$", proc_start)
        if proc_start == -1 or proc_end == -1:
            print("Could not find procedure body.")
            return
            
        proc_body = sql_script[proc_start:proc_end+3] # Include END
        
        print("Dropping existing procedure...")
        conn.execute(text("DROP PROCEDURE IF EXISTS hospital.SpOpdVisit"))
        
        print("Creating procedure...")
        conn.execute(text(proc_body))
        
        print("Updating existing rows with MRI because of the demo bug!")
        conn.execute(text("UPDATE hospital.Trn_OpdVisitRadiologyOrder SET ServiceName = 'MRI Head' WHERE Modality = 'X-Ray' AND BodyPart = 'head'"))
        
        conn.commit()
        print("Done!")

if __name__ == "__main__":
    run()
