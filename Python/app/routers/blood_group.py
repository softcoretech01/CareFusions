from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.blood_group import (
    BloodGroupCreate,
    BloodGroupUpdate,
    BloodGroupResponse,
    BloodGroupEnum,
    RhFactorEnum,
)

router = APIRouter(prefix="/blood-groups", tags=["Blood Group"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterBloodGroup"


def safe_value(val):
    if val == "":
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":            row.BloodGroupId,
        "bloodGroup":    row.BloodGroup,
        "rhFactor":      row.RhFactor,
        "description":   row.Description,
        "status":        row.Status,
        "createdBy":     row.CreatedBy,
        "createdDate":   row.CreatedDate,
        "modifiedBy":    row.ModifiedBy,
        "modifiedDate":  row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, group_id: int = 0, **kwargs):
    params = {
        "p_Opt":           opt,
        "p_BloodGroupId":  group_id,
        "p_BloodGroup":    safe_value(kwargs.get("blood_group")),
        "p_RhFactor":      safe_value(kwargs.get("rh_factor")),
        "p_Description":   safe_value(kwargs.get("description")),
        "p_Status":        safe_value(kwargs.get("status")),
        "p_CreatedBy":     safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":    safe_value(kwargs.get("modified_by")),
        "p_Search":        safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_BloodGroupId,
            :p_BloodGroup, :p_RhFactor, :p_Description, :p_Status,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET OPTIONS ──────────────────────────────────────────────────────────────
@router.get("/options")
def get_options():
    try:
        return {
            "bloodGroups": [e.value for e in BloodGroupEnum],
            "rhFactors": [e.value for e in RhFactorEnum]
        }
    except Exception as e:
        logger.error(f"[GET /blood-groups/options] {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[BloodGroupResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /blood-groups] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{group_id}", response_model=BloodGroupResponse)
def get_by_id(group_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", group_id=group_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Blood Group not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /blood-groups/{group_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=BloodGroupResponse, status_code=status.HTTP_201_CREATED)
def create(group: BloodGroupCreate, db: Session = Depends(get_db)):
    try:
        d = group.model_dump()
        result = _call_sp(db, "INSERT",
            blood_group=d["bloodGroup"],
            rh_factor=d["rhFactor"],
            description=d["description"],
            status=d["status"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.BloodGroupId
        db.commit()

        fetch = _call_sp(db, "GETBYID", group_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /blood-groups] {e}")
        # Simplistic unique error detection
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Blood Group already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{group_id}", response_model=BloodGroupResponse)
def update(group_id: int, group: BloodGroupUpdate, db: Session = Depends(get_db)):
    try:
        d = group.model_dump()
        _call_sp(db, "UPDATE",
            group_id=group_id,
            blood_group=d["bloodGroup"],
            rh_factor=d["rhFactor"],
            description=d["description"],
            status=d["status"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", group_id=group_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Blood Group not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /blood-groups/{group_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Blood Group already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(group_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", group_id=group_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Blood Group not found")
        _call_sp(db, "DELETE", group_id=group_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /blood-groups/{group_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
