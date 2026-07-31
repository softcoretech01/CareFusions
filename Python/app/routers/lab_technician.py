from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import logging

from app.database import get_db
from app.schemas.lab_technician import LabTechnicianCreate, LabTechnicianUpdate, LabTechnicianResponse

router = APIRouter(prefix="/lab-technicians", tags=["Lab Technicians"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterLabTechnician"

def safe_value(val):
    if val == "": return None
    return val

def _map_row(row):
    return {
        "id": row.TechnicianId,
        "technicianId": row.TechnicianCode,
        "employeeCode": row.EmployeeCode,
        "name": row.TechnicianName,
        "qualification": row.Qualification,
        "department": row.DepartmentName,
        "laboratory": row.LaboratoryName,
        "hospital": row.HospitalName,
        "branch": row.BranchName,
        "mobile": row.Mobile,
        "email": row.Email,
        "address": row.Address,
        "joiningDate": row.JoiningDate,
        "experience": row.ExperienceYears,
        "shift": row.Shift,
        "manager": row.ReportingManager,
        "profilePhoto": row.ProfilePhoto,
        "qualificationCertificate": row.QualificationCertificate,
        "idProof": row.IdProof,
        "status": row.Status,
        "remarks": row.Remarks,
        "createdBy": row.CreatedBy,
        "createdDate": row.CreatedDate,
        "modifiedBy": row.ModifiedBy,
        "modifiedDate": row.ModifiedDate
    }

def _call_sp(db: Session, opt: str, technician_id: int = 0, **kwargs):
    params = {
        "p_Opt": opt,
        "p_TechnicianId": technician_id,
        "p_EmployeeCode": safe_value(kwargs.get("employee_code")),
        "p_TechnicianName": safe_value(kwargs.get("name")),
        "p_Qualification": safe_value(kwargs.get("qualification")),
        "p_DepartmentName": safe_value(kwargs.get("department")),
        "p_LaboratoryName": safe_value(kwargs.get("laboratory")),
        "p_HospitalName": safe_value(kwargs.get("hospital")),
        "p_BranchName": safe_value(kwargs.get("branch")),
        "p_Mobile": safe_value(kwargs.get("mobile")),
        "p_Email": safe_value(kwargs.get("email")),
        "p_Address": safe_value(kwargs.get("address")),
        "p_JoiningDate": safe_value(kwargs.get("joining_date")),
        "p_ExperienceYears": safe_value(kwargs.get("experience")),
        "p_Shift": safe_value(kwargs.get("shift")),
        "p_ReportingManager": safe_value(kwargs.get("manager")),
        "p_ProfilePhoto": safe_value(kwargs.get("profilePhoto")),
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
            :p_Opt, :p_TechnicianId,
            :p_EmployeeCode, :p_TechnicianName, :p_Qualification, :p_DepartmentName,
            :p_LaboratoryName, :p_HospitalName, :p_BranchName, :p_Mobile, :p_Email, :p_Address,
            :p_JoiningDate, :p_ExperienceYears, :p_Shift, :p_ReportingManager,
            :p_ProfilePhoto, :p_QualificationCertificate, :p_IdProof,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


@router.get("/", response_model=List[LabTechnicianResponse])
def get_all_lab_technicians(search: str = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(row) for row in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /lab-technicians] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{technician_id}", response_model=LabTechnicianResponse)
def get_lab_technician(technician_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", technician_id=technician_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Lab Technician not found")
        return _map_row(row)
    except HTTPException: raise
    except Exception as e:
        logger.error(f"[GET /lab-technicians/{technician_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=LabTechnicianResponse, status_code=status.HTTP_201_CREATED)
def create_lab_technician(technician: LabTechnicianCreate, db: Session = Depends(get_db)):
    try:
        kwargs = technician.model_dump(by_alias=False)
        mapped = {
            "employee_code": kwargs["employeeCode"],
            "name": kwargs["name"],
            "qualification": kwargs["qualification"],
            "department": kwargs["department"],
            "laboratory": kwargs["laboratory"],
            "hospital": kwargs["hospital"],
            "branch": kwargs["branch"],
            "mobile": kwargs["mobile"],
            "email": kwargs["email"],
            "address": kwargs["address"],
            "joining_date": kwargs["joiningDate"],
            "experience": kwargs["experience"],
            "shift": kwargs["shift"],
            "manager": kwargs["manager"],
            "profilePhoto": kwargs["profilePhoto"],
            "qualificationCertificate": kwargs["qualificationCertificate"],
            "idProof": kwargs["idProof"],
            "status": kwargs["status"],
            "remarks": kwargs["remarks"],
            "created_by": kwargs["createdBy"]
        }
        
        result = _call_sp(db, "INSERT", **mapped)
        row = result.fetchone()
        new_id = row.TechnicianId
        db.commit()

        fetch = _call_sp(db, "GETBYID", technician_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /lab-technicians] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{technician_id}", response_model=LabTechnicianResponse)
def update_lab_technician(technician_id: int, technician: LabTechnicianUpdate, db: Session = Depends(get_db)):
    try:
        kwargs = technician.model_dump(by_alias=False)
        mapped = {
            "employee_code": kwargs["employeeCode"],
            "name": kwargs["name"],
            "qualification": kwargs["qualification"],
            "department": kwargs["department"],
            "laboratory": kwargs["laboratory"],
            "hospital": kwargs["hospital"],
            "branch": kwargs["branch"],
            "mobile": kwargs["mobile"],
            "email": kwargs["email"],
            "address": kwargs["address"],
            "joining_date": kwargs["joiningDate"],
            "experience": kwargs["experience"],
            "shift": kwargs["shift"],
            "manager": kwargs["manager"],
            "profilePhoto": kwargs["profilePhoto"],
            "qualificationCertificate": kwargs["qualificationCertificate"],
            "idProof": kwargs["idProof"],
            "status": kwargs["status"],
            "remarks": kwargs["remarks"],
            "modified_by": kwargs["modifiedBy"]
        }
        
        _call_sp(db, "UPDATE", technician_id=technician_id, **mapped)
        db.commit()

        fetch = _call_sp(db, "GETBYID", technician_id=technician_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Lab Technician not found after update")
        return _map_row(updated)
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /lab-technicians/{technician_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{technician_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_technician(technician_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", technician_id=technician_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Lab Technician not found")

        _call_sp(db, "DELETE", technician_id=technician_id, modified_by="System")
        db.commit()
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /lab-technicians/{technician_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
