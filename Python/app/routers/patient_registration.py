import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.patient_registration import (
    PatientRegistrationCreate, 
    PatientRegistrationUpdate, 
    PatientRegistrationResponse,
    OptionsResponse,
    TitleEnum, GenderEnum, MaritalStatusEnum, NationalIdTypeEnum,
    EmergencyRelationshipEnum, YesNoEnum, PatientTypeEnum,
    RegistrationSourceEnum, StatusEnum
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patients", tags=["Patient Registrations"])

SP_NAME = "registration.SpPatientRegistration"

def _call_sp(db: Session, opt: str, **kwargs) -> Any:
    """Execute SpPatientRegistration with the given p_Opt and field values."""
    params = {
        "p_Opt": opt,
        "p_PatientId": kwargs.get("PatientId", None),
        "p_RegistrationDate": kwargs.get("RegistrationDate", None),
        "p_Title": kwargs.get("Title", None),
        "p_PatientName": kwargs.get("PatientName", None),
        "p_Gender": kwargs.get("Gender", None),
        "p_DateOfBirth": kwargs.get("DateOfBirth", None),
        "p_Age": kwargs.get("Age", None),
        "p_MaritalStatus": kwargs.get("MaritalStatus", None),
        "p_BloodGroup": kwargs.get("BloodGroup", None),
        "p_Nationality": kwargs.get("Nationality", None),
        "p_Religion": kwargs.get("Religion", None),
        "p_Occupation": kwargs.get("Occupation", None),
        "p_MobileNumber": kwargs.get("MobileNumber", None),
        "p_AlternateMobile": kwargs.get("AlternateMobile", None),
        "p_Email": kwargs.get("Email", None),
        "p_Address1": kwargs.get("Address1", None),
        "p_Address2": kwargs.get("Address2", None),
        "p_Country": kwargs.get("Country", None),
        "p_State": kwargs.get("State", None),
        "p_District": kwargs.get("District", None),
        "p_City": kwargs.get("City", None),
        "p_PinCode": kwargs.get("PinCode", None),
        "p_AadhaarNumber": kwargs.get("AadhaarNumber", None),
        "p_PassportNumber": kwargs.get("PassportNumber", None),
        "p_PanNumber": kwargs.get("PanNumber", None),
        "p_DrivingLicense": kwargs.get("DrivingLicense", None),
        "p_NationalIdType": kwargs.get("NationalIdType", None),
        "p_NationalIdNumber": kwargs.get("NationalIdNumber", None),
        "p_EmergencyContactName": kwargs.get("EmergencyContactName", None),
        "p_EmergencyRelationship": kwargs.get("EmergencyRelationship", None),
        "p_EmergencyMobile": kwargs.get("EmergencyMobile", None),
        "p_EmergencyAlternateMobile": kwargs.get("EmergencyAlternateMobile", None),
        "p_EmergencyAddress": kwargs.get("EmergencyAddress", None),
        "p_Allergies": kwargs.get("Allergies", None),
        "p_ChronicDiseases": kwargs.get("ChronicDiseases", None),
        "p_CurrentMedication": kwargs.get("CurrentMedication", None),
        "p_OrganDonor": kwargs.get("OrganDonor", None),
        "p_Disability": kwargs.get("Disability", None),
        "p_InsuranceRequired": kwargs.get("InsuranceRequired", None),
        "p_InsuranceProvider": kwargs.get("InsuranceProvider", None),
        "p_Tpa": kwargs.get("Tpa", None),
        "p_PolicyNumber": kwargs.get("PolicyNumber", None),
        "p_ValidTill": kwargs.get("ValidTill", None),
        "p_PatientType": kwargs.get("PatientType", None),
        "p_ReferredBy": kwargs.get("ReferredBy", None),
        "p_PrimaryDoctor": kwargs.get("PrimaryDoctor", None),
        "p_Department": kwargs.get("Department", None),
        "p_RegistrationSource": kwargs.get("RegistrationSource", None),
        "p_PrivacyConsent": kwargs.get("PrivacyConsent", None),
        "p_SmsConsent": kwargs.get("SmsConsent", None),
        "p_EmailConsent": kwargs.get("EmailConsent", None),
        "p_WhatsappConsent": kwargs.get("WhatsappConsent", None),
        "p_Status": kwargs.get("Status", None),
        "p_Remarks": kwargs.get("Remarks", None),
        "p_CreatedBy": kwargs.get("CreatedBy", "Admin"),
        "p_ModifiedBy": kwargs.get("ModifiedBy", "Admin")
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_PatientId, :p_RegistrationDate, :p_Title, :p_PatientName, 
            :p_Gender, :p_DateOfBirth, :p_Age, :p_MaritalStatus, :p_BloodGroup, 
            :p_Nationality, :p_Religion, :p_Occupation, :p_MobileNumber, :p_AlternateMobile, 
            :p_Email, :p_Address1, :p_Address2, :p_Country, :p_State, 
            :p_District, :p_City, :p_PinCode, :p_AadhaarNumber, :p_PassportNumber, 
            :p_PanNumber, :p_DrivingLicense, :p_NationalIdType, :p_NationalIdNumber, 
            :p_EmergencyContactName, :p_EmergencyRelationship, :p_EmergencyMobile, 
            :p_EmergencyAlternateMobile, :p_EmergencyAddress, :p_Allergies, :p_ChronicDiseases, 
            :p_CurrentMedication, :p_OrganDonor, :p_Disability, :p_InsuranceRequired, 
            :p_InsuranceProvider, :p_Tpa, :p_PolicyNumber, :p_ValidTill, :p_PatientType, 
            :p_ReferredBy, :p_PrimaryDoctor, :p_Department, :p_RegistrationSource, 
            :p_PrivacyConsent, :p_SmsConsent, :p_EmailConsent, :p_WhatsappConsent, :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy
        )
    """)

    result = db.execute(sql, params)
    return result

def _map_row_to_dict(row) -> dict:
    """Helper to convert RowMapping to dict cleanly."""
    return dict(row._mapping)

@router.get("/options", response_model=OptionsResponse)
def get_options(db: Session = Depends(get_db)):
    """Fetch all dropdown options including Enums and dynamic Blood Groups."""
    try:
        # Fetch Blood Groups from admin.Master_BloodGroup
        blood_groups = []
        try:
            bg_sql = text("SELECT BloodGroup FROM admin.Master_BloodGroup WHERE Status = 'Active' OR Status IS NULL")
            bg_result = db.execute(bg_sql)
            blood_groups = [row[0] for row in bg_result.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching blood groups from admin.Master_BloodGroup: {e}")
            # Fallback if table doesn't exist
            blood_groups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]

        options = {
            "Title": [e.value for e in TitleEnum],
            "Gender": [e.value for e in GenderEnum],
            "MaritalStatus": [e.value for e in MaritalStatusEnum],
            "NationalIdType": [e.value for e in NationalIdTypeEnum],
            "EmergencyRelationship": [e.value for e in EmergencyRelationshipEnum],
            "YesNo": [e.value for e in YesNoEnum],
            "PatientType": [e.value for e in PatientTypeEnum],
            "RegistrationSource": [e.value for e in RegistrationSourceEnum],
            "Status": [e.value for e in StatusEnum],
            "BloodGroups": blood_groups
        }
        return options
    except Exception as e:
        logger.error(f"[GET /patients/options] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch options")


@router.get("/reports")
def get_registration_reports(start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    """Get analytics data for Registration Reports."""
    try:
        conn = db.connection()
        cursor = conn.connection.cursor()
        
        # Execute Stored Procedure
        cursor.execute("CALL registration.SpGetRegistrationReports(%s, %s)", (start_date, end_date))
        
        # 1. KPIs
        kpi_row = cursor.fetchone()
        kpis = {
            "totalRegistrations": kpi_row[0] if kpi_row else 0,
            "opPatients": kpi_row[1] if kpi_row else 0,
            "emergencyPatients": kpi_row[2] if kpi_row else 0,
            "ipPatients": kpi_row[3] if kpi_row else 0
        }
        
        # 2. Demographics
        cursor.nextset()
        demo_rows = cursor.fetchall()
        demographics = {row[0]: row[1] for row in demo_rows}
        
        # 3. Trends
        cursor.nextset()
        trend_rows = cursor.fetchall()
        trends = [{"date": row[0].isoformat() if row[0] else "", "count": row[1]} for row in trend_rows]
        
        # 4. Recent Registrations
        cursor.nextset()
        recent_rows = cursor.fetchall()
        recent = []
        for row in recent_rows:
            recent.append({
                "uhid": row[0],
                "patientName": row[1],
                "registrationDate": row[2].isoformat() if row[2] else "",
                "patientType": row[3],
                "status": row[4]
            })
            
        cursor.close()
        
        return {
            "kpis": kpis,
            "demographics": demographics,
            "trends": trends,
            "recent": recent
        }
    except Exception as e:
        logger.error(f"Error fetching registration reports: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[PatientRegistrationResponse])
def get_all_patients(db: Session = Depends(get_db)):
    """Retrieve all patients."""
    try:
        result = _call_sp(db, "SELECT_ALL")
        rows = result.fetchall()
        return [_map_row_to_dict(r) for r in rows]
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"[GET /patients/] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/today")
def get_today_registrations(db: Session = Depends(get_db)):
    sql = text("CALL registration.SpGetTodayRegistrations()")
    result = db.execute(sql)
    rows = result.mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        if "RegistrationTime" in d and d["RegistrationTime"] is not None:
            d["RegistrationTime"] = str(d["RegistrationTime"])
        out.append(d)
    return out

@router.get("/next-uhid")
def get_next_uhid(db: Session = Depends(get_db)):
    """Preview the UHID the next registration will get.

    Mirrors SpPatientRegistration exactly: UHID-<year>-<PatientId>, where the
    PatientId is the table's next AUTO_INCREMENT. Declared BEFORE /{patient_id}
    so "next-uhid" isn't parsed as an id. Provisional — the definitive UHID is
    still assigned by the stored procedure on insert.
    """
    try:
        year = db.execute(text("SELECT YEAR(CURDATE())")).scalar()
        nxt = db.execute(text(
            "SELECT AUTO_INCREMENT FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = 'registration' AND TABLE_NAME = 'PatientRegistration'"
        )).scalar()
        if not nxt:
            nxt = db.execute(text(
                "SELECT COALESCE(MAX(PatientId), 0) + 1 FROM registration.PatientRegistration"
            )).scalar()
        seq = int(nxt or 1)
        return {"uhid": f"UHID-{year}-{seq:04d}", "nextId": seq}
    except Exception as e:
        logger.error(f"[GET /patients/next-uhid] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate next UHID")


@router.get("/{patient_id}", response_model=PatientRegistrationResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific patient by ID."""
    try:
        result = _call_sp(db, "SELECT_BY_ID", PatientId=patient_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Patient not found")
        return _map_row_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /patients/{patient_id}] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch patient")

@router.post("/", response_model=PatientRegistrationResponse)
def create_patient(data: PatientRegistrationCreate, db: Session = Depends(get_db)):
    """Create a new patient registration."""
    try:
        kwargs = data.model_dump()
        result = _call_sp(db, "INSERT", **kwargs)
        row = result.fetchone()
        db.commit()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create patient")
        return _map_row_to_dict(row)
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /patients/] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create patient")

