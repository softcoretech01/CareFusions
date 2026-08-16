import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def apply_sql_file(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Split by DROP PROCEDURE to separate drop and create
    parts = content.split('CREATE PROCEDURE')
    if len(parts) == 2:
        drop_part = parts[0].strip()
        create_part = 'CREATE PROCEDURE ' + parts[1].strip()
        
        with engine.connect() as con:
            # We don't need to split by ;, we can just execute the whole block if the driver supports it, or execute drop then create.
            if 'DROP PROCEDURE' in drop_part:
                drop_stmt = [s for s in drop_part.split(';') if 'DROP PROCEDURE' in s][0] + ';'
                con.execute(text(drop_stmt))
            
            con.execute(text(create_part))
            con.commit()
            print(f"Successfully applied {filename}")
    else:
        print(f"Could not parse {filename}")

if __name__ == "__main__":
    apply_sql_file('sql/patient_registration.sql')
    apply_sql_file('sql/quick_registration.sql')
    apply_sql_file('sql/emergency_registration.sql')
