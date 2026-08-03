from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.appointment_status import (
    AppointmentStatusCreate,
    AppointmentStatusUpdate,
    AppointmentStatusResponse,
)

router = APIRouter(prefix="/appointment-status", tags=["Appointment Status"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterAppointmentStatus"


# ── GET /next-code ─────────────────────────────────────────
@router.get("/next-code")
def get_next_code(db: Session = Depends(get_db)):
    """Fetch the next auto-generated code from the backend."""
    try:
        result = _call_sp(db, "GETNEXTCODE")
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to generate next code")
        return {"nextCode": row[0]}
    except Exception as e:
        logger.error(f"[GET /next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch next code")


def safe_value(val):
    if val == "":
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":                row.StatusId,
        "statusCode":        row.StatusCode,
        "statusName":        row.StatusName,
        "displayOrder":      str(row.DisplayOrder),
        "description":       row.Description,
        "isDefault":         bool(row.IsDefault),
        "isFinal":           bool(row.IsFinal),
        "allowReschedule":   bool(row.AllowReschedule),
        "allowCancellation": bool(row.AllowCancellation),
        "status":            row.Status,
        "remarks":           row.Remarks,
        "createdBy":         row.CreatedBy,
        "createdDate":       row.CreatedDate,
        "modifiedBy":        row.ModifiedBy,
        "modifiedDate":      row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, status_id: int = 0, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_StatusId":            status_id,
        "p_StatusCode":          safe_value(kwargs.get("status_code")),
        "p_StatusName":          safe_value(kwargs.get("status_name")),
        "p_DisplayOrder":        int(kwargs.get("display_order", 0)),
        "p_Description":         safe_value(kwargs.get("description")),
        "p_IsDefault":           1 if kwargs.get("is_default") else 0,
        "p_IsFinal":             1 if kwargs.get("is_final") else 0,
        "p_AllowReschedule":     1 if kwargs.get("allow_reschedule") else 0,
        "p_AllowCancellation":   1 if kwargs.get("allow_cancellation") else 0,
        "p_Status":              safe_value(kwargs.get("status")),
        "p_Remarks":             safe_value(kwargs.get("remarks")),
        "p_CreatedBy":           safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":          safe_value(kwargs.get("modified_by")),
        "p_Search":              safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_StatusId,
            :p_StatusCode, :p_StatusName, :p_DisplayOrder, :p_Description,
            :p_IsDefault, :p_IsFinal, :p_AllowReschedule, :p_AllowCancellation,
            :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


def _check_default_status(db: Session, is_default: bool, current_id: Optional[int] = None):
    if not is_default:
        return
    sql = text("SELECT StatusId FROM Master_AppointmentStatus WHERE IsDefault = 1 AND IsDeleted = 0")
    result = db.execute(sql).fetchall()
    for row in result:
        if current_id is None or row.StatusId != current_id:
            raise HTTPException(status_code=400, detail="Only one status can be the default status. Uncheck the other first.")


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[AppointmentStatusResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /appointment-status] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{status_id}", response_model=AppointmentStatusResponse)
def get_by_id(status_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", status_id=status_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Appointment Status not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /appointment-status/{status_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=AppointmentStatusResponse, status_code=status.HTTP_201_CREATED)
def create(appointment_status: AppointmentStatusCreate, db: Session = Depends(get_db)):
    try:
        _check_default_status(db, appointment_status.isDefault)
        
        d = appointment_status.model_dump()
        result = _call_sp(db, "INSERT",
            status_code=d["statusCode"],
            status_name=d["statusName"],
            display_order=d["displayOrder"],
            description=d["description"],
            is_default=d["isDefault"],
            is_final=d["isFinal"],
            allow_reschedule=d["allowReschedule"],
            allow_cancellation=d["allowCancellation"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.StatusId
        db.commit()

        fetch = _call_sp(db, "GETBYID", status_id=new_id)
        return _map_row(fetch.fetchone())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /appointment-status] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Status Code or Display Order already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{status_id}", response_model=AppointmentStatusResponse)
def update(status_id: int, appointment_status: AppointmentStatusUpdate, db: Session = Depends(get_db)):
    try:
        _check_default_status(db, appointment_status.isDefault, current_id=status_id)
        
        d = appointment_status.model_dump()
        _call_sp(db, "UPDATE",
            status_id=status_id,
            status_code=d["statusCode"],
            status_name=d["statusName"],
            display_order=d["displayOrder"],
            description=d["description"],
            is_default=d["isDefault"],
            is_final=d["isFinal"],
            allow_reschedule=d["allowReschedule"],
            allow_cancellation=d["allowCancellation"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", status_id=status_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Appointment Status not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /appointment-status/{status_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Status Code or Display Order already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(status_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", status_id=status_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Appointment Status not found")
        _call_sp(db, "DELETE", status_id=status_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /appointment-status/{status_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
