import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", 3306))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "root")
DB_NAME = "hospital"

def run_sql_file(filename):
    print(f"Connecting to MySQL database {DB_NAME} at {DB_HOST}:{DB_PORT}...")
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            autocommit=False
        )
        cursor = conn.cursor()
        
        filepath = os.path.join("sql", filename)
        if not os.path.exists(filepath):
            print(f"Error: {filepath} not found.")
            return

        print(f"Reading {filepath}...")
        with open(filepath, 'r') as f:
            sql_content = f.read()

        print("Executing SQL statements...")
        statements = sql_content.split(';')
        
        success_count = 0
        for statement in statements:
            stmt = statement.strip()
            if stmt:
                try:
                    cursor.execute(stmt)
                    success_count += 1
                except mysql.connector.Error as err:
                    print(f"Error executing statement:\n{stmt[:100]}...\n{err}")
                    conn.rollback()
                    return
        
        conn.commit()
        print(f"Successfully executed {success_count} statements.")

    except mysql.connector.Error as err:
        print(f"Connection Error: {err}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    run_sql_file("billing_insurance.sql")
