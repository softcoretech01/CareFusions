from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import logging

from app.database import get_db
from app.schemas.pharmacist import PharmacistCreate, PharmacistUpdate, PharmacistResponse

router = APIRouter(prefix="/pharmacists", tags=["Pharmacists"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterPharmacist"

def safe_value(val):
    if val == "": return None
    return val

def _map_row(row):
    return {
        "id": row.PharmacistId,
        "pharmacistId": row.PharmacistCode,
        "employeeCode": row.EmployeeCode,
        "name": row.PharmacistName,
        "licenseNumber": row.LicenseNumber,
        "qualification": row.Qualification,
        "hospital": row.HospitalName,
        "branch": row.BranchName,
        "pharmacy": row.PharmacyName,
        "mobile": row.Mobile,
        "email": row.Email,
        "address": row.Address,
        "joiningDate": row.JoiningDate,
        "experience": row.ExperienceYears,
        "shift": row.Shift,
        "employmentType": row.EmploymentType,
        "photo": row.Photo,
        "licenseCertificate": row.LicenseCertificate,
        "idProof": row.IdProof,
        "status": row.Status,
        "remarks": row.Remarks,
        "createdBy": row.CreatedBy,
        "createdDate": row.CreatedDate,
        "modifiedBy": row.ModifiedBy,
        "modifiedDate": row.ModifiedDate
    }

def _call_sp(db: Session, opt: str, pharmacist_id: int = 0, **kwargs):
    params = {
        "p_Opt": opt,
        "p_PharmacistId": pharmacist_id,
        "p_EmployeeCode": safe_value(kwargs.get("employee_code")),
        "p_PharmacistName": safe_value(kwargs.get("name")),
        "p_LicenseNumber": safe_value(kwargs.get("license_number")),
        "p_Qualification": safe_value(kwargs.get("qualification")),
        "p_HospitalName": safe_value(kwargs.get("hospital")),
        "p_BranchName": safe_value(kwargs.get("branch")),
        "p_PharmacyName": safe_value(kwargs.get("pharmacy")),
        "p_Mobile": safe_value(kwargs.get("mobile")),
        "p_Email": safe_value(kwargs.get("email")),
        "p_Address": safe_value(kwargs.get("address")),
        "p_JoiningDate": safe_value(kwargs.get("joining_date")),
        "p_ExperienceYears": safe_value(kwargs.get("experience")),
        "p_Shift": safe_value(kwargs.get("shift")),
        "p_EmploymentType": safe_value(kwargs.get("employment_type")),
        "p_Photo": safe_value(kwargs.get("photo")),
        "p_LicenseCertificate": safe_value(kwargs.get("licenseCertificate")),
        "p_IdProof": safe_value(kwargs.get("idProof")),
        "p_Status": safe_value(kwargs.get("status")),
        "p_Remarks": safe_value(kwargs.get("remarks")),
        "p_CreatedBy": safe_value(kwargs.get("created_by")),
        "p_ModifiedBy": safe_value(kwargs.get("modified_by")),
        "p_Search": safe_value(kwargs.get("search"))
    }
    
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_PharmacistId,
            :p_EmployeeCode, :p_PharmacistName, :p_LicenseNumber, :p_Qualification,
            :p_HospitalName, :p_BranchName, :p_PharmacyName, :p_Mobile, :p_Email, :p_Address,
            :p_JoiningDate, :p_ExperienceYears, :p_Shift, :p_EmploymentType,
            :p_Photo, :p_LicenseCertificate, :p_IdProof,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


@router.get("/", response_model=List[PharmacistResponse])
def get_all_pharmacists(search: str = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(row) for row in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /pharmacists] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{pharmacist_id}", response_model=PharmacistResponse)
def get_pharmacist(pharmacist_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", pharmacist_id=pharmacist_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pharmacist not found")
        return _map_row(row)
    except HTTPException: raise
    except Exception as e:
        logger.error(f"[GET /pharmacists/{pharmacist_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=PharmacistResponse, status_code=status.HTTP_201_CREATED)
def create_pharmacist(pharmacist: PharmacistCreate, db: Session = Depends(get_db)):
    try:
        kwargs = pharmacist.model_dump(by_alias=False)
        mapped = {
            "employee_code": kwargs.get("employeeCode"),
            "name": kwargs.get("name"),
            "license_number": kwargs.get("licenseNumber"),
            "qualification": kwargs.get("qualification"),
            "hospital": kwargs.get("hospital"),
            "branch": kwargs.get("branch"),
            "pharmacy": kwargs.get("pharmacy"),
            "mobile": kwargs.get("mobile"),
            "email": kwargs.get("email"),
            "address": kwargs.get("address"),
            "joining_date": kwargs.get("joiningDate"),
            "experience": kwargs.get("experience"),
            "shift": kwargs.get("shift"),
            "employment_type": kwargs.get("employmentType"),
            "photo": kwargs.get("photo"),
            "licenseCertificate": kwargs.get("licenseCertificate"),
            "idProof": kwargs.get("idProof"),
            "status": kwargs.get("status"),
            "remarks": kwargs.get("remarks"),
            "created_by": kwargs.get("createdBy")
        }
        
        result = _call_sp(db, "INSERT", **mapped)
        row = result.fetchone()
        new_id = row.PharmacistId
        db.commit()

        fetch = _call_sp(db, "GETBYID", pharmacist_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /pharmacists] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{pharmacist_id}", response_model=PharmacistResponse)
def update_pharmacist(pharmacist_id: int, pharmacist: PharmacistUpdate, db: Session = Depends(get_db)):
    try:
        kwargs = pharmacist.model_dump(by_alias=False)
        mapped = {
            "employee_code": kwargs.get("employeeCode"),
            "name": kwargs.get("name"),
            "license_number": kwargs.get("licenseNumber"),
            "qualification": kwargs.get("qualification"),
            "hospital": kwargs.get("hospital"),
            "branch": kwargs.get("branch"),
            "pharmacy": kwargs.get("pharmacy"),
            "mobile": kwargs.get("mobile"),
            "email": kwargs.get("email"),
            "address": kwargs.get("address"),
            "joining_date": kwargs.get("joiningDate"),
            "experience": kwargs.get("experience"),
            "shift": kwargs.get("shift"),
            "employment_type": kwargs.get("employmentType"),
            "photo": kwargs.get("photo"),
            "licenseCertificate": kwargs.get("licenseCertificate"),
            "idProof": kwargs.get("idProof"),
            "status": kwargs.get("status"),
            "remarks": kwargs.get("remarks"),
            "modified_by": kwargs.get("modifiedBy")
        }
        
        _call_sp(db, "UPDATE", pharmacist_id=pharmacist_id, **mapped)
        db.commit()

        fetch = _call_sp(db, "GETBYID", pharmacist_id=pharmacist_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Pharmacist not found after update")
        return _map_row(updated)
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /pharmacists/{pharmacist_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{pharmacist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pharmacist(pharmacist_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", pharmacist_id=pharmacist_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Pharmacist not found")

        _call_sp(db, "DELETE", pharmacist_id=pharmacist_id, modified_by="System")
        db.commit()
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /pharmacists/{pharmacist_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
