import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/brands", tags=["Brand Master"])

SP_NAME = "SpMasterBrand"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":          opt,
        "p_BrandId":      kwargs.get("brand_id"),
        "p_BrandName":    kwargs.get("brand_name"),
        "p_Description":  kwargs.get("description"),
        "p_Status":       kwargs.get("status"),
        "p_CreatedBy":    kwargs.get("created_by"),
        "p_UpdatedBy":    kwargs.get("updated_by"),
        "p_Search":       kwargs.get("search"),
        "p_StatusFilter": kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_BrandId, :p_BrandName, :p_Description, :p_Status,
            :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":          row.BrandId,
        "brandCode":   row.BrandCode,
        "brandName":   row.BrandName,
        "description": row.Description,
        "status":      row.Status,
        "createdBy":   row.CreatedBy,
        "createdDate": row.CreatedDate,
        "updatedBy":   row.UpdatedBy,
        "updatedDate": row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_BRAND_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Brand Name cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Brand_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Brand Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A brand with these details already exists")


# ── GET /brands/ ──────────────────────────────────────────────
@router.get("/", response_model=List[BrandResponse])
def get_brands(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all brands with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /brands] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch brands")


# ── GET /brands/next-code ─────────────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_brand_code(db: Session = Depends(get_db)):
    """Preview the BrandCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"brandCode": row.BrandCode if row else "BRD-001"}
    except Exception as e:
        logger.error(f"[GET /brands/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next brand code")


# ── GET /brands/{id} ──────────────────────────────────────────
@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand_by_id(brand_id: int, db: Session = Depends(get_db)):
    """Fetch a single brand by ID."""
    try:
        row = _call_sp(db, "GETBYID", brand_id=brand_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Brand with ID {brand_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /brands/{brand_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch brand")


# ── POST /brands/ ─────────────────────────────────────────────
@router.post("/", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)):
    """Create a brand. BrandCode is auto-generated (BRD-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            brand_name=payload.brandName,
            description=payload.description,
            status=payload.status.value,
            created_by=payload.createdBy or "Admin",
        )
        new_id = result.fetchone().BrandId
        db.commit()

        created = _call_sp(db, "GETBYID", brand_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /brands] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create brand")


# ── PUT /brands/{id} ──────────────────────────────────────────
@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(brand_id: int, payload: BrandUpdate, db: Session = Depends(get_db)):
    """Update an existing brand. BrandCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            brand_id=brand_id,
            brand_name=payload.brandName,
            description=payload.description,
            status=payload.status.value,
            updated_by=payload.updatedBy or "Admin",
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", brand_id=brand_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Brand with ID {brand_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /brands/{brand_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update brand")


# ── PATCH /brands/{id}/toggle-status ──────────────────────────
@router.patch("/{brand_id}/toggle-status", response_model=BrandResponse)
def toggle_brand_status(brand_id: int, db: Session = Depends(get_db)):
    """Toggle brand status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", brand_id=brand_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", brand_id=brand_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Brand with ID {brand_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /brands/{brand_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle brand status")


# ── DELETE /brands/{id} ───────────────────────────────────────
@router.delete("/{brand_id}", status_code=status.HTTP_200_OK)
def delete_brand(brand_id: int, db: Session = Depends(get_db)):
    """Soft delete a brand (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", brand_id=brand_id, updated_by="Admin")
        db.commit()
        return {"message": f"Brand {brand_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /brands/{brand_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete brand")
