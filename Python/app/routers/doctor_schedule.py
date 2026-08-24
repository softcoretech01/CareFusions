import logging
from datetime import timedelta, time as dtime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.doctor_schedule import ScheduleSave

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/doctor-schedules", tags=["Doctor Schedule"])

SP_NAME = "SpDoctorSchedule"

_PARAMS = [
    "p_Opt", "p_DoctorId", "p_AvailableDays", "p_FromTime", "p_ToTime",
    "p_BreakFrom", "p_BreakTo", "p_SlotDuration", "p_MaxPatients",
    "p_LeaveDate", "p_Reason",
]


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":           opt,
        "p_DoctorId":      kw.get("doctor_id"),
        "p_AvailableDays": kw.get("available_days"),
        "p_FromTime":      kw.get("from_time"),
        "p_ToTime":        kw.get("to_time"),
        "p_BreakFrom":     kw.get("break_from"),
        "p_BreakTo":       kw.get("break_to"),
        "p_SlotDuration":  kw.get("slot_duration"),
        "p_MaxPatients":   kw.get("max_patients"),
        "p_LeaveDate":     kw.get("leave_date"),
        "p_Reason":        kw.get("reason"),
    }
    placeholders = ", ".join(f":{p}" for p in _PARAMS)
    return db.execute(text(f"CALL {SP_NAME}({placeholders})"), params)


def _hhmm(value) -> str:
    """Format a DB TIME (timedelta or time) as 'HH:MM'; '' if null."""
    if value is None:
        return ""
    if isinstance(value, timedelta):
        total = int(value.total_seconds())
        return f"{total // 3600:02d}:{(total % 3600) // 60:02d}"
    if isinstance(value, dtime):
        return f"{value.hour:02d}:{value.minute:02d}"
    # already a string like "09:00:00"
    return str(value)[:5]


# ── GET /doctor-schedules/ ────────────────────────────────────
@router.get("/")
def list_schedules(db: Session = Depends(get_db)):
    """All active doctors with their schedule and leaves, in the shape the
    Doctor Schedules page expects."""
    try:
        rows = _call_sp(db, "LIST").fetchall()
        leaves = _call_sp(db, "LEAVES").fetchall()

        # Group leaves by doctor id
        leaves_by_doc: dict[int, list] = {}
        for lv in leaves:
            leaves_by_doc.setdefault(lv.DoctorId, []).append({
                "date":   str(lv.LeaveDate),
                "reason": lv.Reason or "Leave",
            })

        result = []
        for r in rows:
            result.append({
                "id":           r.DoctorId,
                "name":         r.DoctorName,
                "dept":         r.Department or "",
                "workingDays":  r.AvailableDays.split(",") if r.AvailableDays else [],
                "timings":      {"start": _hhmm(r.FromTime), "end": _hhmm(r.ToTime)},
                "breakTimings": {"start": _hhmm(r.BreakFrom), "end": _hhmm(r.BreakTo)} if _hhmm(r.BreakFrom) and _hhmm(r.BreakTo) else None,
                "slotDuration": r.SlotDuration if r.SlotDuration is not None else 15,
                "maxPatients":  r.MaxPatients if r.MaxPatients is not None else 30,
                "exceptions":   leaves_by_doc.get(r.DoctorId, []),
            })
        return result
    except Exception as e:
        logger.error(f"[GET /doctor-schedules] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch doctor schedules")


# ── PUT /doctor-schedules/{doctor_id} ─────────────────────────
@router.put("/{doctor_id}")
def save_schedule(doctor_id: int, payload: ScheduleSave, db: Session = Depends(get_db)):
    """Save one doctor's schedule (timings + capacity) and replace their leaves."""
    if not payload.timings.start or not payload.timings.end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Timings start and end times are required")
    try:
        # 1) Upsert the schedule row
        _call_sp(
            db, "SAVE",
            doctor_id=doctor_id,
            available_days=",".join(payload.workingDays),
            from_time=payload.timings.start,
            to_time=payload.timings.end,
            break_from=(payload.breakTimings.start if payload.breakTimings else ""),
            break_to=(payload.breakTimings.end if payload.breakTimings else ""),
            slot_duration=payload.slotDuration,
            max_patients=payload.maxPatients,
        )
        # 2) Replace leaves: clear then re-insert
        _call_sp(db, "DELLEAVESALL", doctor_id=doctor_id)
        for lv in payload.exceptions:
            _call_sp(db, "ADDLEAVE", doctor_id=doctor_id,
                     leave_date=lv.date, reason=lv.reason or "Leave")
        db.commit()
        return {"message": f"Schedule saved for doctor {doctor_id}"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /doctor-schedules/{doctor_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to save doctor schedule")