@router.put("/{patient_id}", response_model=PatientRegistrationResponse)
def update_patient(patient_id: int, data: PatientRegistrationUpdate, db: Session = Depends(get_db)):
    """Update an existing patient registration."""
    try:
        # First check if exists
        check_result = _call_sp(db, "SELECT_BY_ID", PatientId=patient_id)
        if not check_result.fetchone():
            raise HTTPException(status_code=404, detail="Patient not found")

        kwargs = data.model_dump()
        kwargs["PatientId"] = patient_id
        
        result = _call_sp(db, "UPDATE", **kwargs)
        row = result.fetchone()
        db.commit()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to update patient")
        return _map_row_to_dict(row)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /patients/{patient_id}] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update patient")

@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    """Delete a patient registration."""
    try:
        # Check exists
        check_result = _call_sp(db, "SELECT_BY_ID", PatientId=patient_id)
        if not check_result.fetchone():
            raise HTTPException(status_code=404, detail="Patient not found")
            
        result = _call_sp(db, "DELETE", PatientId=patient_id)
        row = result.fetchone()
        db.commit()
        
        affected = row[0] if row else 0
        if affected == 0:
            raise HTTPException(status_code=500, detail="Failed to delete patient")
            
        return {"message": "Patient deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /patients/{patient_id}] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete patient")
