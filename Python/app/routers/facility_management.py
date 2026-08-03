from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.facility_management import (
    FacilityManagementCreate,
    FacilityManagementUpdate,
    FacilityManagementResponse,
)

router = APIRouter(prefix="/facility-management", tags=["Facility Management"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterFacilityManagement"


def safe_value(val):
    if val == "":
        return None
    return val

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


def _map_row(row) -> dict:
    return {
        "id":                 row.FacilityStaffId,
        "employeeId":         row.EmployeeCode_FM,
        "employeeCode":       row.EmployeeCode,
        "name":               row.StaffName,
        "staffCategory":      row.StaffCategory,
        "hospital":           row.HospitalName,
        "branch":             row.BranchName,
        "assignedArea":       row.AssignedArea,
        "mobile":             row.Mobile,
        "email":              row.Email,
        "address":            row.Address,
        "joiningDate":        row.JoiningDate,
        "shift":              row.Shift,
        "employmentType":     row.EmploymentType,
        "supervisor":         row.Supervisor,
        "profilePhoto":       row.ProfilePhoto,
        "idProof":            row.IdProof,
        "policeVerification": row.PoliceVerification,
        "status":             row.Status,
        "remarks":            row.Remarks,
        "createdBy":          row.CreatedBy,
        "createdDate":        row.CreatedDate,
        "modifiedBy":         row.ModifiedBy,
        "modifiedDate":       row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, facility_staff_id: int = 0, **kwargs):
    params = {
        "p_Opt":                opt,
        "p_FacilityStaffId":    facility_staff_id,
        "p_EmployeeCode":       safe_value(kwargs.get("employee_code")),
        "p_StaffName":          safe_value(kwargs.get("name")),
        "p_StaffCategory":      safe_value(kwargs.get("staff_category")),
        "p_HospitalName":       safe_value(kwargs.get("hospital")),
        "p_BranchName":         safe_value(kwargs.get("branch")),
        "p_AssignedArea":       safe_value(kwargs.get("assigned_area")),
        "p_Mobile":             safe_value(kwargs.get("mobile")),
        "p_Email":              safe_value(kwargs.get("email")),
        "p_Address":            safe_value(kwargs.get("address")),
        "p_JoiningDate":        safe_value(kwargs.get("joining_date")),
        "p_Shift":              safe_value(kwargs.get("shift")),
        "p_EmploymentType":     safe_value(kwargs.get("employment_type")),
        "p_Supervisor":         safe_value(kwargs.get("supervisor")),
        "p_ProfilePhoto":       safe_value(kwargs.get("profile_photo")),
        "p_IdProof":            safe_value(kwargs.get("id_proof")),
        "p_PoliceVerification": safe_value(kwargs.get("police_verification")),
        "p_Status":             safe_value(kwargs.get("status")),
        "p_Remarks":            safe_value(kwargs.get("remarks")),
        "p_CreatedBy":          safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":         safe_value(kwargs.get("modified_by")),
        "p_Search":             safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_FacilityStaffId,
            :p_EmployeeCode, :p_StaffName, :p_StaffCategory,
            :p_HospitalName, :p_BranchName, :p_AssignedArea,
            :p_Mobile, :p_Email, :p_Address,
            :p_JoiningDate, :p_Shift, :p_EmploymentType, :p_Supervisor,
            :p_ProfilePhoto, :p_IdProof, :p_PoliceVerification,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[FacilityManagementResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /facility-management] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{staff_id}", response_model=FacilityManagementResponse)
def get_by_id(staff_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", facility_staff_id=staff_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Staff not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /facility-management/{staff_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=FacilityManagementResponse, status_code=status.HTTP_201_CREATED)
def create(staff: FacilityManagementCreate, db: Session = Depends(get_db)):
    try:
        d = staff.model_dump()
        result = _call_sp(db, "INSERT",
            employee_code=d["employeeCode"],
            name=d["name"],
            staff_category=d["staffCategory"],
            hospital=d["hospital"],
            branch=d["branch"],
            assigned_area=d["assignedArea"],
            mobile=d["mobile"],
            email=d["email"],
            address=d["address"],
            joining_date=d["joiningDate"],
            shift=d["shift"],
            employment_type=d["employmentType"],
            supervisor=d["supervisor"],
            profile_photo=d["profilePhoto"],
            id_proof=d["idProof"],
            police_verification=d["policeVerification"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.FacilityStaffId
        db.commit()

        fetch = _call_sp(db, "GETBYID", facility_staff_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /facility-management] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{staff_id}", response_model=FacilityManagementResponse)
def update(staff_id: int, staff: FacilityManagementUpdate, db: Session = Depends(get_db)):
    try:
        d = staff.model_dump()
        _call_sp(db, "UPDATE",
            facility_staff_id=staff_id,
            employee_code=d["employeeCode"],
            name=d["name"],
            staff_category=d["staffCategory"],
            hospital=d["hospital"],
            branch=d["branch"],
            assigned_area=d["assignedArea"],
            mobile=d["mobile"],
            email=d["email"],
            address=d["address"],
            joining_date=d["joiningDate"],
            shift=d["shift"],
            employment_type=d["employmentType"],
            supervisor=d["supervisor"],
            profile_photo=d["profilePhoto"],
            id_proof=d["idProof"],
            police_verification=d["policeVerification"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", facility_staff_id=staff_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Staff not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /facility-management/{staff_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(staff_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", facility_staff_id=staff_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Staff not found")
        _call_sp(db, "DELETE", facility_staff_id=staff_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /facility-management/{staff_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
