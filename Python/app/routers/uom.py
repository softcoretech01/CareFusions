import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.uom import UomCreate, UomUpdate, UomResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uoms", tags=["UOM Master"])

SP_NAME = "SpMasterUom"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":          opt,
        "p_UomId":        kwargs.get("uom_id"),
        "p_UomCode":      kwargs.get("uom_code"),
        "p_UomName":      kwargs.get("uom_name"),
        "p_ShortName":    kwargs.get("short_name"),
        "p_Status":       kwargs.get("status"),
        "p_CreatedBy":    kwargs.get("created_by"),
        "p_UpdatedBy":    kwargs.get("updated_by"),
        "p_Search":       kwargs.get("search"),
        "p_StatusFilter": kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_UomId, :p_UomCode, :p_UomName, :p_ShortName, :p_Status,
            :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":          row.UomId,
        "uomCode":     row.UomCode,
        "uomName":     row.UomName,
        "shortName":   row.ShortName,
        "status":      row.Status,
        "createdBy":   row.CreatedBy,
        "createdDate": row.CreatedDate,
        "updatedBy":   row.UpdatedBy,
        "updatedDate": row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_UOM_CODE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="UOM Code must be unique")
    if "DUPLICATE_UOM_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="UOM Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A UOM with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        uom_code=payload.uomCode,
        uom_name=payload.uomName,
        short_name=payload.shortName,
        status=payload.status.value,
    )


# ── GET /uoms/ ────────────────────────────────────────────────
@router.get("/", response_model=List[UomResponse])
def get_uoms(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all UOMs with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /uoms] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch UOMs")


# ── GET /uoms/{id} ────────────────────────────────────────────
@router.get("/{uom_id}", response_model=UomResponse)
def get_uom_by_id(uom_id: int, db: Session = Depends(get_db)):
    """Fetch a single UOM by ID."""
    try:
        row = _call_sp(db, "GETBYID", uom_id=uom_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"UOM with ID {uom_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /uoms/{uom_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch UOM")


# ── POST /uoms/ ───────────────────────────────────────────────
@router.post("/", response_model=UomResponse, status_code=status.HTTP_201_CREATED)
def create_uom(payload: UomCreate, db: Session = Depends(get_db)):
    """Create a UOM. UomCode is user-entered and must be unique."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().UomId
        db.commit()

        created = _call_sp(db, "GETBYID", uom_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /uoms] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create UOM")


# ── PUT /uoms/{id} ────────────────────────────────────────────
@router.put("/{uom_id}", response_model=UomResponse)
def update_uom(uom_id: int, payload: UomUpdate, db: Session = Depends(get_db)):
    """Update an existing UOM."""
    try:
        _call_sp(
            db, "UPDATE",
            uom_id=uom_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", uom_id=uom_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"UOM with ID {uom_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /uoms/{uom_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update UOM")


# ── PATCH /uoms/{id}/toggle-status ────────────────────────────
@router.patch("/{uom_id}/toggle-status", response_model=UomResponse)
def toggle_uom_status(uom_id: int, db: Session = Depends(get_db)):
    """Toggle UOM status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", uom_id=uom_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", uom_id=uom_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"UOM with ID {uom_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /uoms/{uom_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle UOM status")


# ── DELETE /uoms/{id} ─────────────────────────────────────────
@router.delete("/{uom_id}", status_code=status.HTTP_200_OK)
def delete_uom(uom_id: int, db: Session = Depends(get_db)):
    """Soft delete a UOM (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", uom_id=uom_id, updated_by="Admin")
        db.commit()
        return {"message": f"UOM {uom_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /uoms/{uom_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete UOM")
