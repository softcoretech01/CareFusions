import sys
import os
sys.path.append("d:/project/CareFusions/Python")

from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    res = db.execute(text("SHOW CREATE PROCEDURE inventory.SpInvDocument")).fetchone()
    print(res[2])
finally:
    db.close()
