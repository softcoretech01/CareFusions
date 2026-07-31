import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from decimal import Decimal
from datetime import time

from app.database import get_db
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/doctors", tags=["Doctor Master"])

SP_NAME = "SpMasterDoctor"

def _call_sp(db: Session, opt: str, **kwargs):
    """Execute SpMasterDoctor with the given parameters."""
    # Ensure times are strings for SP, and Enums are strings
    def safe_value(val):
        if val is None: return None
        if hasattr(val, 'value'): return val.value
        if isinstance(val, time): return val.strftime("%H:%M:%S")
        if isinstance(val, bool): return 1 if val else 0
        return val

    params = {
        "p_Opt": opt,
        "p_DoctorId": kwargs.get("doctor_id"),
        "p_RegistrationNumber": safe_value(kwargs.get("registration_number")),
        "p_DoctorName": safe_value(kwargs.get("name")),
        "p_Gender": safe_value(kwargs.get("gender")),
        "p_DateOfBirth": safe_value(kwargs.get("dob")),
        "p_Mobile": safe_value(kwargs.get("mobile")),
        "p_AlternateMobile": safe_value(kwargs.get("alternate_mobile")),
        "p_Email": safe_value(kwargs.get("email")),
        "p_Address1": safe_value(kwargs.get("address1")),
        "p_Address2": safe_value(kwargs.get("address2")),
        "p_City": safe_value(kwargs.get("city")),
        "p_State": safe_value(kwargs.get("state")),
        "p_Country": safe_value(kwargs.get("country")),
        "p_PostalCode": safe_value(kwargs.get("postal_code")),
        
        "p_Qualification": safe_value(kwargs.get("qualification")),
        "p_Specialization": safe_value(kwargs.get("specialization")),
        "p_HospitalName": safe_value(kwargs.get("hospital")),
        "p_BranchName": safe_value(kwargs.get("branch")),
        "p_DepartmentName": safe_value(kwargs.get("department")),
        "p_Designation": safe_value(kwargs.get("designation")),
        "p_MedicalCouncil": safe_value(kwargs.get("medical_council")),
        "p_Experience": safe_value(kwargs.get("experience")),
        "p_Languages": safe_value(kwargs.get("languages")),
        "p_DoctorType": safe_value(kwargs.get("doctor_type")),
        "p_ConsultationType": safe_value(kwargs.get("consultation_type")),
        "p_JoiningDate": safe_value(kwargs.get("joining_date")),
        "p_LicenseExpiryDate": safe_value(kwargs.get("license_expiry_date")),
        
        "p_ConsultationFee": safe_value(kwargs.get("consultation_fee")),
        "p_FollowUpFee": safe_value(kwargs.get("follow_up_fee")),
        "p_EmergencyFee": safe_value(kwargs.get("emergency_fee")),
        "p_TeleConsultationFee": safe_value(kwargs.get("tele_consultation_fee")),
        "p_OpDuration": safe_value(kwargs.get("op_duration")),
        "p_MaxPatients": safe_value(kwargs.get("max_patients")),
        "p_AllowOnlineBooking": safe_value(kwargs.get("allow_online_booking")),
        
        "p_AvailableDays": safe_value(kwargs.get("available_days")),
        "p_FromTime": safe_value(kwargs.get("from_time")),
        "p_ToTime": safe_value(kwargs.get("to_time")),
        "p_BreakFrom": safe_value(kwargs.get("break_from")),
        "p_BreakTo": safe_value(kwargs.get("break_to")),
        "p_SlotDuration": safe_value(kwargs.get("slot_duration")),
        "p_AvailableEmergency": safe_value(kwargs.get("available_emergency")),
        "p_AvailableTele": safe_value(kwargs.get("available_tele")),
        
        "p_DoctorPhoto": safe_value(kwargs.get("doctor_photo")),
        "p_SignatureImage": safe_value(kwargs.get("signature_image")),
        "p_DigitalSignature": safe_value(kwargs.get("digital_signature")),
        "p_RegistrationCertificate": safe_value(kwargs.get("registration_certificate")),
        
        "p_Status": safe_value(kwargs.get("status")),
        "p_Remarks": safe_value(kwargs.get("remarks")),
        "p_CreatedBy": safe_value(kwargs.get("created_by")),
        "p_ModifiedBy": safe_value(kwargs.get("modified_by")),
        
        "p_Search": safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_DoctorId,
            :p_RegistrationNumber, :p_DoctorName, :p_Gender, :p_DateOfBirth, :p_Mobile, :p_AlternateMobile, :p_Email,
            :p_Address1, :p_Address2, :p_City, :p_State, :p_Country, :p_PostalCode,
            :p_Qualification, :p_Specialization, :p_HospitalName, :p_BranchName, :p_DepartmentName, :p_Designation,
            :p_MedicalCouncil, :p_Experience, :p_Languages, :p_DoctorType, :p_ConsultationType, :p_JoiningDate, :p_LicenseExpiryDate,
            :p_ConsultationFee, :p_FollowUpFee, :p_EmergencyFee, :p_TeleConsultationFee, :p_OpDuration, :p_MaxPatients, :p_AllowOnlineBooking,
            :p_AvailableDays, :p_FromTime, :p_ToTime, :p_BreakFrom, :p_BreakTo, :p_SlotDuration, :p_AvailableEmergency, :p_AvailableTele,
            :p_DoctorPhoto, :p_SignatureImage, :p_DigitalSignature, :p_RegistrationCertificate,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    def to_time(t):
        if not t: return None
        # if it's a timedelta (which mysql sometimes returns for TIME), convert it
        import datetime
        if isinstance(t, datetime.timedelta):
            s = t.total_seconds()
            return datetime.time(int(s // 3600), int((s % 3600) // 60), int(s % 60))
        return t

    return {
        "id": row.DoctorId,
        "doctorId": row.DoctorCode,
        "registrationNumber": row.RegistrationNumber,
        "name": row.DoctorName,
        "gender": row.Gender,
        "dob": row.DateOfBirth,
        "mobile": row.Mobile,
        "alternateMobile": row.AlternateMobile,
        "email": row.Email,
        "address1": row.Address1,
        "address2": row.Address2,
        "city": row.City,
        "state": row.State,
        "country": row.Country,
        "postalCode": row.PostalCode,
        
        "qualification": row.Qualification,
        "specialization": row.Specialization,
        "hospital": row.HospitalName,
        "branch": row.BranchName,
        "department": row.DepartmentName,
        "designation": row.Designation,
        "medicalCouncil": row.MedicalCouncil,
        "experience": row.Experience,
        "languages": row.Languages,
        "doctorType": row.DoctorType,
        "consultationType": row.ConsultationType,
        "joiningDate": row.JoiningDate,
        "licenseExpiryDate": row.LicenseExpiryDate,
        
        "consultationFee": float(row.ConsultationFee) if row.ConsultationFee else 0,
        "followUpFee": float(row.FollowUpFee) if row.FollowUpFee is not None else None,
        "emergencyFee": float(row.EmergencyFee) if row.EmergencyFee is not None else None,
        "teleConsultationFee": float(row.TeleConsultationFee) if row.TeleConsultationFee is not None else None,
        "opDuration": row.OpDuration,
        "maxPatients": row.MaxPatients,
        "allowOnlineBooking": bool(row.AllowOnlineBooking),
        
        "availableDays": row.AvailableDays,
        "fromTime": to_time(row.FromTime),
        "toTime": to_time(row.ToTime),
        "breakFrom": to_time(row.BreakFrom),
        "breakTo": to_time(row.BreakTo),
        "slotDuration": row.SlotDuration,
        "availableEmergency": bool(row.AvailableEmergency),
        "availableTele": bool(row.AvailableTele),
        
        "doctorPhoto": row.DoctorPhoto,
        "signatureImage": row.SignatureImage,
        "digitalSignature": row.DigitalSignature,
        "registrationCertificate": row.RegistrationCertificate,
        
        "status": row.Status,
        "remarks": row.Remarks,
        "createdDate": row.CreatedDate,
        "modifiedDate": row.ModifiedDate,
    }

@router.get("/", response_model=List[DoctorResponse])
def get_doctors(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GET", search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /doctors] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor_by_id(doctor_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", doctor_id=doctor_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Doctor not found")
        return _map_row(row)
    except HTTPException: raise
    except Exception as e:
        logger.error(f"[GET /doctors/{doctor_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)):
    try:
        kwargs = payload.model_dump()
        # map payload fields to snake_case kwargs expected by _call_sp
        mapped = {
            "registration_number": kwargs["registrationNumber"],
            "name": kwargs["name"],
            "gender": kwargs["gender"],
            "dob": kwargs["dob"],
            "mobile": kwargs["mobile"],
            "alternate_mobile": kwargs["alternateMobile"],
            "email": kwargs["email"],
            "address1": kwargs["address1"],
            "address2": kwargs["address2"],
            "city": kwargs["city"],
            "state": kwargs["state"],
            "country": kwargs["country"],
            "postal_code": kwargs["postalCode"],
            
            "qualification": kwargs["qualification"],
            "specialization": kwargs["specialization"],
            "hospital": kwargs["hospital"],
            "branch": kwargs["branch"],
            "department": kwargs["department"],
            "designation": kwargs["designation"],
            "medical_council": kwargs["medicalCouncil"],
            "experience": kwargs["experience"],
            "languages": kwargs["languages"],
            "doctor_type": kwargs["doctorType"],
            "consultation_type": kwargs["consultationType"],
            "joining_date": kwargs["joiningDate"],
            "license_expiry_date": kwargs["licenseExpiryDate"],
            
            "consultation_fee": kwargs["consultationFee"],
            "follow_up_fee": kwargs["followUpFee"],
            "emergency_fee": kwargs["emergencyFee"],
            "tele_consultation_fee": kwargs["teleConsultationFee"],
            "op_duration": kwargs["opDuration"],
            "max_patients": kwargs["maxPatients"],
            "allow_online_booking": kwargs["allowOnlineBooking"],
            
            "available_days": kwargs["availableDays"],
            "from_time": kwargs["fromTime"],
            "to_time": kwargs["toTime"],
            "break_from": kwargs["breakFrom"],
            "break_to": kwargs["breakTo"],
            "slot_duration": kwargs["slotDuration"],
            "available_emergency": kwargs["availableEmergency"],
            "available_tele": kwargs["availableTele"],
            
            "doctor_photo": kwargs["doctorPhoto"],
            "signature_image": kwargs["signatureImage"],
            "digital_signature": kwargs["digitalSignature"],
            "registration_certificate": kwargs["registrationCertificate"],
            
            "status": kwargs["status"],
            "remarks": kwargs["remarks"],
            "created_by": kwargs["createdBy"]
        }
        result = _call_sp(db, "INSERT", **mapped)
        row = result.fetchone()
        new_id = row.DoctorId
        db.commit()

        fetch = _call_sp(db, "GETBYID", doctor_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /doctors] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(doctor_id: int, payload: DoctorUpdate, db: Session = Depends(get_db)):
    try:
        kwargs = payload.model_dump()
        mapped = {
            "doctor_id": doctor_id,
            "registration_number": kwargs["registrationNumber"],
            "name": kwargs["name"],
            "gender": kwargs["gender"],
            "dob": kwargs["dob"],
            "mobile": kwargs["mobile"],
            "alternate_mobile": kwargs["alternateMobile"],
            "email": kwargs["email"],
            "address1": kwargs["address1"],
            "address2": kwargs["address2"],
            "city": kwargs["city"],
            "state": kwargs["state"],
            "country": kwargs["country"],
            "postal_code": kwargs["postalCode"],
            
            "qualification": kwargs["qualification"],
            "specialization": kwargs["specialization"],
            "hospital": kwargs["hospital"],
            "branch": kwargs["branch"],
            "department": kwargs["department"],
            "designation": kwargs["designation"],
            "medical_council": kwargs["medicalCouncil"],
            "experience": kwargs["experience"],
            "languages": kwargs["languages"],
            "doctor_type": kwargs["doctorType"],
            "consultation_type": kwargs["consultationType"],
            "joining_date": kwargs["joiningDate"],
            "license_expiry_date": kwargs["licenseExpiryDate"],
            
            "consultation_fee": kwargs["consultationFee"],
            "follow_up_fee": kwargs["followUpFee"],
            "emergency_fee": kwargs["emergencyFee"],
            "tele_consultation_fee": kwargs["teleConsultationFee"],
            "op_duration": kwargs["opDuration"],
            "max_patients": kwargs["maxPatients"],
            "allow_online_booking": kwargs["allowOnlineBooking"],
            
            "available_days": kwargs["availableDays"],
            "from_time": kwargs["fromTime"],
            "to_time": kwargs["toTime"],
            "break_from": kwargs["breakFrom"],
            "break_to": kwargs["breakTo"],
            "slot_duration": kwargs["slotDuration"],
            "available_emergency": kwargs["availableEmergency"],
            "available_tele": kwargs["availableTele"],
            
            "doctor_photo": kwargs["doctorPhoto"],
            "signature_image": kwargs["signatureImage"],
            "digital_signature": kwargs["digitalSignature"],
            "registration_certificate": kwargs["registrationCertificate"],
            
            "status": kwargs["status"],
            "remarks": kwargs["remarks"],
            "modified_by": kwargs["modifiedBy"]
        }
        _call_sp(db, "UPDATE", **mapped)
        db.commit()

        fetch = _call_sp(db, "GETBYID", doctor_id=doctor_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Doctor not found after update")
        return _map_row(updated)
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /doctors/{doctor_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{doctor_id}", status_code=status.HTTP_200_OK)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "DELETE", doctor_id=doctor_id)
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /doctors/{doctor_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
