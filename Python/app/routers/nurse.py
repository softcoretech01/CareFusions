from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import logging

from app.database import get_db
from app.schemas.nurse import NurseCreate, NurseUpdate, NurseResponse

router = APIRouter(prefix="/nurses", tags=["Nurses"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterNurse"


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
    if val == "": return None
    return val

def _map_row(row):
    return {
        "id": row.NurseId,
        "nurseId": row.NurseCode,
        "employeeCode": row.EmployeeCode,
        "name": row.NurseName,
        "gender": row.Gender,
        "dob": row.DateOfBirth,
        "qualification": row.Qualification,
        "registrationNumber": row.RegistrationNumber,
        "department": row.DepartmentName,
        "designation": row.Designation,
        "hospital": row.HospitalName,
        "branch": row.BranchName,
        "mobile": row.Mobile,
        "alternateMobile": row.AlternateMobile,
        "email": row.Email,
        "address": row.Address,
        "city": row.City,
        "state": row.State,
        "country": row.Country,
        "postalCode": row.PostalCode,
        "joiningDate": row.JoiningDate,
        "shift": row.Shift,
        "manager": row.ReportingManager,
        "employmentType": row.EmploymentType,
        "experience": row.ExperienceYears,
        "profilePhoto": row.ProfilePhoto,
        "nursingLicense": row.NursingLicense,
        "qualificationCertificate": row.QualificationCertificate,
        "idProof": row.IdProof,
        "status": row.Status,
        "remarks": row.Remarks,
        "createdBy": row.CreatedBy,
        "createdDate": row.CreatedDate,
        "modifiedBy": row.ModifiedBy,
        "modifiedDate": row.ModifiedDate
    }

def _call_sp(db: Session, opt: str, nurse_id: int = 0, **kwargs):
    params = {
        "p_Opt": opt,
        "p_NurseId": nurse_id,
        "p_EmployeeCode": safe_value(kwargs.get("employee_code")),
        "p_NurseName": safe_value(kwargs.get("name")),
        "p_Gender": safe_value(kwargs.get("gender")),
        "p_DateOfBirth": safe_value(kwargs.get("dob")),
        "p_Qualification": safe_value(kwargs.get("qualification")),
        "p_RegistrationNumber": safe_value(kwargs.get("registration_number")),
        "p_DepartmentName": safe_value(kwargs.get("department")),
        "p_Designation": safe_value(kwargs.get("designation")),
        "p_HospitalName": safe_value(kwargs.get("hospital")),
        "p_BranchName": safe_value(kwargs.get("branch")),
        "p_Mobile": safe_value(kwargs.get("mobile")),
        "p_AlternateMobile": safe_value(kwargs.get("alternate_mobile")),
        "p_Email": safe_value(kwargs.get("email")),
        "p_Address": safe_value(kwargs.get("address")),
        "p_City": safe_value(kwargs.get("city")),
        "p_State": safe_value(kwargs.get("state")),
        "p_Country": safe_value(kwargs.get("country")),
        "p_PostalCode": safe_value(kwargs.get("postal_code")),
        "p_JoiningDate": safe_value(kwargs.get("joining_date")),
        "p_Shift": safe_value(kwargs.get("shift")),
        "p_ReportingManager": safe_value(kwargs.get("manager")),
        "p_EmploymentType": safe_value(kwargs.get("employment_type")),
        "p_ExperienceYears": safe_value(kwargs.get("experience")),
        "p_ProfilePhoto": safe_value(kwargs.get("profilePhoto")),
        "p_NursingLicense": safe_value(kwargs.get("nursingLicense")),
        "p_QualificationCertificate": safe_value(kwargs.get("qualificationCertificate")),
        "p_IdProof": safe_value(kwargs.get("idProof")),
        "p_Status": safe_value(kwargs.get("status")),
        "p_Remarks": safe_value(kwargs.get("remarks")),
        "p_CreatedBy": safe_value(kwargs.get("created_by")),
        "p_ModifiedBy": safe_value(kwargs.get("modified_by")),
        "p_Search": safe_value(kwargs.get("search"))
    }
    
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_NurseId,
            :p_EmployeeCode, :p_NurseName, :p_Gender, :p_DateOfBirth, :p_Qualification,
            :p_RegistrationNumber, :p_DepartmentName, :p_Designation, :p_HospitalName, :p_BranchName,
            :p_Mobile, :p_AlternateMobile, :p_Email, :p_Address, :p_City, :p_State, :p_Country, :p_PostalCode,
            :p_JoiningDate, :p_Shift, :p_ReportingManager, :p_EmploymentType, :p_ExperienceYears,
            :p_ProfilePhoto, :p_NursingLicense, :p_QualificationCertificate, :p_IdProof,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


@router.get("/", response_model=List[NurseResponse])
def get_all_nurses(search: str = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(row) for row in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /nurses] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{nurse_id}", response_model=NurseResponse)
def get_nurse(nurse_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", nurse_id=nurse_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Nurse not found")
        return _map_row(row)
    except HTTPException: raise
    except Exception as e:
        logger.error(f"[GET /nurses/{nurse_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _next_employee_code(db: Session) -> str:
    """The code a new nurse gets when the form does not supply one.

    Master_Nurse.EmployeeCode is NOT NULL, but the Nurse form only shows the
    generated Nurse ID, so a create sent nothing and the insert failed with
    "Column 'EmployeeCode' cannot be null".
    """
    row = _call_sp(db, "GETNEXTCODE").fetchone()
    return row[0] if row else "NUR-001"


def _existing_employee_code(db: Session, nurse_id: int):
    """Keep the stored code on an update that does not send one."""
    row = _call_sp(db, "GETBYID", nurse_id=nurse_id).fetchone()
    return row.EmployeeCode if row else None


@router.post("/", response_model=NurseResponse, status_code=status.HTTP_201_CREATED)
def create_nurse(nurse: NurseCreate, db: Session = Depends(get_db)):
    try:
        kwargs = nurse.model_dump(by_alias=False)
        mapped = {
            "employee_code": kwargs.get("employeeCode") or _next_employee_code(db),
            "name": kwargs.get("name"),
            "gender": kwargs.get("gender"),
            "dob": kwargs.get("dob"),
            "qualification": kwargs.get("qualification"),
            "registration_number": kwargs.get("registrationNumber"),
            "department": kwargs.get("department"),
            "designation": kwargs.get("designation"),
            "hospital": kwargs.get("hospital"),
            "branch": kwargs.get("branch"),
            "mobile": kwargs.get("mobile"),
            "alternate_mobile": kwargs.get("alternateMobile"),
            "email": kwargs.get("email"),
            "address": kwargs.get("address"),
            "city": kwargs.get("city"),
            "state": kwargs.get("state"),
            "country": kwargs.get("country"),
            "postal_code": kwargs.get("postalCode"),
            "joining_date": kwargs.get("joiningDate"),
            "shift": kwargs.get("shift"),
            "manager": kwargs.get("manager"),
            "employment_type": kwargs.get("employmentType"),
            "experience": kwargs.get("experience"),
            "profilePhoto": kwargs.get("profilePhoto"),
            "nursingLicense": kwargs.get("nursingLicense"),
            "qualificationCertificate": kwargs.get("qualificationCertificate"),
            "idProof": kwargs.get("idProof"),
            "status": kwargs.get("status"),
            "remarks": kwargs.get("remarks"),
            "created_by": kwargs.get("createdBy")
        }
        
        result = _call_sp(db, "INSERT", **mapped)
        row = result.fetchone()
        new_id = row.NurseId
        db.commit()

        fetch = _call_sp(db, "GETBYID", nurse_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /nurses] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{nurse_id}", response_model=NurseResponse)
def update_nurse(nurse_id: int, nurse: NurseUpdate, db: Session = Depends(get_db)):
    try:
        kwargs = nurse.model_dump(by_alias=False)
        mapped = {
            "employee_code": (kwargs.get("employeeCode")
                              or _existing_employee_code(db, nurse_id)),
            "name": kwargs.get("name"),
            "gender": kwargs.get("gender"),
            "dob": kwargs.get("dob"),
            "qualification": kwargs.get("qualification"),
            "registration_number": kwargs.get("registrationNumber"),
            "department": kwargs.get("department"),
            "designation": kwargs.get("designation"),
            "hospital": kwargs.get("hospital"),
            "branch": kwargs.get("branch"),
            "mobile": kwargs.get("mobile"),
            "alternate_mobile": kwargs.get("alternateMobile"),
            "email": kwargs.get("email"),
            "address": kwargs.get("address"),
            "city": kwargs.get("city"),
            "state": kwargs.get("state"),
            "country": kwargs.get("country"),
            "postal_code": kwargs.get("postalCode"),
            "joining_date": kwargs.get("joiningDate"),
            "shift": kwargs.get("shift"),
            "manager": kwargs.get("manager"),
            "employment_type": kwargs.get("employmentType"),
            "experience": kwargs.get("experience"),
            "profilePhoto": kwargs.get("profilePhoto"),
            "nursingLicense": kwargs.get("nursingLicense"),
            "qualificationCertificate": kwargs.get("qualificationCertificate"),
            "idProof": kwargs.get("idProof"),
            "status": kwargs.get("status"),
            "remarks": kwargs.get("remarks"),
            "modified_by": kwargs.get("modifiedBy")
        }
        
        _call_sp(db, "UPDATE", nurse_id=nurse_id, **mapped)
        db.commit()

        fetch = _call_sp(db, "GETBYID", nurse_id=nurse_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Nurse not found after update")
        return _map_row(updated)
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /nurses/{nurse_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{nurse_id}", status_code=status.HTTP_200_OK)
def delete_nurse(nurse_id: int, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "DELETE", nurse_id=nurse_id)
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /nurses/{nurse_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
