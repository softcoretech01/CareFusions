from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from ..database import get_db
from ..schemas.patient_visit import PatientVisitCreate, PatientVisitUpdate, PatientVisitResponse

router = APIRouter(
    prefix="/visits",
    tags=["Patient Visits"]
)

def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt": opt,
        "p_VisitId": kwargs.get("VisitId", None),
        "p_Uhid": kwargs.get("Uhid", None),
        "p_VisitDate": kwargs.get("VisitDate", None),
        "p_VisitTime": kwargs.get("VisitTime", None),
        "p_VisitType": kwargs.get("VisitType", None),
        "p_Department": kwargs.get("Department", None),
        "p_Doctor": kwargs.get("Doctor", None),
        "p_Status": kwargs.get("Status", None),
        "p_Notes": kwargs.get("Notes", None)
    }
    
    sql = text("""
        CALL registration.SpPatientVisit(
            :p_Opt, :p_VisitId, :p_Uhid, :p_VisitDate, :p_VisitTime, 
            :p_VisitType, :p_Department, :p_Doctor, :p_Status, :p_Notes
        )
    """)
    result = db.execute(sql, params)
    return result

@router.get("/{uhid}", response_model=List[PatientVisitResponse])
def get_visits_by_uhid(uhid: str, db: Session = Depends(get_db)):
    result = _call_sp(db, "SELECT_BY_UHID", Uhid=uhid)
    rows = result.fetchall()
    
    visits = []
    for row in rows:
        visits.append(dict(row._mapping))
    return visits

@router.post("/", response_model=PatientVisitResponse)
def create_visit(data: PatientVisitCreate, db: Session = Depends(get_db)):
    kwargs = data.model_dump()
    result = _call_sp(db, "INSERT", **kwargs)
    row = result.fetchone()
    db.commit()
    
    if not row:
        raise HTTPException(status_code=500, detail="Failed to insert visit")
        
    visit_id = row[0]
    
    # Fetch back
    check = db.execute(text("SELECT * FROM registration.PatientVisit WHERE VisitId = :id"), {"id": visit_id})
    inserted_row = check.fetchone()
    return dict(inserted_row._mapping)

@router.put("/{visit_id}", response_model=PatientVisitResponse)
def update_visit(visit_id: int, data: PatientVisitUpdate, db: Session = Depends(get_db)):
    kwargs = data.model_dump()
    kwargs["VisitId"] = visit_id
    
    result = _call_sp(db, "UPDATE", **kwargs)
    db.commit()
    
    check = db.execute(text("SELECT * FROM registration.PatientVisit WHERE VisitId = :id"), {"id": visit_id})
    updated_row = check.fetchone()
    if not updated_row:
        raise HTTPException(status_code=404, detail="Visit not found")
    return dict(updated_row._mapping)

@router.delete("/{visit_id}")
def delete_visit(visit_id: int, db: Session = Depends(get_db)):
    _call_sp(db, "DELETE", VisitId=visit_id)
    db.commit()
    return {"message": "Visit deleted successfully"}
