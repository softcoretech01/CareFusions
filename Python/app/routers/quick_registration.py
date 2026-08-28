from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.database import get_db
from app.schemas.quick_registration import (
    QuickRegistrationCreate,
    QuickRegistrationUpdate,
    QuickRegistrationResponse,
    QuickRegistrationOptions,
    TitleEnum, GenderEnum, YesNoEnum, PriorityEnum, VisitTypeEnum, StatusEnum, PaymentModeEnum
)

router = APIRouter(prefix="/quick-registrations", tags=["Quick Registrations"])

SP_NAME = "SpQuickRegistration"

def _call_sp(db: Session, opt: str, payload: dict = None, record_id: int = None):
    # Ensure all 24 parameters required by the SP are passed
    params = {
        "p_Opt": opt,
        "p_QuickRegistrationId": record_id if record_id else None,
        "p_RegistrationDate": payload.get("RegistrationDate") if payload else None,
        "p_RegistrationTime": payload.get("RegistrationTime") if payload else None,
        "p_Title": payload.get("Title") if payload else None,
        "p_PatientName": payload.get("PatientName") if payload else None,
        "p_Gender": payload.get("Gender") if payload else None,
        "p_DateOfBirth": payload.get("DateOfBirth") if payload else None,
        "p_Age": payload.get("Age") if payload else 0,
        "p_MobileNumber": payload.get("MobileNumber") if payload else None,
        "p_AlternateMobile": payload.get("AlternateMobile") if payload else None,
        "p_VisitType": payload.get("VisitType") if payload else None,
        "p_Department": payload.get("Department") if payload else None,
        "p_Doctor": payload.get("Doctor") if payload else None,
        "p_Priority": payload.get("Priority") if payload else None,
        "p_VisitReason": payload.get("VisitReason") if payload else None,
        "p_ConsultationRequired": payload.get("ConsultationRequired") if payload else None,
        "p_ConsultationFee": payload.get("ConsultationFee") if payload else 0.0,
        "p_PaymentMode": payload.get("PaymentMode") if payload else None,
        "p_InsuranceRequired": payload.get("InsuranceRequired") if payload else None,
        "p_InsuranceProvider": payload.get("InsuranceProvider") if payload else None,
        "p_Tpa": payload.get("Tpa") if payload else None,
        "p_PolicyNumber": payload.get("PolicyNumber") if payload else None,
        "p_ValidTill": payload.get("ValidTill") if payload else None,
        "p_Status": payload.get("Status") if payload else None,
        "p_Remarks": payload.get("Remarks") if payload else None,
        "p_CreatedBy": payload.get("CreatedBy") if payload else None,
        "p_ModifiedBy": payload.get("ModifiedBy") if payload else None
    }
    
    sql = text(f"""
        CALL registration.{SP_NAME}(
            :p_Opt, :p_QuickRegistrationId, :p_RegistrationDate, :p_RegistrationTime, :p_Title,
            :p_PatientName, :p_Gender, :p_DateOfBirth, :p_Age, :p_MobileNumber,
            :p_AlternateMobile, :p_VisitType, :p_Department, :p_Doctor, :p_Priority,
            :p_VisitReason, :p_ConsultationRequired, :p_ConsultationFee, :p_PaymentMode,
            :p_InsuranceRequired, :p_InsuranceProvider, :p_Tpa, :p_PolicyNumber, :p_ValidTill,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy
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

@router.get("/options", response_model=QuickRegistrationOptions)
def get_options(db: Session = Depends(get_db)):
    departments = []
    doctors = []
    
    try:
        dept_res = db.execute(text("SELECT DepartmentName FROM admin.Master_Department WHERE Status = 'Active' OR Status = 'ACTIVE'"))
        departments = [row[0] for row in dept_res.fetchall()]
    except Exception as e:
        print("Error fetching departments:", e)
        
    try:
        doc_res = db.execute(text("SELECT DoctorName FROM admin.Master_Doctor_Header WHERE Status = 'Active' OR Status = 'ACTIVE'"))
        doctors = [row[0] for row in doc_res.fetchall()]
    except Exception as e:
        print("Error fetching doctors:", e)

    return QuickRegistrationOptions(
        Title=[e.value for e in TitleEnum],
        Gender=[e.value for e in GenderEnum],
        YesNo=[e.value for e in YesNoEnum],
        Priority=[e.value for e in PriorityEnum],
        VisitType=[e.value for e in VisitTypeEnum],
        Status=[e.value for e in StatusEnum],
        PaymentMode=[e.value for e in PaymentModeEnum],
        Departments=departments,
        Doctors=doctors
    )

@router.get("/", response_model=List[QuickRegistrationResponse])
def get_quick_registrations(db: Session = Depends(get_db)):
    rows = _call_sp(db, "SELECT_ALL")
    return rows

@router.get("/next-uhid")
def get_next_uhid(db: Session = Depends(get_db)):
    """Preview the UHID the next quick registration will get.

    Mirrors SpQuickRegistration: UHID-<year>-<QuickRegistrationId>, where the id
    is the table's next AUTO_INCREMENT. Declared BEFORE /{id} so "next-uhid" is
    not parsed as an id. Provisional — the definitive UHID is assigned on insert.
    """
    try:
        year = db.execute(text("SELECT YEAR(CURDATE())")).scalar()
        nxt = db.execute(text(
            "SELECT AUTO_INCREMENT FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = 'registration' AND TABLE_NAME = 'QuickRegistration'"
        )).scalar()
        if not nxt:
            nxt = db.execute(text(
                "SELECT COALESCE(MAX(QuickRegistrationId), 0) + 1 FROM registration.QuickRegistration"
            )).scalar()
        seq = int(nxt or 1)
        return {"uhid": f"UHID-{year}-{seq:04d}", "nextId": seq}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate next UHID")


@router.get("/{id}", response_model=QuickRegistrationResponse)
def get_quick_registration(id: int, db: Session = Depends(get_db)):
    rows = _call_sp(db, "SELECT_BY_ID", record_id=id)
    if not rows:
        raise HTTPException(status_code=404, detail="Record not found")
    return dict(rows[0])

@router.post("/", response_model=QuickRegistrationResponse)
def create_quick_registration(payload: QuickRegistrationCreate, db: Session = Depends(get_db)):
    rows = _call_sp(db, "INSERT", payload=payload.model_dump())
    return dict(rows[0])

@router.put("/{id}", response_model=QuickRegistrationResponse)
def update_quick_registration(id: int, payload: QuickRegistrationUpdate, db: Session = Depends(get_db)):
    rows = _call_sp(db, "UPDATE", payload=payload.model_dump(), record_id=id)
    if not rows:
        raise HTTPException(status_code=404, detail="Record not found")
    return dict(rows[0])

@router.delete("/{id}")
def delete_quick_registration(id: int, db: Session = Depends(get_db)):
    _call_sp(db, "DELETE", record_id=id)
    return {"message": "Deleted successfully"}
