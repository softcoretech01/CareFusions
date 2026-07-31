from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.procedure import (
    ProcedureCreate,
    ProcedureUpdate,
    ProcedureResponse,
)

router = APIRouter(prefix="/procedures", tags=["Procedure"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterProcedure"


def safe_value(val):
    if val == "":
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":                row.ProcedureId,
        "procedureCode":     row.ProcedureCode,
        "procedureName":     row.ProcedureName,
        "department":        row.Department,
        "procedureType":     row.ProcedureType,
        "description":       row.Description,
        # Handling decimal to string
        "defaultCharge":     str(int(row.DefaultCharge)) if row.DefaultCharge is not None and row.DefaultCharge == int(row.DefaultCharge) else str(row.DefaultCharge) if row.DefaultCharge is not None else '0',
        "taxApplicable":     bool(row.TaxApplicable),
        "estimatedDuration": str(row.EstimatedDuration) if row.EstimatedDuration is not None else '',
        "requiresConsent":   bool(row.RequiresConsent),
        "requiresAdmission": bool(row.RequiresAdmission),
        "otRequired":        bool(row.OtRequired),
        "status":            row.Status,
        "remarks":           row.Remarks,
        "createdBy":         row.CreatedBy,
        "createdDate":       row.CreatedDate,
        "modifiedBy":        row.ModifiedBy,
        "modifiedDate":      row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, procedure_id: int = 0, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_ProcedureId":         procedure_id,
        "p_ProcedureCode":       safe_value(kwargs.get("procedure_code")),
        "p_ProcedureName":       safe_value(kwargs.get("procedure_name")),
        "p_Department":          safe_value(kwargs.get("department")),
        "p_ProcedureType":       safe_value(kwargs.get("procedure_type")),
        "p_Description":         safe_value(kwargs.get("description")),
        "p_DefaultCharge":       kwargs.get("default_charge", 0.0),
        "p_TaxApplicable":       int(kwargs.get("tax_applicable", False)),
        "p_EstimatedDuration":   kwargs.get("estimated_duration", 0) or 0,
        "p_RequiresConsent":     int(kwargs.get("requires_consent", False)),
        "p_RequiresAdmission":   int(kwargs.get("requires_admission", False)),
        "p_OtRequired":          int(kwargs.get("ot_required", False)),
        "p_Status":              safe_value(kwargs.get("status")),
        "p_Remarks":             safe_value(kwargs.get("remarks")),
        "p_CreatedBy":           safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":          safe_value(kwargs.get("modified_by")),
        "p_Search":              safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ProcedureId,
            :p_ProcedureCode, :p_ProcedureName, :p_Department, :p_ProcedureType,
            :p_Description, :p_DefaultCharge, :p_TaxApplicable, :p_EstimatedDuration,
            :p_RequiresConsent, :p_RequiresAdmission, :p_OtRequired,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[ProcedureResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /procedures] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{procedure_id}", response_model=ProcedureResponse)
def get_by_id(procedure_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", procedure_id=procedure_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Procedure not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /procedures/{procedure_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=ProcedureResponse, status_code=status.HTTP_201_CREATED)
def create(procedure: ProcedureCreate, db: Session = Depends(get_db)):
    try:
        d = procedure.model_dump()
        result = _call_sp(db, "INSERT",
            procedure_code=d["procedureCode"],
            procedure_name=d["procedureName"],
            department=d["department"],
            procedure_type=d["procedureType"],
            description=d["description"],
            default_charge=float(d["defaultCharge"] or 0),
            tax_applicable=d["taxApplicable"],
            estimated_duration=int(d["estimatedDuration"] or 0),
            requires_consent=d["requiresConsent"],
            requires_admission=d["requiresAdmission"],
            ot_required=d["otRequired"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.ProcedureId
        db.commit()

        fetch = _call_sp(db, "GETBYID", procedure_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /procedures] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Procedure Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{procedure_id}", response_model=ProcedureResponse)
def update(procedure_id: int, procedure: ProcedureUpdate, db: Session = Depends(get_db)):
    try:
        d = procedure.model_dump()
        _call_sp(db, "UPDATE",
            procedure_id=procedure_id,
            procedure_code=d["procedureCode"],
            procedure_name=d["procedureName"],
            department=d["department"],
            procedure_type=d["procedureType"],
            description=d["description"],
            default_charge=float(d["defaultCharge"] or 0),
            tax_applicable=d["taxApplicable"],
            estimated_duration=int(d["estimatedDuration"] or 0),
            requires_consent=d["requiresConsent"],
            requires_admission=d["requiresAdmission"],
            ot_required=d["otRequired"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", procedure_id=procedure_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Procedure not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /procedures/{procedure_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Procedure Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{procedure_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(procedure_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", procedure_id=procedure_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Procedure not found")
        _call_sp(db, "DELETE", procedure_id=procedure_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /procedures/{procedure_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
