from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.major_operation import (
    MajorOperationCreate,
    MajorOperationUpdate,
    MajorOperationResponse,
)

router = APIRouter(prefix="/major-operations", tags=["Major Operation"])
logger = logging.getLogger(__name__)

def _map_row(row) -> dict:
    return {
        "id":                row.id,
        "serialNo":          row.serialNo,
        "operationCode":     row.operationCode,
        "operationName":     row.operationName,
        "department":        row.department,
        "medications":       row.medications,
        "procedures":        row.procedures,
        "equipment":         row.equipment,
        "description":       row.description,
        "defaultCharge":     str(int(row.defaultCharge)) if row.defaultCharge is not None and row.defaultCharge == int(row.defaultCharge) else str(row.defaultCharge) if row.defaultCharge is not None else '0',
        "taxApplicable":     bool(row.taxApplicable),
        "estimatedDuration": str(row.estimatedDuration) if row.estimatedDuration is not None else '',
        "requiresConsent":   bool(row.requiresConsent),
        "requiresAdmission": bool(row.requiresAdmission),
        "otRequired":        bool(row.otRequired),
        "status":            row.status,
        "remarks":           row.remarks,
        "createdBy":         row.createdBy,
        "createdDate":       row.createdDate,
        "modifiedBy":        row.modifiedBy,
        "modifiedDate":      row.modifiedDate,
    }

@router.get("/", response_model=List[MajorOperationResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        if search:
            sql = text("SELECT * FROM Mst_MajorOperation WHERE operationCode LIKE :search OR operationName LIKE :search ORDER BY id DESC")
            result = db.execute(sql, {"search": f"%{search}%"})
        else:
            sql = text("SELECT * FROM Mst_MajorOperation ORDER BY id DESC")
            result = db.execute(sql)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /major-operations] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}", response_model=MajorOperationResponse)
def get_by_id(id: int, db: Session = Depends(get_db)):
    try:
        sql = text("SELECT * FROM Mst_MajorOperation WHERE id = :id")
        result = db.execute(sql, {"id": id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Major Operation not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /major-operations/{id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=MajorOperationResponse, status_code=status.HTTP_201_CREATED)
def create(operation: MajorOperationCreate, db: Session = Depends(get_db)):
    try:
        d = operation.model_dump()
        sql = text("""
            INSERT INTO Mst_MajorOperation (
                serialNo,
                operationCode, operationName, department, description, defaultCharge, 
                medications, procedures, equipment, 
                taxApplicable, estimatedDuration, requiresConsent, requiresAdmission, otRequired, 
                status, remarks, createdBy
            ) VALUES (
                :serialNo,
                :operationCode, :operationName, :department, :description, :defaultCharge, 
                :medications, :procedures, :equipment, 
                :taxApplicable, :estimatedDuration, :requiresConsent, :requiresAdmission, :otRequired, 
                :status, :remarks, :createdBy
            )
        """)
        # serialNo is assigned once here and never renumbered, so a deleted
        # row simply leaves a gap - same contract as id.
        next_serial = db.execute(
            text("SELECT COALESCE(MAX(serialNo), 0) + 1 AS n FROM Mst_MajorOperation")
        ).fetchone().n

        params = {
            "serialNo": next_serial,
            "operationCode": d["operationCode"],
            "operationName": d["operationName"],
            "department": d["department"],
            "medications": d["medications"],
            "procedures": d["procedures"],
            "equipment": d["equipment"],
            "description": d["description"],
            "defaultCharge": float(d["defaultCharge"] or 0),
            "taxApplicable": int(d["taxApplicable"]),
            "estimatedDuration": int(d["estimatedDuration"] or 0),
            "requiresConsent": int(d["requiresConsent"]),
            "requiresAdmission": int(d["requiresAdmission"]),
            "otRequired": int(d["otRequired"]),
            "status": d["status"],
            "remarks": d["remarks"],
            "createdBy": d["createdBy"],
        }
        db.execute(sql, params)

        # LAST_INSERT_ID() is per-connection, so it has to be read before the
        # commit hands the connection back to the pool - otherwise the next
        # statement can land on a different connection and return 0.
        new_id = db.execute(text("SELECT LAST_INSERT_ID() as id")).fetchone().id
        db.commit()

        fetch_sql = text("SELECT * FROM Mst_MajorOperation WHERE id = :id")
        fetch_result = db.execute(fetch_sql, {"id": new_id})
        return _map_row(fetch_result.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /major-operations] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Operation Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=MajorOperationResponse)
def update(id: int, operation: MajorOperationUpdate, db: Session = Depends(get_db)):
    try:
        d = operation.model_dump()
        sql = text("""
            UPDATE Mst_MajorOperation SET
                operationCode = :operationCode,
                operationName = :operationName,
                department = :department,
                medications = :medications,
                procedures = :procedures,
                equipment = :equipment,
                description = :description,
                defaultCharge = :defaultCharge,
                taxApplicable = :taxApplicable,
                estimatedDuration = :estimatedDuration,
                requiresConsent = :requiresConsent,
                requiresAdmission = :requiresAdmission,
                otRequired = :otRequired,
                status = :status,
                remarks = :remarks,
                modifiedBy = :modifiedBy
            WHERE id = :id
        """)
        params = {
            "id": id,
            "operationCode": d["operationCode"],
            "operationName": d["operationName"],
            "department": d["department"],
            "medications": d["medications"],
            "procedures": d["procedures"],
            "equipment": d["equipment"],
            "description": d["description"],
            "defaultCharge": float(d["defaultCharge"] or 0),
            "taxApplicable": int(d["taxApplicable"]),
            "estimatedDuration": int(d["estimatedDuration"] or 0),
            "requiresConsent": int(d["requiresConsent"]),
            "requiresAdmission": int(d["requiresAdmission"]),
            "otRequired": int(d["otRequired"]),
            "status": d["status"],
            "remarks": d["remarks"],
            "modifiedBy": d["modifiedBy"],
        }
        db.execute(sql, params)
        db.commit()

        fetch_sql = text("SELECT * FROM Mst_MajorOperation WHERE id = :id")
        fetch_result = db.execute(fetch_sql, {"id": id})
        updated = fetch_result.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Major Operation not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /major-operations/{id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Operation Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db)):
    try:
        fetch_sql = text("SELECT * FROM Mst_MajorOperation WHERE id = :id")
        fetch_result = db.execute(fetch_sql, {"id": id})
        if not fetch_result.fetchone():
            raise HTTPException(status_code=404, detail="Major Operation not found")
            
        sql = text("DELETE FROM Mst_MajorOperation WHERE id = :id")
        db.execute(sql, {"id": id})
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /major-operations/{id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
