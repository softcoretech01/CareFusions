import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.appointment import (
    AppointmentCreate, AppointmentUpdate, StatusUpdate, TokenUpdate, AppointmentResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/appointments", tags=["Appointment"])

# Appointments live in the `registration` database (patient/registration
# domain), while the connection's default schema is `admin`. The fully-qualified
# name makes the cross-database CALL resolve correctly.
SP_NAME = "registration.SpAppointment"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":             opt,
        "p_AppointmentId":   kw.get("appointment_id"),
        "p_Uhid":            kw.get("uhid"),
        "p_PatientName":     kw.get("patient_name"),
        "p_MobileNumber":    kw.get("mobile_number"),
        "p_Department":      kw.get("department"),
        "p_Doctor":          kw.get("doctor"),
        "p_AppointmentDate": kw.get("appointment_date"),
        "p_TimeSlot":        kw.get("time_slot"),
        "p_DurationMinutes": kw.get("duration_minutes"),
        "p_Type":            kw.get("type"),
        "p_Priority":        kw.get("priority"),
        "p_Status":          kw.get("status"),
        "p_QueueToken":      kw.get("queue_token"),
        "p_Notes":           kw.get("notes"),
        "p_CreatedBy":       kw.get("created_by"),
        "p_UpdatedBy":       kw.get("updated_by"),
        "p_Search":          kw.get("search"),
        "p_DeptFilter":      kw.get("dept_filter"),
        "p_StatusFilter":    kw.get("status_filter"),
        "p_TypeFilter":      kw.get("type_filter"),
        "p_DateFilter":      kw.get("date_filter"),
        "p_DateFrom":        kw.get("date_from"),
        "p_DateTo":          kw.get("date_to"),
        "p_ExcludeType":     kw.get("exclude_type"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_AppointmentId, :p_Uhid, :p_PatientName, :p_MobileNumber, :p_Department,
            :p_Doctor, :p_AppointmentDate, :p_TimeSlot, :p_DurationMinutes, :p_Type, :p_Priority,
            :p_Status, :p_QueueToken, :p_Notes, :p_CreatedBy, :p_UpdatedBy, :p_Search,
            :p_DeptFilter, :p_StatusFilter, :p_TypeFilter, :p_DateFilter,
            :p_DateFrom, :p_DateTo, :p_ExcludeType
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                row.AppointmentId,
        "appointmentNumber": row.AppointmentNumber,
        "uhid":              row.Uhid,
        "patientName":       row.PatientName,
        "mobileNumber":      row.MobileNumber,
        "department":        row.Department,
        "doctor":            row.Doctor,
        "date":              row.AppointmentDate,
        "timeSlot":          row.TimeSlot,
        "durationMinutes":   row.DurationMinutes,
        "type":              row.Type,
        "priority":          row.Priority,
        "status":            row.Status,
        "queueToken":        row.QueueToken,
        "notes":             row.Notes,
        "createdDate":       row.CreatedDate,
        "updatedDate":       row.UpdatedDate,
    }


def _fields(payload) -> dict:
    return dict(
        uhid=payload.uhid,
        patient_name=payload.patientName,
        mobile_number=payload.mobileNumber,
        department=payload.department,
        doctor=payload.doctor,
        appointment_date=payload.date,
        time_slot=payload.timeSlot,
        duration_minutes=payload.durationMinutes,
        type=payload.type.value,
        priority=payload.priority.value,
        status=payload.status.value,
        notes=payload.notes,
    )


@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(search: Optional[str] = None, dept_filter: Optional[str] = None,
                     status_filter: Optional[str] = None, type_filter: Optional[str] = None,
                     date_filter: Optional[str] = None, date_from: Optional[str] = None,
                     date_to: Optional[str] = None, exclude_type: Optional[str] = None,
                     db: Session = Depends(get_db)):
    """Fetch appointments (newest first) with optional server-side filters:
    search, department, status, type (or exclude_type), and a date range."""
    try:
        rows = _call_sp(db, "GET", search=search, dept_filter=dept_filter,
                        status_filter=status_filter, type_filter=type_filter,
                        date_filter=date_filter, date_from=date_from, date_to=date_to,
                        exclude_type=exclude_type).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /appointments] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch appointments")


@router.get("/next-number")
def get_next_number(db: Session = Depends(get_db)):
    """Preview the next appointment number (provisional; the real one is set at create)."""
    try:
        row = _call_sp(db, "NEXTNUMBER").fetchone()
        return {"appointmentNumber": row.AppointmentNumber if row else None}
    except Exception as e:
        logger.error(f"[GET /appointments/next-number] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next number")


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    try:
        row = _call_sp(db, "GETBYID", appointment_id=appointment_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /appointments/{appointment_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch appointment")


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    """Create an appointment. AppointmentNumber and QueueToken are server-generated."""
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_fields(payload)).fetchone().AppointmentId
        db.commit()
        created = _call_sp(db, "GETBYID", appointment_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        # SpAppointment refuses a slot that is already taken. That is a caller
        # error, not a server fault, so it must not surface as a 500 the UI
        # reports as "something went wrong".
        if "SLOT_ALREADY_BOOKED" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That doctor already has an appointment in this time slot. Pick another slot.",
            )
        logger.error(f"[POST /appointments] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create appointment")


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: int, payload: AppointmentUpdate, db: Session = Depends(get_db)):
    """Update an appointment. AppointmentNumber and QueueToken are immutable here."""
    try:
        _call_sp(db, "UPDATE", appointment_id=appointment_id, updated_by=payload.updatedBy or "Admin", **_fields(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", appointment_id=appointment_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /appointments/{appointment_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update appointment")


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_status(appointment_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "UPDATESTATUS", appointment_id=appointment_id, status=payload.status.value, updated_by=payload.updatedBy or "Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", appointment_id=appointment_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /appointments/{appointment_id}/status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update status")


@router.patch("/{appointment_id}/token", response_model=AppointmentResponse)
def set_token(appointment_id: int, payload: TokenUpdate, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "SETTOKEN", appointment_id=appointment_id, queue_token=payload.queueToken, updated_by=payload.updatedBy or "Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", appointment_id=appointment_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /appointments/{appointment_id}/token] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to set token")


@router.delete("/{appointment_id}", status_code=status.HTTP_200_OK)
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "DELETE", appointment_id=appointment_id, updated_by="Admin")
        db.commit()
        return {"message": f"Appointment {appointment_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /appointments/{appointment_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete appointment")
