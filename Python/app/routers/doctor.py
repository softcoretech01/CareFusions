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
        "p_Experience": safe_value(kwargs.get("experience")),
        "p_Languages": safe_value(kwargs.get("languages")),
        "p_JoiningDate": safe_value(kwargs.get("joining_date")),
        
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
            :p_DoctorName, :p_Gender, :p_DateOfBirth, :p_Mobile, :p_AlternateMobile, :p_Email,
            :p_Address1, :p_Address2, :p_City, :p_State, :p_Country, :p_PostalCode,
            :p_Qualification, :p_Specialization, :p_HospitalName, :p_BranchName, :p_DepartmentName, :p_Designation,
            :p_Experience, :p_Languages, :p_JoiningDate,
            :p_ConsultationFee, :p_FollowUpFee, :p_EmergencyFee, :p_TeleConsultationFee, :p_OpDuration, :p_MaxPatients, :p_AllowOnlineBooking,
            :p_AvailableDays, :p_FromTime, :p_ToTime, :p_BreakFrom, :p_BreakTo, :p_SlotDuration, :p_AvailableEmergency, :p_AvailableTele,
            :p_DoctorPhoto, :p_SignatureImage, :p_DigitalSignature, :p_RegistrationCertificate,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


def _aadhaar_map(db: Session) -> dict:
    """DoctorId -> AadhaarCard, for enriching list responses in one query."""
    rows = db.execute(text(
        "SELECT DoctorId, AadhaarCard FROM admin.Master_DoctorDocument_Detail"
    )).fetchall()
    return {r.DoctorId: r.AadhaarCard for r in rows}


def _aadhaar_of(db: Session, doctor_id: int):
    return db.execute(text(
        "SELECT AadhaarCard FROM admin.Master_DoctorDocument_Detail WHERE DoctorId = :i"
    ), {"i": doctor_id}).scalar()


