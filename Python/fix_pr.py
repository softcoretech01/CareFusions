import sys
import os
sys.path.append(os.getcwd())
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    sql = text("SELECT PrId, PrNo, RequisitionDate FROM inventory.PurchaseRequisition WHERE PrNo = 'PR-2026-012'")
    results = db.execute(sql).fetchall()
    print('Found duplicates:', results)
    
    if len(results) > 1:
        # Get the max seq
        sql_max = text("SELECT MAX(CAST(SUBSTRING_INDEX(PrNo, '-', -1) AS UNSIGNED)) FROM inventory.PurchaseRequisition")
        max_seq = db.execute(sql_max).scalar() or 0
        new_pr_no = f'PR-2026-{max_seq + 1:03d}'
        
        # Sort by RequisitionDate DESC and keep the newer one as PR-2026-012, rename the older one
        # Or rename the one that has the newest date? Actually, PR-2026-012 created on 2026-09-08 is newer.
        # So we should probably rename the OLDER one, or the NEWER one?
        # The user said "fix the duplicate PR no PR-2026-012". 
        # I'll just rename the one with the higher PrId.
        sorted_results = sorted(results, key=lambda x: x[0])
        pr_id_to_update = sorted_results[-1][0] # Update the one with the largest PrId (most recently inserted)
        
        sql_update = text("UPDATE inventory.PurchaseRequisition SET PrNo = :new_pr_no WHERE PrId = :pr_id")
        db.execute(sql_update, {"new_pr_no": new_pr_no, "pr_id": pr_id_to_update})
        db.commit()
        print(f'Updated PrId {pr_id_to_update} to {new_pr_no}')
except Exception as e:
    print('Error:', e)
finally:
    db.close()
