"""IPD clinical records — nursing flowsheet, clinical rounds and the MAR.

Backed by hospital.SpIpdClinical. These three tabs previously kept their data
in component state or localStorage, so anything recorded was lost on refresh
even though the tables already existed on the server.
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.ipd_clinical import (
    VitalsCreate, RoundCreate, MedicationCreate, AdministrationUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ipd", tags=["IPD Clinical"])

_CALL = (
    "CALL hospital.SpIpdClinical(:p_Opt, :p_Id, :p_AdmissionId, :p_Temperature, :p_Pulse, "
    ":p_BloodPressure, :p_RespiratoryRate, :p_SpO2, :p_Notes, :p_DoctorName, :p_Note, "
    ":p_MedicineId, :p_MedicineName, :p_Dosage, :p_Frequency, :p_Route, :p_Administrations, :p_User)"
)

_DEFAULTS = {k: None for k in (
    "p_Opt p_Id p_AdmissionId p_Temperature p_Pulse p_BloodPressure p_RespiratoryRate p_SpO2 "
    "p_Notes p_DoctorName p_Note p_MedicineId p_MedicineName p_Dosage p_Frequency p_Route "
    "p_Administrations p_User").split()}


def _sp(db: Session, opt: str, **kw):
    params = dict(_DEFAULTS)
    params["p_Opt"] = opt
    params.update({f"p_{k}": v for k, v in kw.items()})
    return db.execute(text(_CALL), params)


def _iso(v):
    return v.isoformat() if v else None


# ══════════════════════ NURSING FLOWSHEET (VITALS) ══════════════════════
@router.get("/admissions/{admission_id}/vitals")
def list_vitals(admission_id: int, db: Session = Depends(get_db)):
    try:
        rows = _sp(db, "VITALS_LIST", AdmissionId=admission_id).fetchall()
        return [{
            "id": str(r.VitalsId), "timestamp": _iso(r.RecordedAt),
            "temperature": r.Temperature or "", "pulse": r.Pulse or "",
            "bloodPressure": r.BloodPressure or "", "respiratoryRate": r.RespiratoryRate or "",
            "spO2": r.SpO2 or "", "notes": r.Notes or "", "recordedBy": r.RecordedBy or "",
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /ipd/admissions/{admission_id}/vitals] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch vitals")


@router.post("/admissions/{admission_id}/vitals", status_code=201)
def add_vitals(admission_id: int, payload: VitalsCreate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, "VITALS_ADD", AdmissionId=admission_id,
                  Temperature=payload.temperature, Pulse=payload.pulse,
                  BloodPressure=payload.bloodPressure, RespiratoryRate=payload.respiratoryRate,
                  SpO2=payload.spO2, Notes=payload.notes,
                  User=payload.recordedBy or "Nurse").fetchone()
        db.commit()
        return {"id": str(row.VitalsId), "timestamp": _iso(row.RecordedAt)}
    except Exception as e:
        db.rollback()
        msg = str(getattr(e, "orig", e))
        if "foreign key constraint" in msg.lower() or "1452" in msg:
            raise HTTPException(status_code=400, detail="Unknown admission")
        logger.error(f"[POST /ipd/admissions/{admission_id}/vitals] {e}")
        raise HTTPException(status_code=500, detail="Failed to save vitals")


@router.delete("/vitals/{vitals_id}")
def delete_vitals(vitals_id: int, db: Session = Depends(get_db)):
    try:
        _sp(db, "VITALS_DEL", Id=vitals_id)
        db.commit()
        return {"message": "Vitals entry removed"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /ipd/vitals/{vitals_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to remove vitals")


# ══════════════════════════ CLINICAL ROUNDS ══════════════════════════
@router.get("/admissions/{admission_id}/rounds")
def list_rounds(admission_id: int, db: Session = Depends(get_db)):
    try:
        rows = _sp(db, "ROUNDS_LIST", AdmissionId=admission_id).fetchall()
        return [{
            "id": str(r.RoundId), "timestamp": _iso(r.RecordedAt),
            "doctorName": r.DoctorName, "note": r.Note,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /ipd/admissions/{admission_id}/rounds] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch rounds")


@router.post("/admissions/{admission_id}/rounds", status_code=201)
def add_round(admission_id: int, payload: RoundCreate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, "ROUNDS_ADD", AdmissionId=admission_id,
                  DoctorName=payload.doctorName, Note=payload.note).fetchone()
        db.commit()
        return {"id": str(row.RoundId), "timestamp": _iso(row.RecordedAt)}
    except Exception as e:
        db.rollback()
        msg = str(getattr(e, "orig", e))
        if "foreign key constraint" in msg.lower() or "1452" in msg:
            raise HTTPException(status_code=400, detail="Unknown admission")
        logger.error(f"[POST /ipd/admissions/{admission_id}/rounds] {e}")
        raise HTTPException(status_code=500, detail="Failed to save round note")


@router.delete("/rounds/{round_id}")
def delete_round(round_id: int, db: Session = Depends(get_db)):
    try:
        _sp(db, "ROUNDS_DEL", Id=round_id)
        db.commit()
        return {"message": "Round note removed"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /ipd/rounds/{round_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to remove round note")


# ═══════════════════ MEDICATION ADMINISTRATION RECORD ═══════════════════
@router.get("/admissions/{admission_id}/medications")
def list_medications(admission_id: int, db: Session = Depends(get_db)):
    try:
        rows = _sp(db, "MED_LIST", AdmissionId=admission_id).fetchall()
        out = []
        for r in rows:
            try:
                administrations = json.loads(r.Administrations or "{}")
            except ValueError:
                administrations = {}
            out.append({
                "id": str(r.MedicationId), "medicineId": r.MedicineId,
                "medicineName": r.MedicineName, "dosage": r.Dosage,
                "frequency": r.Frequency, "route": r.Route,
                "administrations": administrations,
            })
        return out
    except Exception as e:
        logger.error(f"[GET /ipd/admissions/{admission_id}/medications] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch medications")


@router.post("/admissions/{admission_id}/medications", status_code=201)
def add_medication(admission_id: int, payload: MedicationCreate, db: Session = Depends(get_db)):
    try:
        row = _sp(db, "MED_ADD", AdmissionId=admission_id,
                  MedicineId=payload.medicineId, MedicineName=payload.medicineName,
                  Dosage=payload.dosage, Frequency=payload.frequency,
                  Route=payload.route, Administrations="{}",
                  User=payload.prescribedBy or "Doctor").fetchone()
        db.commit()
        return {"id": str(row.MedicationId)}
    except Exception as e:
        db.rollback()
        msg = str(getattr(e, "orig", e))
        if "foreign key constraint" in msg.lower() or "1452" in msg:
            raise HTTPException(status_code=400, detail="Unknown admission or medicine reference")
        logger.error(f"[POST /ipd/admissions/{admission_id}/medications] {e}")
        raise HTTPException(status_code=500, detail="Failed to add medication")


@router.patch("/medications/{medication_id}/administer")
def administer_medication(medication_id: int, payload: AdministrationUpdate,
                          db: Session = Depends(get_db)):
    """Record which time slots have been given."""
    try:
        _sp(db, "MED_ADMIN", Id=medication_id,
            Administrations=json.dumps(payload.administrations))
        db.commit()
        return {"id": str(medication_id), "administrations": payload.administrations}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /ipd/medications/{medication_id}/administer] {e}")
        raise HTTPException(status_code=500, detail="Failed to record administration")


@router.delete("/medications/{medication_id}")
def delete_medication(medication_id: int, db: Session = Depends(get_db)):
    try:
        _sp(db, "MED_DEL", Id=medication_id)
        db.commit()
        return {"message": "Medication removed"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /ipd/medications/{medication_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to remove medication")
