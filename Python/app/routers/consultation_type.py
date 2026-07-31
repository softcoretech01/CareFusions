from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.consultation_type import (
    ConsultationTypeCreate,
    ConsultationTypeUpdate,
    ConsultationTypeResponse,
)

router = APIRouter(prefix="/consultation-types", tags=["Consultation Type"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterConsultationType"


def safe_value(val):
    if val == "":
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":                row.ConsultationId,
        "consultationCode":  row.ConsultationCode,
        "consultationType":  row.ConsultationType,
        "description":       row.Description,
        "duration":          str(row.Duration),
        "status":            row.Status,
        "remarks":           row.Remarks,
        "createdBy":         row.CreatedBy,
        "createdDate":       row.CreatedDate,
        "modifiedBy":        row.ModifiedBy,
        "modifiedDate":      row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, consultation_id: int = 0, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_ConsultationId":      consultation_id,
        "p_ConsultationCode":    safe_value(kwargs.get("consultation_code")),
        "p_ConsultationType":    safe_value(kwargs.get("consultation_type")),
        "p_Description":         safe_value(kwargs.get("description")),
        "p_Duration":            int(kwargs.get("duration", 0)),
        "p_Status":              safe_value(kwargs.get("status")),
        "p_Remarks":             safe_value(kwargs.get("remarks")),
        "p_CreatedBy":           safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":          safe_value(kwargs.get("modified_by")),
        "p_Search":              safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ConsultationId,
            :p_ConsultationCode, :p_ConsultationType, :p_Description,
            :p_Duration, :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[ConsultationTypeResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /consultation-types] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{consultation_id}", response_model=ConsultationTypeResponse)
def get_by_id(consultation_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", consultation_id=consultation_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Consultation Type not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /consultation-types/{consultation_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=ConsultationTypeResponse, status_code=status.HTTP_201_CREATED)
def create(consultation_type: ConsultationTypeCreate, db: Session = Depends(get_db)):
    try:
        d = consultation_type.model_dump()
        result = _call_sp(db, "INSERT",
            consultation_code=d["consultationCode"],
            consultation_type=d["consultationType"],
            description=d["description"],
            duration=d["duration"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.ConsultationId
        db.commit()

        fetch = _call_sp(db, "GETBYID", consultation_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /consultation-types] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Consultation Code or Type already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{consultation_id}", response_model=ConsultationTypeResponse)
def update(consultation_id: int, consultation_type: ConsultationTypeUpdate, db: Session = Depends(get_db)):
    try:
        d = consultation_type.model_dump()
        _call_sp(db, "UPDATE",
            consultation_id=consultation_id,
            consultation_code=d["consultationCode"],
            consultation_type=d["consultationType"],
            description=d["description"],
            duration=d["duration"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", consultation_id=consultation_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Consultation Type not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /consultation-types/{consultation_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Consultation Code or Type already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{consultation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(consultation_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", consultation_id=consultation_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Consultation Type not found")
        _call_sp(db, "DELETE", consultation_id=consultation_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /consultation-types/{consultation_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
