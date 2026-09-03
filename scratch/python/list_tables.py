import os
import sys

# Add the project root to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    result = db.execute(text("SHOW TABLES"))
    tables = [row[0] for row in result]
    print(tables)
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
