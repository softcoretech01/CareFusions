from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/db-fix", tags=["DB Fix"])

@router.post("/exec")
def exec_sql(sql: str = Body(...), db: Session = Depends(get_db)):
    try:
        with db.bind.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            res = conn.execute(text(sql))
            try:
                rows = [dict(row._mapping) for row in res]
                return {"status": "ok", "rows": rows}
            except Exception:
                return {"status": "ok", "msg": "executed (no rows)"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/")
def run_fix(db: Session = Depends(get_db)):
    with open("sql/opd_visit.sql", "r") as f:
        sql_script = f.read()
    
    proc_start = sql_script.find("CREATE PROCEDURE SpOpdVisit")
    proc_end = sql_script.find("END$$", proc_start)
    proc_body = sql_script[proc_start:proc_end+3]
    proc_body = proc_body.replace("CREATE PROCEDURE SpOpdVisit", "CREATE OR REPLACE PROCEDURE hospital.SpOpdVisit")
    
    res = []
    
    with get_db().bind.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            conn.execute(text("ALTER TABLE hospital.Trn_OpdVisitRadiologyOrder ADD COLUMN ServiceName VARCHAR(200) NULL AFTER VisitId"))
            res.append("Altered table")
        except Exception as e:
            res.append(f"Alter failed: {e}")
            
        try:
            conn.execute(text("USE hospital"))
            conn.execute(text("DROP PROCEDURE IF EXISTS SpOpdVisit"))
        except Exception as e:
            res.append(f"Drop failed: {e}")
            
        try:
            conn.execute(text("USE hospital"))
            conn.execute(text(proc_body))
            res.append("Recreated SP")
        except Exception as e:
            res.append(f"Recreate SP failed: {e}")
            
        try:
            conn.execute(text("UPDATE hospital.Trn_OpdVisitRadiologyOrder SET ServiceName = 'MRI' WHERE Modality = 'X-Ray' AND BodyPart = 'head'"))
            res.append("Updated rows")
        except Exception as e:
            res.append(f"Update failed: {e}")

        
    db.commit()
    return {"status": "done", "log": res}
