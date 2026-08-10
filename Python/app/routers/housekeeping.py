import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.housekeeping import (
    HousekeepingCreate,
    HousekeepingUpdate,
    HousekeepingResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/housekeeping", tags=["Housekeeping Master"])

SP_NAME = "SpMasterHousekeeping"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":              opt,
        "p_HousekeepingId":   kwargs.get("housekeeping_id"),
        "p_EmployeeCode":     kwargs.get("employee_code"),
        "p_StaffName":        kwargs.get("staff_name"),
        "p_Gender":           kwargs.get("gender"),
        "p_HospitalName":     kwargs.get("hospital"),
        "p_BranchName":       kwargs.get("branch"),
        "p_AssignedArea":     kwargs.get("assigned_area"),
        "p_Mobile":           kwargs.get("mobile"),
        "p_Email":            kwargs.get("email"),
        "p_Address":          kwargs.get("address"),
        "p_JoiningDate":      kwargs.get("joining_date"),
        "p_Shift":            kwargs.get("shift"),
        "p_ExperienceYears":  kwargs.get("experience"),
        "p_ReportingManager": kwargs.get("manager"),
        "p_Photo":            kwargs.get("photo"),
        "p_IdProof":          kwargs.get("id_proof"),
        "p_Status":           kwargs.get("status"),
        "p_Remarks":          kwargs.get("remarks"),
        "p_CreatedBy":        kwargs.get("created_by"),
        "p_ModifiedBy":       kwargs.get("modified_by"),
        "p_Search":           kwargs.get("search"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_HousekeepingId, :p_EmployeeCode, :p_StaffName, :p_Gender,
            :p_HospitalName, :p_BranchName, :p_AssignedArea, :p_Mobile, :p_Email,
            :p_Address, :p_JoiningDate, :p_Shift, :p_ExperienceYears,
            :p_ReportingManager, :p_Photo, :p_IdProof, :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":               row.HousekeepingId,
        "housekeepingCode": row.HousekeepingCode,
        "employeeCode":     row.EmployeeCode,
        "name":             row.StaffName,
        "gender":           row.Gender,
        "hospital":         row.HospitalName,
        "branch":           row.BranchName,
        "assignedArea":     row.AssignedArea,
        "mobile":           row.Mobile,
        "email":            row.Email,
        "address":          row.Address,
        "joiningDate":      row.JoiningDate,
        "shift":            row.Shift,
        "experience":       row.ExperienceYears,
        "manager":          row.ReportingManager,
        "photo":            row.Photo,
        "idProof":          row.IdProof,
        "status":           row.Status,
        "remarks":          row.Remarks,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "modifiedBy":       row.ModifiedBy,
        "modifiedDate":     row.ModifiedDate,
    }


def _raise_if_known(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_EMPLOYEE_CODE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Employee Code is already assigned to another housekeeping staff member")
    if "DUPLICATE_MOBILE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Mobile number is already registered to another housekeeping staff member")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A housekeeping staff member with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        employee_code=payload.employeeCode,
        staff_name=payload.name,
        gender=payload.gender.value if payload.gender else None,
        hospital=payload.hospital,
        branch=payload.branch,
        assigned_area=payload.assignedArea,
        mobile=payload.mobile,
        email=payload.email,
        address=payload.address,
        joining_date=payload.joiningDate,
        shift=payload.shift,
        experience=payload.experience,
        manager=payload.manager,
        photo=payload.photo,
        id_proof=payload.idProof,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /housekeeping/ ────────────────────────────────────────
@router.get("/", response_model=List[HousekeepingResponse])
def get_housekeeping_staff(search: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch all housekeeping staff, optionally filtered by a search term."""
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /housekeeping] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch housekeeping staff")


# ── GET /housekeeping/next-code ───────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_housekeeping_code(db: Session = Depends(get_db)):
    """Preview the HousekeepingCode the next insert would generate."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"housekeepingCode": row.HousekeepingCode if row else "HK-001"}
    except Exception as e:
        logger.error(f"[GET /housekeeping/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next housekeeping code")


# ── GET /housekeeping/{id} ────────────────────────────────────
@router.get("/{housekeeping_id}", response_model=HousekeepingResponse)
def get_housekeeping_by_id(housekeeping_id: int, db: Session = Depends(get_db)):
    """Fetch a single housekeeping staff member by ID."""
    try:
        row = _call_sp(db, "GETBYID", housekeeping_id=housekeeping_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Housekeeping staff with ID {housekeeping_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /housekeeping/{housekeeping_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch housekeeping staff member")


# ── POST /housekeeping/ ───────────────────────────────────────
@router.post("/", response_model=HousekeepingResponse, status_code=status.HTTP_201_CREATED)
def create_housekeeping(payload: HousekeepingCreate, db: Session = Depends(get_db)):
    """Create a housekeeping staff member. HousekeepingCode is auto-generated."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "System",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().HousekeepingId
        db.commit()

        created = _call_sp(db, "GETBYID", housekeeping_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /housekeeping] Error: {e}")
        _raise_if_known(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create housekeeping staff member")


# ── PUT /housekeeping/{id} ────────────────────────────────────
@router.put("/{housekeeping_id}", response_model=HousekeepingResponse)
def update_housekeeping(housekeeping_id: int,
                        payload: HousekeepingUpdate,
                        db: Session = Depends(get_db)):
    """Update an existing housekeeping staff member. The code is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            housekeeping_id=housekeeping_id,
            modified_by=payload.modifiedBy or "System",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", housekeeping_id=housekeeping_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Housekeeping staff with ID {housekeeping_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /housekeeping/{housekeeping_id}] Error: {e}")
        _raise_if_known(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update housekeeping staff member")


# ── PATCH /housekeeping/{id}/toggle-status ────────────────────
@router.patch("/{housekeeping_id}/toggle-status", response_model=HousekeepingResponse)
def toggle_housekeeping_status(housekeeping_id: int, db: Session = Depends(get_db)):
    """Toggle status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", housekeeping_id=housekeeping_id, modified_by="System")
        db.commit()

        updated = _call_sp(db, "GETBYID", housekeeping_id=housekeeping_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Housekeeping staff with ID {housekeeping_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /housekeeping/{housekeeping_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle housekeeping status")


# ── DELETE /housekeeping/{id} ─────────────────────────────────
@router.delete("/{housekeeping_id}", status_code=status.HTTP_200_OK)
def delete_housekeeping(housekeeping_id: int, db: Session = Depends(get_db)):
    """Soft delete a housekeeping staff member."""
    try:
        _call_sp(db, "DELETE", housekeeping_id=housekeeping_id, modified_by="System")
        db.commit()
        return {"message": f"Housekeeping staff {housekeeping_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /housekeeping/{housekeeping_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete housekeeping staff member")
