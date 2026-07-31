from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import logging

from app.database import get_db
from app.schemas.procedure_type import ProcedureTypeResponse

router = APIRouter(prefix="/procedure-types", tags=["Procedure Type"])
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[ProcedureTypeResponse])
def get_all(db: Session = Depends(get_db)):
    try:
        sql = text("SELECT ProcedureTypeId, TypeName FROM Master_ProcedureType ORDER BY TypeName ASC;")
        result = db.execute(sql)
        return [{"id": row.ProcedureTypeId, "typeName": row.TypeName} for row in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /procedure-types] {e}")
        raise HTTPException(status_code=500, detail=str(e))