def _save_aadhaar(db: Session, doctor_id: int, value):
    """The document row is created by the SP, so this only ever updates."""
    db.execute(text(
        "UPDATE admin.Master_DoctorDocument_Detail SET AadhaarCard = :v WHERE DoctorId = :i"
    ), {"v": value, "i": doctor_id})


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
        "experience": row.Experience,
        "languages": row.Languages,
        "joiningDate": row.JoiningDate,
        
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
        aadhaar = _aadhaar_map(db)
        out = []
        for r in result.fetchall():
            item = _map_row(r)
            item["aadhaarCard"] = aadhaar.get(item["id"])
            out.append(item)
        return out
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
        item = _map_row(row)
        item["aadhaarCard"] = _aadhaar_of(db, doctor_id)
        return item
    except HTTPException: raise
    except Exception as e:
        logger.error(f"[GET /doctors/{doctor_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _default_hospital(db: Session) -> str:
    """The hospital a new doctor belongs to.

    Hospital and Branch were dropped from the Doctor form, but
    Master_DoctorProfessional_Detail still declares both columns NOT NULL, so
    something has to go in. A single-hospital install has exactly one active
    row; anything else falls back to an empty string rather than failing save.
    """
    try:
        row = db.execute(text(
            "SELECT HospitalName FROM Master_Hospital "
            "WHERE IsDeleted = 0 AND Status = 'Active' "
            "ORDER BY HospitalId LIMIT 1")).fetchone()
        return row.HospitalName if row else ""
    except Exception as e:
        logger.warning(f"[doctors] could not resolve default hospital: {e}")
        return ""


def _ensure_detail_rows(db: Session, doctor_id: int, mapped: dict):
    """Create any missing per-doctor detail rows before an update runs.

    A doctor's professional, consultation and schedule details live in child
    tables, and SpMasterDoctor's UPDATE branch is a plain UPDATE ... WHERE
    DoctorId = ?. Only the INSERT branch ever creates those rows, so a doctor
    saved without them -- or created before a section existed -- could never gain
    them: editing the record updated zero rows and the values were silently
    dropped, while the form happily reported success. Seed the row first and the
    procedure's UPDATE then has something to write to.

    The NOT NULL columns without defaults are why the values are coalesced rather
    than inserted as NULL.
    """
    def s(key):
        value = mapped.get(key)
        return "" if value is None else str(value)

    statements = [
        ("""
            INSERT INTO admin.Master_DoctorProfessional_Detail
                (DoctorId, Qualification, Specialization, HospitalName, BranchName, DepartmentName, Designation)
            SELECT :doctor_id, :qualification, :specialization, :hospital, :branch, :department, :designation
            FROM DUAL
            WHERE NOT EXISTS (
                SELECT 1 FROM admin.Master_DoctorProfessional_Detail WHERE DoctorId = :doctor_id
            )
         """, {
            "doctor_id": doctor_id, "qualification": s("qualification"),
            "specialization": s("specialization"), "hospital": s("hospital"),
            "branch": s("branch"), "department": s("department"), "designation": s("designation"),
         }),
        ("""
            INSERT INTO admin.Master_DoctorConsultation_Detail
                (DoctorId, ConsultationFee, OpDuration)
            SELECT :doctor_id, :consultation_fee, :op_duration
            FROM DUAL
            WHERE NOT EXISTS (
                SELECT 1 FROM admin.Master_DoctorConsultation_Detail WHERE DoctorId = :doctor_id
            )
         """, {
            "doctor_id": doctor_id,
            "consultation_fee": mapped.get("consultation_fee") or 0,
            "op_duration": mapped.get("op_duration") or 0,
         }),
        ("""
            INSERT INTO admin.Master_DoctorSchedule_Detail
                (DoctorId, AvailableDays, FromTime, ToTime, SlotDuration)
            SELECT :doctor_id, :available_days, :from_time, :to_time, :slot_duration
            FROM DUAL
            WHERE NOT EXISTS (
                SELECT 1 FROM admin.Master_DoctorSchedule_Detail WHERE DoctorId = :doctor_id
            )
         """, {
            "doctor_id": doctor_id,
            "available_days": ",".join(mapped.get("available_days") or []) if isinstance(mapped.get("available_days"), list) else s("available_days"),
            "from_time": s("from_time"), "to_time": s("to_time"),
            "slot_duration": mapped.get("slot_duration") or 0,
         }),
    ]

    for sql, params in statements:
        try:
            db.execute(text(sql), params)
        except Exception as e:
            # A section that cannot be seeded should not block the rest of the save.
            logger.warning(f"[doctors/{doctor_id}] could not seed detail row: {e}")


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)):
    try:
        kwargs = payload.model_dump()
        # map payload fields to snake_case kwargs expected by _call_sp
        mapped = {
            "name": kwargs.get("name"),
            "gender": kwargs.get("gender"),
            "dob": kwargs.get("dob"),
            "mobile": kwargs.get("mobile"),
            "alternate_mobile": kwargs.get("alternateMobile"),
            "email": kwargs.get("email"),
            "address1": kwargs.get("address1"),
            "address2": kwargs.get("address2"),
            "city": kwargs.get("city"),
            "state": kwargs.get("state"),
            "country": kwargs.get("country"),
            "postal_code": kwargs.get("postalCode"),
            
            "qualification": kwargs.get("qualification"),
            "specialization": kwargs.get("specialization"),
            "hospital": kwargs.get("hospital") or _default_hospital(db),
            "branch": kwargs.get("branch") or "",
            "department": kwargs.get("department"),
            "designation": kwargs.get("designation"),
            "experience": kwargs.get("experience"),
            "languages": kwargs.get("languages"),
            "joining_date": kwargs.get("joiningDate"),
            
            "consultation_fee": kwargs.get("consultationFee"),
            "follow_up_fee": kwargs.get("followUpFee"),
            "emergency_fee": kwargs.get("emergencyFee"),
            "tele_consultation_fee": kwargs.get("teleConsultationFee"),
            "op_duration": kwargs.get("opDuration"),
            "max_patients": kwargs.get("maxPatients"),
            "allow_online_booking": kwargs.get("allowOnlineBooking"),
            
            "available_days": kwargs.get("availableDays"),
            "from_time": kwargs.get("fromTime"),
            "to_time": kwargs.get("toTime"),
            "break_from": kwargs.get("breakFrom"),
            "break_to": kwargs.get("breakTo"),
            "slot_duration": kwargs.get("slotDuration"),
            "available_emergency": kwargs.get("availableEmergency"),
            "available_tele": kwargs.get("availableTele"),
            
            "doctor_photo": kwargs.get("doctorPhoto"),
            "signature_image": kwargs.get("signatureImage"),
            "digital_signature": kwargs.get("digitalSignature"),
            "registration_certificate": kwargs.get("registrationCertificate"),
            
            "status": kwargs.get("status"),
            "remarks": kwargs.get("remarks"),
            "created_by": kwargs.get("createdBy")
        }
        result = _call_sp(db, "INSERT", **mapped)
        row = result.fetchone()
        new_id = row.DoctorId
        _save_aadhaar(db, new_id, kwargs.get("aadhaarCard"))
        db.commit()

        fetch = _call_sp(db, "GETBYID", doctor_id=new_id)
        item = _map_row(fetch.fetchone())
        item["aadhaarCard"] = _aadhaar_of(db, new_id)
        return item
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
            "name": kwargs.get("name"),
            "gender": kwargs.get("gender"),
            "dob": kwargs.get("dob"),
            "mobile": kwargs.get("mobile"),
            "alternate_mobile": kwargs.get("alternateMobile"),
            "email": kwargs.get("email"),
            "address1": kwargs.get("address1"),
            "address2": kwargs.get("address2"),
            "city": kwargs.get("city"),
            "state": kwargs.get("state"),
            "country": kwargs.get("country"),
            "postal_code": kwargs.get("postalCode"),
            
            "qualification": kwargs.get("qualification"),
            "specialization": kwargs.get("specialization"),
            "hospital": kwargs.get("hospital") or _default_hospital(db),
            "branch": kwargs.get("branch") or "",
            "department": kwargs.get("department"),
            "designation": kwargs.get("designation"),
            "experience": kwargs.get("experience"),
            "languages": kwargs.get("languages"),
            "joining_date": kwargs.get("joiningDate"),
            
            "consultation_fee": kwargs.get("consultationFee"),
            "follow_up_fee": kwargs.get("followUpFee"),
            "emergency_fee": kwargs.get("emergencyFee"),
            "tele_consultation_fee": kwargs.get("teleConsultationFee"),
            "op_duration": kwargs.get("opDuration"),
            "max_patients": kwargs.get("maxPatients"),
            "allow_online_booking": kwargs.get("allowOnlineBooking"),
            
            "available_days": kwargs.get("availableDays"),
            "from_time": kwargs.get("fromTime"),
            "to_time": kwargs.get("toTime"),
            "break_from": kwargs.get("breakFrom"),
            "break_to": kwargs.get("breakTo"),
            "slot_duration": kwargs.get("slotDuration"),
            "available_emergency": kwargs.get("availableEmergency"),
            "available_tele": kwargs.get("availableTele"),
            
            "doctor_photo": kwargs.get("doctorPhoto"),
            "signature_image": kwargs.get("signatureImage"),
            "digital_signature": kwargs.get("digitalSignature"),
            "registration_certificate": kwargs.get("registrationCertificate"),
            
            "status": kwargs.get("status"),
            "remarks": kwargs.get("remarks"),
            "modified_by": kwargs.get("modifiedBy")
        }
        _ensure_detail_rows(db, doctor_id, mapped)
        _call_sp(db, "UPDATE", **mapped)
        _save_aadhaar(db, doctor_id, kwargs.get("aadhaarCard"))
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
