import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.financial_year import (
    FinancialYearCreate,
    FinancialYearUpdate,
    FinancialYearResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/financial-years", tags=["Financial Year Master"])

SP_NAME = "SpMasterFinancialYear"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                    opt,
        "p_FinancialYearId":        kwargs.get("financial_year_id"),
        "p_FinancialYear":          kwargs.get("financial_year"),
        "p_StartDate":              kwargs.get("start_date"),
        "p_EndDate":                kwargs.get("end_date"),
        "p_IsCurrentFinancialYear": kwargs.get("is_current_financial_year"),
        "p_AllowBackdatedEntry":    kwargs.get("allow_backdated_entry"),
        "p_ClosingDate":            kwargs.get("closing_date"),
        "p_Status":                 kwargs.get("status"),
        "p_Remarks":                kwargs.get("remarks"),
        "p_CreatedBy":              kwargs.get("created_by"),
        "p_UpdatedBy":              kwargs.get("updated_by"),
        "p_Search":                 kwargs.get("search"),
        "p_StatusFilter":           kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_FinancialYearId, :p_FinancialYear, :p_StartDate, :p_EndDate,
            :p_IsCurrentFinancialYear, :p_AllowBackdatedEntry, :p_ClosingDate,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _iso(value) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat()[:10]


def _map_row(row) -> dict:
    return {
        "id":                     row.FinancialYearId,
        "financialYear":          row.FinancialYear,
        "startDate":              _iso(row.StartDate),
        "endDate":                _iso(row.EndDate),
        "isCurrentFinancialYear": bool(row.IsCurrentFinancialYear),
        "allowBackdatedEntry":    bool(row.AllowBackdatedEntry),
        "closingDate":            _iso(row.ClosingDate),
        "status":                 row.Status,
        "remarks":                row.Remarks,
        "createdBy":              row.CreatedBy,
        "createdDate":            row.CreatedDate,
        "updatedBy":              row.UpdatedBy,
        "updatedDate":            row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_FINANCIALYEAR" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Financial Year must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A financial year with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        financial_year=payload.financialYear,
        start_date=payload.startDate,
        end_date=payload.endDate,
        is_current_financial_year=int(payload.isCurrentFinancialYear),
        allow_backdated_entry=int(payload.allowBackdatedEntry),
        closing_date=payload.closingDate,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /financial-years/ ─────────────────────────────────────
@router.get("/", response_model=List[FinancialYearResponse])
def get_financial_years(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all financial years with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /financial-years] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch financial years")


# ── GET /financial-years/{id} ─────────────────────────────────
@router.get("/{financial_year_id}", response_model=FinancialYearResponse)
def get_financial_year_by_id(financial_year_id: int, db: Session = Depends(get_db)):
    """Fetch a single financial year by ID."""
    try:
        row = _call_sp(db, "GETBYID", financial_year_id=financial_year_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Financial Year with ID {financial_year_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /financial-years/{financial_year_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch financial year")


# ── POST /financial-years/ ────────────────────────────────────
@router.post("/", response_model=FinancialYearResponse, status_code=status.HTTP_201_CREATED)
def create_financial_year(payload: FinancialYearCreate, db: Session = Depends(get_db)):
    """Create a financial year."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().FinancialYearId
        db.commit()

        created = _call_sp(db, "GETBYID", financial_year_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /financial-years] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create financial year")


# ── PUT /financial-years/{id} ─────────────────────────────────
@router.put("/{financial_year_id}", response_model=FinancialYearResponse)
def update_financial_year(financial_year_id: int, payload: FinancialYearUpdate, db: Session = Depends(get_db)):
    """Update an existing financial year."""
    try:
        _call_sp(
            db, "UPDATE",
            financial_year_id=financial_year_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", financial_year_id=financial_year_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Financial Year with ID {financial_year_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /financial-years/{financial_year_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update financial year")


# ── PATCH /financial-years/{id}/toggle-status ─────────────────
@router.patch("/{financial_year_id}/toggle-status", response_model=FinancialYearResponse)
def toggle_financial_year_status(financial_year_id: int, db: Session = Depends(get_db)):
    """Toggle financial year status between Open and Closed."""
    try:
        _call_sp(db, "TOGGLESTATUS", financial_year_id=financial_year_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", financial_year_id=financial_year_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Financial Year with ID {financial_year_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /financial-years/{financial_year_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle financial year status")


# ── DELETE /financial-years/{id} ──────────────────────────────
@router.delete("/{financial_year_id}", status_code=status.HTTP_200_OK)
def delete_financial_year(financial_year_id: int, db: Session = Depends(get_db)):
    """Soft delete a financial year (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", financial_year_id=financial_year_id, updated_by="Admin")
        db.commit()
        return {"message": f"Financial Year {financial_year_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /financial-years/{financial_year_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete financial year")
