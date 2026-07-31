from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.diagnosis import (
    DiagnosisCreate,
    DiagnosisUpdate,
    DiagnosisResponse,
    IcdVersionEnum,
    DiagnosisCategoryEnum,
)

router = APIRouter(prefix="/diagnosis", tags=["Diagnosis"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterDiagnosis"


def safe_value(val):
    if val == "":
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":                row.DiagnosisId,
        "diagnosisCode":     row.DiagnosisCode,
        "diagnosisName":     row.DiagnosisName,
        "icdVersion":        row.IcdVersion,
        "category":          row.Category,
        "description":       row.Description,
        "chronicDisease":    bool(row.ChronicDisease),
        "notifiableDisease": bool(row.NotifiableDisease),
        "status":            row.Status,
        "remarks":           row.Remarks,
        "createdBy":         row.CreatedBy,
        "createdDate":       row.CreatedDate,
        "modifiedBy":        row.ModifiedBy,
        "modifiedDate":      row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, diagnosis_id: int = 0, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_DiagnosisId":         diagnosis_id,
        "p_DiagnosisCode":       safe_value(kwargs.get("diagnosis_code")),
        "p_DiagnosisName":       safe_value(kwargs.get("diagnosis_name")),
        "p_IcdVersion":          safe_value(kwargs.get("icd_version")),
        "p_Category":            safe_value(kwargs.get("category")),
        "p_Description":         safe_value(kwargs.get("description")),
        "p_ChronicDisease":      int(kwargs.get("chronic_disease", False)),
        "p_NotifiableDisease":   int(kwargs.get("notifiable_disease", False)),
        "p_Status":              safe_value(kwargs.get("status")),
        "p_Remarks":             safe_value(kwargs.get("remarks")),
        "p_CreatedBy":           safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":          safe_value(kwargs.get("modified_by")),
        "p_Search":              safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_DiagnosisId,
            :p_DiagnosisCode, :p_DiagnosisName, :p_IcdVersion, :p_Category,
            :p_Description, :p_ChronicDisease, :p_NotifiableDisease,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ENUMS ────────────────────────────────────────────────────────────────
@router.get("/icd-versions", response_model=List[str])
def get_icd_versions():
    try:
        return [e.value for e in IcdVersionEnum]
    except Exception as e:
        logger.error(f"[GET /diagnosis/icd-versions] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories", response_model=List[str])
def get_categories():
    try:
        return [e.value for e in DiagnosisCategoryEnum]
    except Exception as e:
        logger.error(f"[GET /diagnosis/categories] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[DiagnosisResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /diagnosis] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{diagnosis_id}", response_model=DiagnosisResponse)
def get_by_id(diagnosis_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", diagnosis_id=diagnosis_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Diagnosis not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /diagnosis/{diagnosis_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=DiagnosisResponse, status_code=status.HTTP_201_CREATED)
def create(diagnosis: DiagnosisCreate, db: Session = Depends(get_db)):
    try:
        d = diagnosis.model_dump()
        result = _call_sp(db, "INSERT",
            diagnosis_code=d["diagnosisCode"],
            diagnosis_name=d["diagnosisName"],
            icd_version=d["icdVersion"],
            category=d["category"],
            description=d["description"],
            chronic_disease=d["chronicDisease"],
            notifiable_disease=d["notifiableDisease"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.DiagnosisId
        db.commit()

        fetch = _call_sp(db, "GETBYID", diagnosis_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /diagnosis] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Diagnosis Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{diagnosis_id}", response_model=DiagnosisResponse)
def update(diagnosis_id: int, diagnosis: DiagnosisUpdate, db: Session = Depends(get_db)):
    try:
        d = diagnosis.model_dump()
        _call_sp(db, "UPDATE",
            diagnosis_id=diagnosis_id,
            diagnosis_code=d["diagnosisCode"],
            diagnosis_name=d["diagnosisName"],
            icd_version=d["icdVersion"],
            category=d["category"],
            description=d["description"],
            chronic_disease=d["chronicDisease"],
            notifiable_disease=d["notifiableDisease"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", diagnosis_id=diagnosis_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Diagnosis not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /diagnosis/{diagnosis_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Diagnosis Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{diagnosis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(diagnosis_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", diagnosis_id=diagnosis_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Diagnosis not found")
        _call_sp(db, "DELETE", diagnosis_id=diagnosis_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /diagnosis/{diagnosis_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
