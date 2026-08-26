from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.database import get_db
from app.schemas.emergency_registration import (
    EmergencyRegistrationCreate,
    EmergencyRegistrationUpdate,
    EmergencyRegistrationResponse,
    EmergencyRegistrationOptions,
    EmergencyGenderEnum, EmergencyStatusEnum
)

router = APIRouter(prefix="/emergency-registrations", tags=["Emergency Registrations"])

SP_NAME = "SpEmergencyRegistration"

def _call_sp(db: Session, opt: str, payload: dict = None, record_id: int = None):
    params = {
        "p_Opt": opt,
        "p_EmergencyRegistrationId": record_id if record_id else None,
        "p_RegistrationDate": payload.get("RegistrationDate") if payload else None,
        "p_RegistrationTime": payload.get("RegistrationTime") if payload else None,
        "p_PatientName": payload.get("PatientName") if payload else None,
        "p_Gender": payload.get("Gender") if payload else None,
        "p_ApproximateAge": payload.get("ApproximateAge") if payload else 0,
        "p_EmergencyContactName": payload.get("EmergencyContactName") if payload else None,
        "p_EmergencyContactPhone": payload.get("EmergencyContactPhone") if payload else None,
        "p_InsuranceRequired": payload.get("InsuranceRequired") if payload else None,
        "p_InsuranceProvider": payload.get("InsuranceProvider") if payload else None,
        "p_Tpa": payload.get("Tpa") if payload else None,
        "p_PolicyNumber": payload.get("PolicyNumber") if payload else None,
        "p_ValidTill": payload.get("ValidTill") if payload else None,
        "p_Status": payload.get("Status") if payload else None,
        "p_CreatedBy": payload.get("CreatedBy") if payload else None,
        "p_ModifiedBy": payload.get("ModifiedBy") if payload else None
    }
    
    sql = text(f"""
        CALL registration.{SP_NAME}(
            :p_Opt, :p_EmergencyRegistrationId, :p_RegistrationDate, :p_RegistrationTime,
            :p_PatientName, :p_Gender, :p_ApproximateAge, :p_EmergencyContactName,
            :p_EmergencyContactPhone, :p_InsuranceRequired, :p_InsuranceProvider,
            :p_Tpa, :p_PolicyNumber, :p_ValidTill, :p_Status, :p_CreatedBy, :p_ModifiedBy
        )
    """)
    result = db.execute(sql, params)
    db.commit()
    
    if opt in ["SELECT_ALL", "SELECT_BY_ID", "INSERT", "UPDATE"]:
        rows = result.mappings().all()
        out = []
        for r in rows:
            d = dict(r)
            if "RegistrationTime" in d and d["RegistrationTime"] is not None:
                d["RegistrationTime"] = str(d["RegistrationTime"])
            out.append(d)
        return out
    return None

@router.get("/options", response_model=EmergencyRegistrationOptions)
def get_options():
    return EmergencyRegistrationOptions(
        Gender=[e.value for e in EmergencyGenderEnum],
        Status=[e.value for e in EmergencyStatusEnum]
    )

@router.get("/", response_model=List[EmergencyRegistrationResponse])
def get_emergency_registrations(db: Session = Depends(get_db)):
    rows = _call_sp(db, "SELECT_ALL")
    return rows

@router.get("/{id}", response_model=EmergencyRegistrationResponse)
def get_emergency_registration(id: int, db: Session = Depends(get_db)):
    rows = _call_sp(db, "SELECT_BY_ID", record_id=id)
    if not rows:
        raise HTTPException(status_code=404, detail="Record not found")
    return dict(rows[0])

@router.post("/", response_model=EmergencyRegistrationResponse)
def create_emergency_registration(payload: EmergencyRegistrationCreate, db: Session = Depends(get_db)):
    rows = _call_sp(db, "INSERT", payload=payload.model_dump())
    return dict(rows[0])

@router.put("/{id}", response_model=EmergencyRegistrationResponse)
def update_emergency_registration(id: int, payload: EmergencyRegistrationUpdate, db: Session = Depends(get_db)):
    rows = _call_sp(db, "UPDATE", payload=payload.model_dump(), record_id=id)
    if not rows:
        raise HTTPException(status_code=404, detail="Record not found")
    return dict(rows[0])

@router.delete("/{id}")
def delete_emergency_registration(id: int, db: Session = Depends(get_db)):
    _call_sp(db, "DELETE", record_id=id)
    return {"message": "Deleted successfully"}
