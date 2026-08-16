from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import json

from ..database import get_db
from ..schemas.opd_visit import OpdVisitScheduleResponse, OpdVisitClinicalSaveRequest

router = APIRouter(
    prefix="/opd-visits",
    tags=["OPD Visits"]
)

@router.get("/schedule", response_model=List[OpdVisitScheduleResponse])
def get_opd_schedule(
    department: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    opt = 'GET_EMR_SCHEDULE' if source == 'emr' else 'GET_SCHEDULE'
    sql = text(f"""
        CALL hospital.SpOpdVisit(
            '{opt}', NULL, NULL, :dept, :date,
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
        )
    """)
    result = db.execute(sql, {"dept": department, "date": date})
    rows = result.fetchall()
    
    visits = []
    for row in rows:
        d = dict(row._mapping)
        if d.get("date"):
            d["date"] = str(d["date"])
        if not d.get("patientName"):
            d["patientName"] = "Unknown"
        
        # Parse JSON string from MySQL JSON_ARRAYAGG for labOrders
        if d.get("labOrders") and isinstance(d["labOrders"], str):
            try:
                parsed = json.loads(d["labOrders"])
                if isinstance(parsed, list):
                    d["labOrders"] = [x for x in parsed if x is not None]
                else:
                    d["labOrders"] = []
            except Exception:
                d["labOrders"] = []
        elif not d.get("labOrders"):
            d["labOrders"] = []

        # Parse JSON string from MySQL JSON_ARRAYAGG for radiologyOrders
        if d.get("radiologyOrders") and isinstance(d["radiologyOrders"], str):
            try:
                parsed_rad = json.loads(d["radiologyOrders"])
                if isinstance(parsed_rad, list):
                    d["radiologyOrders"] = [x for x in parsed_rad if x is not None]
                else:
                    d["radiologyOrders"] = []
            except Exception:
                d["radiologyOrders"] = []
        elif not d.get("radiologyOrders"):
            d["radiologyOrders"] = []
            
        visits.append(d)
    return visits

@router.get("/{appointment_id}/details")
def get_opd_visit_details(appointment_id: int, db: Session = Depends(get_db)):
    sql = text("""
        CALL hospital.SpOpdVisit(
            'GET_DETAILS', :appId, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
        )
    """)
    import pymysql.cursors
    conn = db.connection().connection
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    try:
        cursor.execute("""
            CALL hospital.SpOpdVisit(
                'GET_DETAILS', %s, NULL, NULL, NULL,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
        """, (appointment_id,))
        
        result_sets = []
        has_next = True
        while has_next:
            result_sets.append(cursor.fetchall())
            has_next = cursor.nextset()
            
        if not result_sets or not result_sets[0]:
            raise HTTPException(status_code=404, detail="Visit details not found")
            
        if len(result_sets) == 1 and len(result_sets[0]) > 0 and 'Status' in result_sets[0][0]:
            return {"status": "NOT_FOUND"}
            
        data = {
            "visitInfo": result_sets[0][0] if len(result_sets) > 0 and len(result_sets[0]) > 0 else None,
            "vitals": result_sets[1][0] if len(result_sets) > 1 and len(result_sets[1]) > 0 else None,
            "triageInfo": result_sets[2][0] if len(result_sets) > 2 and len(result_sets[2]) > 0 else None,
            "diagnoses": result_sets[3] if len(result_sets) > 3 else [],
            "prescriptions": result_sets[4] if len(result_sets) > 4 else [],
            "labOrders": result_sets[5] if len(result_sets) > 5 else [],
            "radiologyOrders": result_sets[6] if len(result_sets) > 6 else [],
            "procedures": result_sets[7] if len(result_sets) > 7 else []
        }
        
        if data["vitals"]:
            v = data["vitals"]
            data["vitals"] = {
                "bp_systolic": v.get("BpSystolic"),
                "bp_diastolic": v.get("BpDiastolic"),
                "pulse": v.get("Pulse"),
                "respRate": v.get("RespRate"),
                "temp": v.get("Temp"),
                "tempUnit": v.get("TempUnit"),
                "spo2": v.get("Spo2"),
                "height": v.get("Height"),
                "weight": v.get("Weight"),
                "bmi": v.get("Bmi"),
                "bloodSugar": v.get("BloodSugar"),
                "recordedAt": v.get("RecordedAt"),
                "recordedBy": v.get("RecordedBy")
            }
            
        return data
        
    finally:
        cursor.close()



@router.post("/save-clinical")
def save_clinical_data(data: OpdVisitClinicalSaveRequest, db: Session = Depends(get_db)):
    sql = text("""
        CALL hospital.SpOpdVisit(
            'SAVE_CLINICAL', :appId, :uhid, NULL, NULL,
            :vitals, :triage, :diagnoses, :prescriptions, :labOrders, :radiology, :procedures,
            :isFinalized, :finalizedBy, :createdBy
        )
    """)
    
    # Dump models to JSON strings if they exist
    params = {
        "appId": data.appointmentId,
        "uhid": data.uhid,
        "vitals": data.vitals.model_dump_json() if data.vitals else None,
        "triage": data.triageInfo.model_dump_json() if data.triageInfo else None,
        "diagnoses": json.dumps([d.model_dump() for d in data.diagnoses]) if data.diagnoses else None,
        "prescriptions": json.dumps([p.model_dump() for p in data.prescriptions]) if data.prescriptions else None,
        "labOrders": json.dumps([l.model_dump() for l in data.labOrders]) if data.labOrders else None,
        "radiology": json.dumps([r.model_dump() for r in data.radiologyOrders]) if data.radiologyOrders else None,
        "procedures": json.dumps([p.model_dump() for p in data.procedures]) if data.procedures else None,
        "isFinalized": 1 if data.isFinalized else 0 if data.isFinalized is False else None,
        "finalizedBy": data.finalizedBy,
        "createdBy": data.createdBy
    }
    
    result = db.execute(sql, params)
    row = result.fetchone()
    db.commit()
    
    if not row or row[0] != 'SUCCESS':
        raise HTTPException(status_code=500, detail="Failed to save clinical data")
        
    return {"message": "Clinical data saved successfully", "visitId": row[1]}
