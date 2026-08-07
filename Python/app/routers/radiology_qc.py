from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.database import get_db
from app.schemas.radiology import RadiologyQCResponse, RadiologyQCCreate

router = APIRouter(
    prefix="/radiology/qc",
    tags=["Radiology QC"]
)

@router.get("", response_model=List[RadiologyQCResponse])
def get_radiology_qc_logs(db: Session = Depends(get_db)):
    try:
        query = text("CALL hospital.SpRadQcLogs('SELECT_ALL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)")
        result = db.execute(query).fetchall()
        
        logs = []
        for row in result:
            logs.append({
                "qc_id": row.QcId,
                "qc_number": row.QcNumber,
                "category": row.Category,
                "qc_date": row.QcDate.strftime('%Y-%m-%d') if row.QcDate else "",
                "machine_name": row.MachineName,
                "test_name": row.TestName,
                "expected_value": float(row.ExpectedValue),
                "actual_value": float(row.ActualValue),
                "deviation": float(row.Deviation),
                "status": row.Status,
                "remarks": row.Remarks,
                "created_date": row.CreatedDate
            })
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=dict)
def create_radiology_qc_log(log: RadiologyQCCreate, db: Session = Depends(get_db)):
    try:
        query = text("""
            CALL hospital.SpRadQcLogs(
                'INSERT', 
                NULL, 
                :qc_number, 
                :qc_date, 
                :machine_name, 
                :test_name, 
                :expected_value, 
                :actual_value, 
                :deviation, 
                :status, 
                :remarks
            )
        """)
        
        result = db.execute(query, {
            "qc_number": log.qc_number,
            "qc_date": log.qc_date,
            "machine_name": log.machine_name,
            "test_name": log.test_name,
            "expected_value": log.expected_value,
            "actual_value": log.actual_value,
            "deviation": log.deviation,
            "status": log.status,
            "remarks": log.remarks
        }).fetchone()
        
        db.commit()
        return {"message": "QC Log created successfully", "qc_id": result.QcId if result else None}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
