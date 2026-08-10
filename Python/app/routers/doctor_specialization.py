import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.doctor_specialization import (
    DoctorSpecializationCreate,
    DoctorSpecializationUpdate,
    DoctorSpecializationResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/doctor-specializations", tags=["Doctor Specialization Master"])

SP_NAME = "SpMasterDoctorSpecialization"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                opt,
        "p_SpecializationId":   kwargs.get("specialization_id"),
        "p_SpecializationName": kwargs.get("specialization_name"),
        "p_DepartmentName":     kwargs.get("department_name"),
        "p_Description":        kwargs.get("description"),
        "p_Status":             kwargs.get("status"),
        "p_CreatedBy":          kwargs.get("created_by"),
        "p_UpdatedBy":          kwargs.get("updated_by"),
        "p_Search":             kwargs.get("search"),
        "p_StatusFilter":       kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_SpecializationId, :p_SpecializationName, :p_DepartmentName,
            :p_Description, :p_Status, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                 row.SpecializationId,
        "specializationCode": row.SpecializationCode,
        "specializationName": row.SpecializationName,
        "departmentName":     row.DepartmentName,
        "description":        row.Description,
        "status":             row.Status,
        "createdBy":          row.CreatedBy,
        "createdDate":        row.CreatedDate,
        "updatedBy":          row.UpdatedBy,
        "updatedDate":        row.UpdatedDate,
    }


def _raise_if_known(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_SPECIALIZATION_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Specialization Name must be unique")
    if "SPECIALIZATION_IN_USE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Doctors are still assigned to this specialization. "
                                   "Reassign them before retiring it.")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A specialization with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        specialization_name=payload.specializationName,
        department_name=payload.departmentName,
        description=payload.description,
        status=payload.status.value,
    )


# ── GET /doctor-specializations/ ──────────────────────────────
@router.get("/", response_model=List[DoctorSpecializationResponse])
def get_specializations(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all doctor specializations with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /doctor-specializations] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch doctor specializations")


# ── GET /doctor-specializations/next-code ─────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_specialization_code(db: Session = Depends(get_db)):
    """Preview the SpecializationCode the next insert would generate."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"specializationCode": row.SpecializationCode if row else "DS-001"}
    except Exception as e:
        logger.error(f"[GET /doctor-specializations/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next specialization code")


# ── GET /doctor-specializations/{id} ──────────────────────────
@router.get("/{specialization_id}", response_model=DoctorSpecializationResponse)
def get_specialization_by_id(specialization_id: int, db: Session = Depends(get_db)):
    """Fetch a single specialization by ID."""
    try:
        row = _call_sp(db, "GETBYID", specialization_id=specialization_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Specialization with ID {specialization_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /doctor-specializations/{specialization_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch specialization")


# ── POST /doctor-specializations/ ─────────────────────────────
@router.post("/", response_model=DoctorSpecializationResponse,
             status_code=status.HTTP_201_CREATED)
def create_specialization(payload: DoctorSpecializationCreate, db: Session = Depends(get_db)):
    """Create a specialization. SpecializationCode is auto-generated (DS-001)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().SpecializationId
        db.commit()

        created = _call_sp(db, "GETBYID", specialization_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /doctor-specializations] Error: {e}")
        _raise_if_known(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create specialization")


# ── PUT /doctor-specializations/{id} ──────────────────────────
@router.put("/{specialization_id}", response_model=DoctorSpecializationResponse)
def update_specialization(specialization_id: int,
                          payload: DoctorSpecializationUpdate,
                          db: Session = Depends(get_db)):
    """Update an existing specialization. SpecializationCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            specialization_id=specialization_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", specialization_id=specialization_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Specialization with ID {specialization_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /doctor-specializations/{specialization_id}] Error: {e}")
        _raise_if_known(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update specialization")


# ── PATCH /doctor-specializations/{id}/toggle-status ──────────
@router.patch("/{specialization_id}/toggle-status",
              response_model=DoctorSpecializationResponse)
def toggle_specialization_status(specialization_id: int, db: Session = Depends(get_db)):
    """Toggle status. Refused while doctors are still assigned."""
    try:
        _call_sp(db, "TOGGLESTATUS", specialization_id=specialization_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", specialization_id=specialization_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Specialization with ID {specialization_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /doctor-specializations/{specialization_id}/toggle-status] Error: {e}")
        _raise_if_known(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle specialization status")


# ── DELETE /doctor-specializations/{id} ───────────────────────
@router.delete("/{specialization_id}", status_code=status.HTTP_200_OK)
def delete_specialization(specialization_id: int, db: Session = Depends(get_db)):
    """Soft delete. Refused while doctors are still assigned."""
    try:
        _call_sp(db, "DELETE", specialization_id=specialization_id, updated_by="Admin")
        db.commit()
        return {"message": f"Specialization {specialization_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /doctor-specializations/{specialization_id}] Error: {e}")
        _raise_if_known(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete specialization")
