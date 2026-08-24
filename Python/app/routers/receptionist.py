from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import logging

from app.database import get_db
from app.schemas.receptionist import ReceptionistCreate, ReceptionistUpdate, ReceptionistResponse

router = APIRouter(prefix="/receptionists", tags=["Receptionists"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterReceptionist"


def safe_value(val):
    if val == "":
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":             row.ReceptionistId,
        "receptionistId": row.ReceptionistCode,
        "name":           row.ReceptionistName,
        "hospital":       row.HospitalName,
        "branch":         row.BranchName,
        "counter":        row.ReceptionCounter,
        "mobile":         row.Mobile,
        "email":          row.Email,
        "address":        row.Address,
        "joiningDate":    row.JoiningDate,
        "shift":          row.Shift,
        "experience":     row.ExperienceYears,
        "manager":        row.ReportingManager,
        "photo":          row.Photo,
        "idProof":        row.IdProof,
        "status":         row.Status,
        "remarks":        row.Remarks,
        "createdBy":      row.CreatedBy,
        "createdDate":    row.CreatedDate,
        "modifiedBy":     row.ModifiedBy,
        "modifiedDate":   row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, receptionist_id: int = 0, **kwargs):
    params = {
        "p_Opt":               opt,
        "p_ReceptionistId":    receptionist_id,
        "p_ReceptionistName":  safe_value(kwargs.get("name")),
        "p_HospitalName":      safe_value(kwargs.get("hospital")),
        "p_BranchName":        safe_value(kwargs.get("branch")),
        "p_ReceptionCounter":  safe_value(kwargs.get("counter")),
        "p_Mobile":            safe_value(kwargs.get("mobile")),
        "p_Email":             safe_value(kwargs.get("email")),
        "p_Address":           safe_value(kwargs.get("address")),
        "p_JoiningDate":       safe_value(kwargs.get("joining_date")),
        "p_Shift":             safe_value(kwargs.get("shift")),
        "p_ExperienceYears":   safe_value(kwargs.get("experience")),
        "p_ReportingManager":  safe_value(kwargs.get("manager")),
        "p_Photo":             safe_value(kwargs.get("photo")),
        "p_IdProof":           safe_value(kwargs.get("id_proof")),
        "p_Status":            safe_value(kwargs.get("status")),
        "p_Remarks":           safe_value(kwargs.get("remarks")),
        "p_CreatedBy":         safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":        safe_value(kwargs.get("modified_by")),
        "p_Search":            safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ReceptionistId,
            :p_ReceptionistName,
            :p_HospitalName, :p_BranchName, :p_ReceptionCounter,
            :p_Mobile, :p_Email, :p_Address,
            :p_JoiningDate, :p_Shift, :p_ExperienceYears, :p_ReportingManager,
            :p_Photo, :p_IdProof,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[ReceptionistResponse])
def get_all_receptionists(search: str = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(row) for row in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /receptionists] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{receptionist_id}", response_model=ReceptionistResponse)
def get_receptionist(receptionist_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", receptionist_id=receptionist_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Receptionist not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /receptionists/{receptionist_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=ReceptionistResponse, status_code=status.HTTP_201_CREATED)
def create_receptionist(receptionist: ReceptionistCreate, db: Session = Depends(get_db)):
    try:
        d = receptionist.model_dump()
        result = _call_sp(db, "INSERT",
            name=d["name"],
            hospital=d["hospital"],
            branch=d["branch"],
            counter=d["counter"],
            mobile=d["mobile"],
            email=d["email"],
            address=d["address"],
            joining_date=d["joiningDate"],
            shift=d["shift"],
            experience=d["experience"],
            manager=d["manager"],
            photo=d["photo"],
            id_proof=d["idProof"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.ReceptionistId
        db.commit()

        fetch = _call_sp(db, "GETBYID", receptionist_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /receptionists] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{receptionist_id}", response_model=ReceptionistResponse)
def update_receptionist(receptionist_id: int, receptionist: ReceptionistUpdate, db: Session = Depends(get_db)):
    try:
        d = receptionist.model_dump()
        _call_sp(db, "UPDATE",
            receptionist_id=receptionist_id,
            name=d["name"],
            hospital=d["hospital"],
            branch=d["branch"],
            counter=d["counter"],
            mobile=d["mobile"],
            email=d["email"],
            address=d["address"],
            joining_date=d["joiningDate"],
            shift=d["shift"],
            experience=d["experience"],
            manager=d["manager"],
            photo=d["photo"],
            id_proof=d["idProof"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", receptionist_id=receptionist_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Receptionist not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /receptionists/{receptionist_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{receptionist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receptionist(receptionist_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", receptionist_id=receptionist_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Receptionist not found")

        _call_sp(db, "DELETE", receptionist_id=receptionist_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /receptionists/{receptionist_id}] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
