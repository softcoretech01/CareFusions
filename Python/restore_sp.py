import sys
import os
from sqlalchemy import text
from app.database import engine
import re

def main():
    try:
        with open('../sp_out.txt', 'r', encoding='utf-16le') as f:
            content = f.read()
        
        # Find the CREATE PROCEDURE part
        match = re.search(r'(CREATE DEFINER=.*?END)', content, re.DOTALL | re.IGNORECASE)
        if match:
            sp_code = match.group(1)
            # Fix DEFINER
            sp_code = re.sub(r"CREATE DEFINER=`[^`]+`@`[^`]+` PROCEDURE", "CREATE PROCEDURE", sp_code)
            
            with engine.connect() as conn:
                drop_sql = text("DROP PROCEDURE IF EXISTS hospital.SpOpdVisit;")
                conn.execute(drop_sql)
                create_sql = text(sp_code)
                conn.execute(create_sql)
                conn.commit()
            print("Successfully restored hospital.SpOpdVisit")
        else:
            print("Could not find CREATE PROCEDURE block in sp_out.txt")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
