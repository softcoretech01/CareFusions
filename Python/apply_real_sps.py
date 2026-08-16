import sys
import os
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

def apply_sql(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Remove DELIMITER //
    content = content.replace('DELIMITER //', '')
    content = content.replace('DELIMITER ;', '')
    content = content.replace('DELIMITER $$', '')
    content = content.replace('$$', ';')
    
    # Remove // at the end of statements
    content = re.sub(r'//\s*$', ';', content, flags=re.MULTILINE)
    
    parts = content.split('CREATE PROCEDURE')
    if len(parts) < 2:
        print(f"Could not parse {filename}")
        return
        
    drop_part = parts[0]
    create_part = 'CREATE PROCEDURE' + parts[1]
    
    with engine.connect() as con:
        # execute table creation and drop procedure
        statements = drop_part.split(';')
        for stmt in statements:
            s = stmt.strip()
            if s:
                con.execute(text(s))
        
        # execute create procedure
        con.execute(text(create_part))
        con.commit()
    print(f"Successfully applied {filename}")

if __name__ == "__main__":
    apply_sql('sql/patient_registration.sql')
    apply_sql('sql/quick_registration.sql')
    apply_sql('sql/emergency_registration.sql')
