import logging
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.tax import TaxCreate, TaxUpdate, TaxResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/taxes", tags=["Tax (GST) Master"])

SP_NAME = "SpMasterTax"


# ── Helper: call SpMasterTax ──────────────────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":           opt,
        "p_TaxId":         kwargs.get("tax_id"),
        "p_GstPercentage": kwargs.get("gst_percentage"),
        "p_EffectiveDate": kwargs.get("effective_date"),
        "p_Status":        kwargs.get("status"),
        "p_CreatedBy":     kwargs.get("created_by"),
        "p_UpdatedBy":     kwargs.get("updated_by"),
        "p_Search":        kwargs.get("search"),
        "p_StatusFilter":  kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_TaxId, :p_GstPercentage, :p_EffectiveDate, :p_Status,
            :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _iso(value) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat()[:10]


def _map_row(row) -> dict:
    return {
        "id":            row.TaxId,
        "taxCode":       row.TaxCode,
        "gstPercentage": row.GstPercentage,
        "cgst":          float(row.Cgst),
        "sgst":          float(row.Sgst),
        "igst":          float(row.Igst),
        "effectiveDate": _iso(row.EffectiveDate),
        "status":        row.Status,
        "createdBy":     row.CreatedBy,
        "createdDate":   row.CreatedDate,
        "updatedBy":     row.UpdatedBy,
        "updatedDate":   row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_GST_PERCENTAGE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A tax with this GST percentage already exists")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A tax with these details already exists")


# ── GET /taxes/ ───────────────────────────────────────────────
@router.get("/", response_model=List[TaxResponse])
def get_taxes(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all taxes with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /taxes] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch taxes")


# ── GET /taxes/{id} ───────────────────────────────────────────
@router.get("/{tax_id}", response_model=TaxResponse)
def get_tax_by_id(tax_id: int, db: Session = Depends(get_db)):
    """Fetch a single tax by ID."""
    try:
        row = _call_sp(db, "GETBYID", tax_id=tax_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Tax with ID {tax_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /taxes/{tax_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch tax")


# ── POST /taxes/ ──────────────────────────────────────────────
@router.post("/", response_model=TaxResponse, status_code=status.HTTP_201_CREATED)
def create_tax(payload: TaxCreate, db: Session = Depends(get_db)):
    """Create a tax. TaxCode + CGST/SGST/IGST are auto-derived from GST %."""
    try:
        result = _call_sp(
            db, "INSERT",
            gst_percentage=payload.gstPercentage,
            effective_date=payload.effectiveDate,
            status=payload.status.value,
            created_by=payload.createdBy or "Admin",
        )
        new_id = result.fetchone().TaxId
        db.commit()

        created = _call_sp(db, "GETBYID", tax_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /taxes] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create tax")


# ── PUT /taxes/{id} ───────────────────────────────────────────
@router.put("/{tax_id}", response_model=TaxResponse)
def update_tax(tax_id: int, payload: TaxUpdate, db: Session = Depends(get_db)):
    """Update a tax. TaxCode + splits are re-derived from GST %."""
    try:
        _call_sp(
            db, "UPDATE",
            tax_id=tax_id,
            gst_percentage=payload.gstPercentage,
            effective_date=payload.effectiveDate,
            status=payload.status.value,
            updated_by=payload.updatedBy or "Admin",
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", tax_id=tax_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Tax with ID {tax_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /taxes/{tax_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update tax")


# ── PATCH /taxes/{id}/toggle-status ───────────────────────────
@router.patch("/{tax_id}/toggle-status", response_model=TaxResponse)
def toggle_tax_status(tax_id: int, db: Session = Depends(get_db)):
    """Toggle tax status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", tax_id=tax_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", tax_id=tax_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Tax with ID {tax_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /taxes/{tax_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle tax status")


# ── DELETE /taxes/{id} ────────────────────────────────────────
@router.delete("/{tax_id}", status_code=status.HTTP_200_OK)
def delete_tax(tax_id: int, db: Session = Depends(get_db)):
    """Soft delete a tax (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", tax_id=tax_id, updated_by="Admin")
        db.commit()
        return {"message": f"Tax {tax_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /taxes/{tax_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete tax")
