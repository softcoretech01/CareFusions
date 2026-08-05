import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.ipd import (
    WardCreate, BedCreate, BedStatusUpdate,
    AdmissionCreate, AdmissionUpdate, AllocateBed, DischargeRequest,
    AdmissionRequestCreate, RequestStatusUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ipd", tags=["IPD"])


# ── SP call helpers ──────────────────────────────────────────
def _sp(db: Session, name: str, params: dict):
    placeholders = ", ".join(f":{k}" for k in params)
    return db.execute(text(f"CALL {name}({placeholders})"), params)


def _ward_sp(db, opt, **kw):
    return _sp(db, "hospital.SpIpdWard", {
        "p_Opt": opt, "p_WardId": kw.get("ward_id"), "p_WardName": kw.get("ward_name"),
        "p_WardType": kw.get("ward_type"), "p_GenderRestriction": kw.get("gender_restriction"),
        "p_Capacity": kw.get("capacity"), "p_Status": kw.get("st"), "p_User": kw.get("user"),
    })


def _bed_sp(db, opt, **kw):
    return _sp(db, "hospital.SpIpdBed", {
        "p_Opt": opt, "p_BedId": kw.get("bed_id"), "p_WardId": kw.get("ward_id"),
        "p_RoomNumber": kw.get("room_number"), "p_BedNumber": kw.get("bed_number"),
        "p_Status": kw.get("st"), "p_User": kw.get("user"),
    })


def _adm_sp(db, opt, **kw):
    return _sp(db, "hospital.SpIpdAdmission", {
        "p_Opt": opt, "p_AdmissionId": kw.get("admission_id"), "p_Uhid": kw.get("uhid"),
        "p_PatientName": kw.get("patient_name"), "p_Age": kw.get("age"), "p_Gender": kw.get("gender"),
        "p_BloodGroup": kw.get("blood_group"), "p_AdmittingDoctor": kw.get("admitting_doctor"),
        "p_Specialty": kw.get("specialty"), "p_AdmissionType": kw.get("admission_type"),
        "p_Priority": kw.get("priority"), "p_ExpectedStayDays": kw.get("expected_stay"),
        "p_WardId": kw.get("ward_id"), "p_BedId": kw.get("bed_id"),
        "p_ProvisionalDiagnosis": kw.get("diagnosis"), "p_InsuranceStatus": kw.get("insurance"),
        "p_TransferReason": kw.get("reason"), "p_DischargeSummary": kw.get("summary"),
        "p_DischargedBy": kw.get("discharged_by"), "p_MedicineName": kw.get("med_name"),
        "p_Dosage": kw.get("dosage"), "p_Frequency": kw.get("frequency"),
        "p_Duration": kw.get("duration"), "p_Quantity": kw.get("quantity"),
        "p_Notes": kw.get("notes"), "p_User": kw.get("user"),
    })


def _req_sp(db, opt, **kw):
    return _sp(db, "hospital.SpIpdAdmissionRequest", {
        "p_Opt": opt, "p_RequestId": kw.get("request_id"), "p_Uhid": kw.get("uhid"),
        "p_PatientName": kw.get("patient_name"), "p_Specialty": kw.get("specialty"),
        "p_AdmissionType": kw.get("admission_type"), "p_Priority": kw.get("priority"),
        "p_ProvisionalDiagnosis": kw.get("diagnosis"), "p_RequestedBy": kw.get("requested_by"),
        "p_Status": kw.get("st"), "p_User": kw.get("user"),
    })


# ── Row mappers ──────────────────────────────────────────────
def _map_admission(r) -> dict:
    discharge = None
    if r.DischargeSummary or r.DischargedBy or r.DischargeDate:
        discharge = {
            "dischargeDate": str(r.DischargeDate) if r.DischargeDate else "",
            "dischargeSummary": r.DischargeSummary or "",
            "dischargedBy": r.DischargedBy or "",
            "medicines": [],
        }
    return {
        "id": r.AdmissionId,
        "admissionNumber": r.AdmissionNumber,
        "uhid": r.Uhid,
        "patientName": r.PatientName,
        "age": r.Age,
        "gender": r.Gender,
        "bloodGroup": r.BloodGroup,
        "admissionDate": r.AdmissionDate,
        "admittingDoctor": r.AdmittingDoctor,
        "specialty": r.Specialty,
        "admissionType": r.AdmissionType,
        "priority": r.Priority,
        "expectedStayDays": r.ExpectedStayDays,
        "status": r.Status,
        "currentWardId": r.CurrentWardId,
        "currentBedId": r.CurrentBedId,
        "provisionalDiagnosis": r.ProvisionalDiagnosis,
        "insuranceStatus": r.InsuranceStatus,
        "wardTransferHistory": [],
        "dischargeInfo": discharge,
    }


# ══════════════════════════ WARDS ══════════════════════════
@router.get("/wards")
def list_wards(db: Session = Depends(get_db)):
    try:
        rows = _ward_sp(db, "LIST").fetchall()
        return [{
            "id": r.WardId, "name": r.WardName, "type": r.WardType,
            "genderRestriction": r.GenderRestriction, "capacity": r.Capacity,
            "status": r.Status, "totalBeds": r.TotalBeds, "availableBeds": r.AvailableBeds,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /ipd/wards] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch wards")


@router.post("/wards", status_code=201)
def create_ward(payload: WardCreate, db: Session = Depends(get_db)):
    try:
        row = _ward_sp(db, "INSERT", ward_name=payload.wardName, ward_type=payload.wardType.value,
                       gender_restriction=payload.genderRestriction.value, capacity=payload.capacity,
                       st=payload.status, user=payload.user or "Admin").fetchone()
        db.commit()
        return {"id": row.WardId}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /ipd/wards] {e}")
        raise HTTPException(status_code=500, detail="Failed to create ward")


@router.put("/wards/{ward_id}")
def update_ward(ward_id: int, payload: WardCreate, db: Session = Depends(get_db)):
    try:
        _ward_sp(db, "UPDATE", ward_id=ward_id, ward_name=payload.wardName,
                 ward_type=payload.wardType.value, gender_restriction=payload.genderRestriction.value,
                 capacity=payload.capacity, st=payload.status, user=payload.user or "Admin")
        db.commit()
        return {"message": "Ward updated"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /ipd/wards/{ward_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update ward")


@router.delete("/wards/{ward_id}")
def delete_ward(ward_id: int, db: Session = Depends(get_db)):
    try:
        _ward_sp(db, "DELETE", ward_id=ward_id, user="Admin")
        db.commit()
        return {"message": "Ward deleted"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /ipd/wards/{ward_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete ward")


# ══════════════════════════ BEDS ══════════════════════════
@router.get("/beds")
def list_beds(db: Session = Depends(get_db)):
    try:
        rows = _bed_sp(db, "LIST").fetchall()
        return [{
            "id": r.BedId, "wardId": r.WardId, "wardName": r.WardName,
            "roomNumber": r.RoomNumber, "bedNumber": r.BedNumber, "status": r.Status,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /ipd/beds] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch beds")


@router.post("/beds", status_code=201)
def create_bed(payload: BedCreate, db: Session = Depends(get_db)):
    try:
        row = _bed_sp(db, "INSERT", ward_id=payload.wardId, room_number=payload.roomNumber,
                      bed_number=payload.bedNumber, st=payload.status.value,
                      user=payload.user or "Admin").fetchone()
        db.commit()
        return {"id": row.BedId}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /ipd/beds] {e}")
        raise HTTPException(status_code=500, detail="Failed to create bed")


@router.patch("/beds/{bed_id}/status")
def update_bed_status(bed_id: int, payload: BedStatusUpdate, db: Session = Depends(get_db)):
    try:
        _bed_sp(db, "UPDATESTATUS", bed_id=bed_id, st=payload.status.value, user=payload.user or "Admin")
        db.commit()
        return {"message": "Bed status updated"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /ipd/beds/{bed_id}/status] {e}")
        raise HTTPException(status_code=500, detail="Failed to update bed status")


# ══════════════════════════ ADMISSIONS ══════════════════════════
@router.get("/admissions")
def list_admissions(db: Session = Depends(get_db)):
    """All admissions with nested ward-transfer history and discharge medicines."""
    try:
        rows = _adm_sp(db, "LIST").fetchall()
        transfers = _adm_sp(db, "TRANSFERS").fetchall()
        meds = _adm_sp(db, "DISCHARGEMEDS").fetchall()

        t_by_adm: dict = {}
        for t in transfers:
            t_by_adm.setdefault(t.AdmissionId, []).append({
                "id": str(t.TransferId), "fromWardId": t.FromWardId, "toWardId": t.ToWardId,
                "fromBedId": t.FromBedId, "toBedId": t.ToBedId,
                "transferDate": str(t.TransferDate), "transferReason": t.TransferReason or "",
            })
        m_by_adm: dict = {}
        for m in meds:
            m_by_adm.setdefault(m.AdmissionId, []).append({
                "medicineId": m.DischargeMedId, "medicineName": m.MedicineName, "dosage": m.Dosage or "",
                "frequency": m.Frequency or "", "duration": m.Duration or "",
                "quantity": m.Quantity or 0, "notes": m.Notes or "",
            })

        out = []
        for r in rows:
            adm = _map_admission(r)
            adm["wardTransferHistory"] = t_by_adm.get(r.AdmissionId, [])
            if adm["dischargeInfo"] is not None:
                adm["dischargeInfo"]["medicines"] = m_by_adm.get(r.AdmissionId, [])
            out.append(adm)
        return out
    except Exception as e:
        logger.error(f"[GET /ipd/admissions] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch admissions")


def _admit_fields(p: AdmissionCreate) -> dict:
    return dict(
        uhid=p.uhid, patient_name=p.patientName, age=p.age, gender=p.gender,
        blood_group=p.bloodGroup, admitting_doctor=p.admittingDoctor, specialty=p.specialty,
        admission_type=p.admissionType, priority=p.priority, expected_stay=p.expectedStayDays,
        ward_id=p.wardId, bed_id=p.bedId, diagnosis=p.provisionalDiagnosis,
        insurance=p.insuranceStatus, user=p.user or "Admin",
    )


@router.post("/admissions", status_code=201)
def admit_patient(payload: AdmissionCreate, db: Session = Depends(get_db)):
    try:
        row = _adm_sp(db, "ADMIT", **_admit_fields(payload)).fetchone()
        db.commit()
        created = _adm_sp(db, "GETBYID", admission_id=row.AdmissionId).fetchone()
        return _map_admission(created)
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /ipd/admissions] {e}")
        raise HTTPException(status_code=500, detail="Failed to admit patient")


@router.put("/admissions/{admission_id}")
def update_admission(admission_id: int, payload: AdmissionUpdate, db: Session = Depends(get_db)):
    try:
        _adm_sp(db, "UPDATE", admission_id=admission_id, **_admit_fields(payload))
        db.commit()
        return {"message": "Admission updated"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /ipd/admissions/{admission_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update admission")


@router.patch("/admissions/{admission_id}/allocate-bed")
def allocate_bed(admission_id: int, payload: AllocateBed, db: Session = Depends(get_db)):
    try:
        _adm_sp(db, "ALLOCATEBED", admission_id=admission_id, ward_id=payload.wardId,
                bed_id=payload.bedId, reason=payload.reason, user=payload.user or "Admin")
        db.commit()
        return {"message": "Bed allocated"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /ipd/admissions/{admission_id}/allocate-bed] {e}")
        raise HTTPException(status_code=500, detail="Failed to allocate bed")


def _save_discharge_meds(db, admission_id: int, meds):
    _adm_sp(db, "DELDISCHARGEMEDS", admission_id=admission_id)
    for m in meds:
        _adm_sp(db, "ADDDISCHARGEMED", admission_id=admission_id, med_name=m.medicineName,
                dosage=m.dosage, frequency=m.frequency, duration=m.duration,
                quantity=m.quantity, notes=m.notes)


@router.patch("/admissions/{admission_id}/request-discharge")
def request_discharge(admission_id: int, payload: DischargeRequest, db: Session = Depends(get_db)):
    try:
        _adm_sp(db, "REQUESTDISCHARGE", admission_id=admission_id, summary=payload.dischargeSummary,
                discharged_by=payload.dischargedBy, user=payload.user or "Admin")
        _save_discharge_meds(db, admission_id, payload.medicines)
        db.commit()
        return {"message": "Discharge requested"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /ipd/admissions/{admission_id}/request-discharge] {e}")
        raise HTTPException(status_code=500, detail="Failed to request discharge")


@router.patch("/admissions/{admission_id}/discharge")
def discharge(admission_id: int, payload: DischargeRequest, db: Session = Depends(get_db)):
    try:
        _adm_sp(db, "DISCHARGE", admission_id=admission_id, summary=payload.dischargeSummary,
                discharged_by=payload.dischargedBy, user=payload.user or "Admin")
        if payload.medicines:
            _save_discharge_meds(db, admission_id, payload.medicines)
        db.commit()
        return {"message": "Patient discharged"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /ipd/admissions/{admission_id}/discharge] {e}")
        raise HTTPException(status_code=500, detail="Failed to discharge patient")


# ══════════════════════════ ADMISSION REQUESTS ══════════════════════════
@router.get("/admission-requests")
def list_requests(db: Session = Depends(get_db)):
    try:
        rows = _req_sp(db, "LIST").fetchall()
        return [{
            "id": r.RequestId, "requestDate": r.RequestDate, "uhid": r.Uhid,
            "patientName": r.PatientName, "specialty": r.Specialty, "admissionType": r.AdmissionType,
            "priority": r.Priority, "provisionalDiagnosis": r.ProvisionalDiagnosis,
            "requestedBy": r.RequestedBy, "status": r.Status,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /ipd/admission-requests] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch admission requests")


@router.post("/admission-requests", status_code=201)
def create_request(payload: AdmissionRequestCreate, db: Session = Depends(get_db)):
    try:
        row = _req_sp(db, "INSERT", uhid=payload.uhid, patient_name=payload.patientName,
                      specialty=payload.specialty, admission_type=payload.admissionType,
                      priority=payload.priority, diagnosis=payload.provisionalDiagnosis,
                      requested_by=payload.requestedBy, user=payload.user or "Admin").fetchone()
        db.commit()
        return {"id": row.RequestId}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /ipd/admission-requests] {e}")
        raise HTTPException(status_code=500, detail="Failed to create admission request")


@router.patch("/admission-requests/{request_id}/status")
def update_request_status(request_id: int, payload: RequestStatusUpdate, db: Session = Depends(get_db)):
    try:
        _req_sp(db, "UPDATESTATUS", request_id=request_id, st=payload.status.value, user="Admin")
        db.commit()
        return {"message": "Request status updated"}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /ipd/admission-requests/{request_id}/status] {e}")
        raise HTTPException(status_code=500, detail="Failed to update request status")
