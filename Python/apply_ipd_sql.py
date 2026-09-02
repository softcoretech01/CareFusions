import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "root")
DB_PORT = int(os.environ.get("DB_PORT", 3306))
DB_NAME = "hospital"

connection = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    autocommit=True
)

def apply():
    with open('sql/ipd.sql', 'r') as f:
        content = f.read()

    # We need to split by DELIMITER $$ and execute the parts
    parts = content.split('DELIMITER $$')
    
    with connection.cursor() as cursor:
        for part in parts:
            if 'DELIMITER ;' in part:
                # Extract DROP statements before the procedure
                lines = part.splitlines()
                drops = [line for line in lines if line.strip().startswith('DROP PROCEDURE')]
                for d in drops:
                    try:
                        cursor.execute(d)
                    except Exception as e:
                        pass
                        
                # Extract procedure
                proc = part.split('DELIMITER ;')[0].strip()
                if proc:
                    proc = proc.replace('$$', '')
                    # Remove drop statements from proc if any
                    for d in drops:
                        proc = proc.replace(d, '')
                    
                    print(f"Executing procedure chunk...")
                    try:
                        cursor.execute(proc)
                    except Exception as e:
                        print(f"Error executing procedure: {e}")
            else:
                # Normal queries, we can split by ;
                queries = part.split(';')
                for q in queries:
                    q = q.strip()
                    if q and not q.startswith('DELIMITER') and not q.startswith('--'):
                        try:
                            cursor.execute(q)
                        except Exception as e:
                            print(f"Error executing query: {e}")

if __name__ == "__main__":
    apply()
