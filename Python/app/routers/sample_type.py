from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.sample_type import (
    SampleTypeCreate,
    SampleTypeUpdate,
    SampleTypeResponse,
)

router = APIRouter(prefix="/sample-types", tags=["Sample Type Master"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterSampleType"


# ── GET /next-code ─────────────────────────────────────────
@router.get("/next-code")
def get_next_code(db: Session = Depends(get_db)):
    """Fetch the next auto-generated code from the backend."""
    try:
        result = _call_sp(db, "GETNEXTCODE")
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to generate next code")
        return {"nextCode": row[0]}
    except Exception as e:
        logger.error(f"[GET /next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch next code")


def safe_value(val):
    if val == "" or val is None:
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":                 row.SampleTypeId,
        "sampleCode":         row.SampleCode,
        "sampleType":         row.SampleTypeName,
        "description":        row.Description,
        "collectionMethod":   row.CollectionMethod,
        "storageTemperature": row.StorageTemperature,
        "maxStorageTime":     row.MaxStorageTime,
        "status":             row.Status,
        "remarks":            row.Remarks,
        "createdBy":          row.CreatedBy,
        "createdDate":        row.CreatedDate,
        "modifiedBy":         row.ModifiedBy,
        "modifiedDate":       row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, sample_type_id: int = 0, **kwargs):
    params = {
        "p_Opt":                opt,
        "p_SampleTypeId":       sample_type_id,
        "p_SampleCode":         safe_value(kwargs.get("sample_code")),
        "p_SampleTypeName":     safe_value(kwargs.get("sample_type_name")),
        "p_Description":        safe_value(kwargs.get("description")),
        "p_CollectionMethod":   safe_value(kwargs.get("collection_method")),
        "p_StorageTemperature": safe_value(kwargs.get("storage_temperature")),
        "p_MaxStorageTime":     safe_value(kwargs.get("max_storage_time")),
        "p_Status":             safe_value(kwargs.get("status")),
        "p_Remarks":            safe_value(kwargs.get("remarks")),
        "p_CreatedBy":          safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":         safe_value(kwargs.get("modified_by")),
        "p_Search":             safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_SampleTypeId,
            :p_SampleCode, :p_SampleTypeName, :p_Description,
            :p_CollectionMethod, :p_StorageTemperature, :p_MaxStorageTime,
            :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[SampleTypeResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /sample-types] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{sample_type_id}", response_model=SampleTypeResponse)
def get_by_id(sample_type_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", sample_type_id=sample_type_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Sample Type not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /sample-types/{sample_type_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=SampleTypeResponse, status_code=status.HTTP_201_CREATED)
def create(stype: SampleTypeCreate, db: Session = Depends(get_db)):
    try:
        d = stype.model_dump()
        result = _call_sp(db, "INSERT",
            sample_code=d["sampleCode"],
            sample_type_name=d["sampleType"],
            description=d["description"],
            collection_method=d["collectionMethod"],
            storage_temperature=d["storageTemperature"],
            max_storage_time=d["maxStorageTime"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.SampleTypeId
        db.commit()

        fetch = _call_sp(db, "GETBYID", sample_type_id=new_id)
        return _map_row(fetch.fetchone())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /sample-types] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Sample Code or Name already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{sample_type_id}", response_model=SampleTypeResponse)
def update(sample_type_id: int, stype: SampleTypeUpdate, db: Session = Depends(get_db)):
    try:
        d = stype.model_dump()
        _call_sp(db, "UPDATE",
            sample_type_id=sample_type_id,
            sample_code=d["sampleCode"],
            sample_type_name=d["sampleType"],
            description=d["description"],
            collection_method=d["collectionMethod"],
            storage_temperature=d["storageTemperature"],
            max_storage_time=d["maxStorageTime"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", sample_type_id=sample_type_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Sample Type not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /sample-types/{sample_type_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Sample Code or Name already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{sample_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(sample_type_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", sample_type_id=sample_type_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Sample Type not found")
        _call_sp(db, "DELETE", sample_type_id=sample_type_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /sample-types/{sample_type_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
