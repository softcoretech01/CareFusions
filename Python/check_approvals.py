import sys
import os
sys.path.append(os.getcwd())
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Check PurchaseOrder table  
    try:
        sql2 = text("SELECT * FROM inventory.PurchaseOrder LIMIT 1")
        po = db.execute(sql2).fetchall()
        if po:
            print("PurchaseOrder columns:", list(po[0]._mapping.keys()))
        else:
            print("PurchaseOrder table exists but empty")
    except Exception as e:
        print(f"PurchaseOrder error: {e}")

    # Check PurchaseReturn table
    try:
        sql3 = text("SELECT * FROM inventory.PurchaseReturn LIMIT 1")
        ret = db.execute(sql3).fetchall()
        if ret:
            print("PurchaseReturn columns:", list(ret[0]._mapping.keys()))
        else:
            print("PurchaseReturn table exists but empty")
    except Exception as e:
        print(f"PurchaseReturn error: {e}")

    # Check what the pro.py router's PO table looks like
    try:
        sql4 = text("SHOW TABLES FROM inventory")
        tables = db.execute(sql4).fetchall()
        print("\nTables in inventory schema:")
        for t in tables:
            print(f"  {t[0]}")
    except Exception as e:
        print(f"Tables error: {e}")

except Exception as e:
    print("Error:", e)
finally:
    db.close()
