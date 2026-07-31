from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.allergy import (
    AllergyCreate,
    AllergyUpdate,
    AllergyResponse,
    AllergyTypeResponse,
    AllergySeverityEnum,
)

router = APIRouter(prefix="/allergies", tags=["Allergy Master"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterAllergy"


def safe_value(val):
    if val == "":
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":           row.AllergyId,
        "allergyCode":  row.AllergyCode,
        "allergyName":  row.AllergyName,
        "allergyType":  row.AllergyType,
        "severity":     row.Severity,
        "description":  row.Description,
        "status":       row.Status,
        "remarks":      row.Remarks,
        "createdBy":    row.CreatedBy,
        "createdDate":  row.CreatedDate,
        "modifiedBy":   row.ModifiedBy,
        "modifiedDate": row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, allergy_id: int = 0, **kwargs):
    params = {
        "p_Opt":            opt,
        "p_AllergyId":      allergy_id,
        "p_AllergyCode":    safe_value(kwargs.get("allergy_code")),
        "p_AllergyName":    safe_value(kwargs.get("allergy_name")),
        "p_AllergyType":    safe_value(kwargs.get("allergy_type")),
        "p_Severity":       safe_value(kwargs.get("severity")),
        "p_Description":    safe_value(kwargs.get("description")),
        "p_Status":         safe_value(kwargs.get("status")),
        "p_Remarks":        safe_value(kwargs.get("remarks")),
        "p_CreatedBy":      safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":     safe_value(kwargs.get("modified_by")),
        "p_Search":         safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_AllergyId,
            :p_AllergyCode, :p_AllergyName, :p_AllergyType, :p_Severity, :p_Description,
            :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALLERGY TYPES (Lookup) ───────────────────────────────────────────────
@router.get("/types", response_model=List[AllergyTypeResponse])
def get_allergy_types(db: Session = Depends(get_db)):
    try:
        result = db.execute(text(
            "SELECT AllergyTypeId, TypeName FROM Master_AllergyType ORDER BY TypeName ASC"
        ))
        return [{"id": row.AllergyTypeId, "typeName": row.TypeName} for row in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /allergies/types] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET ALLERGY SEVERITIES (Lookup) ──────────────────────────────────────────
@router.get("/severities", response_model=List[str])
def get_severities():
    try:
        return [e.value for e in AllergySeverityEnum]
    except Exception as e:
        logger.error(f"[GET /allergies/severities] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET NEXT ALLERGY CODE ──────────────────────────────────────────────────────
@router.get("/next-code")
def get_next_code(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT MAX(AllergyId) FROM Master_Allergy"))
        max_id = result.scalar()
        if max_id is None:
            max_id = 0
        
        # E.g. max_id = 1 => 'ALG-002'
        next_code = f"ALG-{str(max_id + 1).zfill(3)}"
        return {"nextCode": next_code}
    except Exception as e:
        logger.error(f"[GET /allergies/next-code] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[AllergyResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /allergies] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{allergy_id}", response_model=AllergyResponse)
def get_by_id(allergy_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", allergy_id=allergy_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Allergy not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /allergies/{allergy_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=AllergyResponse, status_code=status.HTTP_201_CREATED)
def create(allergy: AllergyCreate, db: Session = Depends(get_db)):
    try:
        d = allergy.model_dump()
        result = _call_sp(db, "INSERT",
            allergy_code=d["allergyCode"],
            allergy_name=d["allergyName"],
            allergy_type=d["allergyType"],
            severity=d["severity"],
            description=d["description"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.AllergyId
        db.commit()

        fetch = _call_sp(db, "GETBYID", allergy_id=new_id)
        return _map_row(fetch.fetchone())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /allergies] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Allergy Code or Name already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{allergy_id}", response_model=AllergyResponse)
def update(allergy_id: int, allergy: AllergyUpdate, db: Session = Depends(get_db)):
    try:
        d = allergy.model_dump()
        _call_sp(db, "UPDATE",
            allergy_id=allergy_id,
            allergy_code=d["allergyCode"],
            allergy_name=d["allergyName"],
            allergy_type=d["allergyType"],
            severity=d["severity"],
            description=d["description"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", allergy_id=allergy_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Allergy not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /allergies/{allergy_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Allergy Code or Name already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(allergy_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", allergy_id=allergy_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Allergy not found")
        _call_sp(db, "DELETE", allergy_id=allergy_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /allergies/{allergy_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
