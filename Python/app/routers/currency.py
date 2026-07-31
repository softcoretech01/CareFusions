import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.currency import CurrencyCreate, CurrencyUpdate, CurrencyResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/currencies", tags=["Currency Master"])

SP_NAME = "SpMasterCurrency"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":          opt,
        "p_CurrencyId":   kwargs.get("currency_id"),
        "p_CurrencyCode": kwargs.get("currency_code"),
        "p_CurrencyName": kwargs.get("currency_name"),
        "p_Symbol":       kwargs.get("symbol"),
        "p_Status":       kwargs.get("status"),
        "p_CreatedBy":    kwargs.get("created_by"),
        "p_UpdatedBy":    kwargs.get("updated_by"),
        "p_Search":       kwargs.get("search"),
        "p_StatusFilter": kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_CurrencyId, :p_CurrencyCode, :p_CurrencyName, :p_Symbol,
            :p_Status, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":           row.CurrencyId,
        "currencyCode": row.CurrencyCode,
        "currencyName": row.CurrencyName,
        "symbol":       row.Symbol,
        "status":       row.Status,
        "createdBy":    row.CreatedBy,
        "createdDate":  row.CreatedDate,
        "updatedBy":    row.UpdatedBy,
        "updatedDate":  row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_CURRENCY_CODE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Currency Code must be unique")
    if "DUPLICATE_CURRENCY_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Currency Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A currency with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        currency_code=payload.currencyCode,
        currency_name=payload.currencyName,
        symbol=payload.symbol,
        status=payload.status.value,
    )


# ── GET /currencies/ ──────────────────────────────────────────
@router.get("/", response_model=List[CurrencyResponse])
def get_currencies(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all currencies with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /currencies] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch currencies")


# ── GET /currencies/{id} ──────────────────────────────────────
@router.get("/{currency_id}", response_model=CurrencyResponse)
def get_currency_by_id(currency_id: int, db: Session = Depends(get_db)):
    """Fetch a single currency by ID."""
    try:
        row = _call_sp(db, "GETBYID", currency_id=currency_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Currency with ID {currency_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /currencies/{currency_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch currency")


# ── POST /currencies/ ─────────────────────────────────────────
@router.post("/", response_model=CurrencyResponse, status_code=status.HTTP_201_CREATED)
def create_currency(payload: CurrencyCreate, db: Session = Depends(get_db)):
    """Create a currency. CurrencyCode is user-entered and must be unique."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().CurrencyId
        db.commit()

        created = _call_sp(db, "GETBYID", currency_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /currencies] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create currency")


# ── PUT /currencies/{id} ──────────────────────────────────────
@router.put("/{currency_id}", response_model=CurrencyResponse)
def update_currency(currency_id: int, payload: CurrencyUpdate, db: Session = Depends(get_db)):
    """Update an existing currency."""
    try:
        _call_sp(
            db, "UPDATE",
            currency_id=currency_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", currency_id=currency_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Currency with ID {currency_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /currencies/{currency_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update currency")


# ── PATCH /currencies/{id}/toggle-status ──────────────────────
@router.patch("/{currency_id}/toggle-status", response_model=CurrencyResponse)
def toggle_currency_status(currency_id: int, db: Session = Depends(get_db)):
    """Toggle currency status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", currency_id=currency_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", currency_id=currency_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Currency with ID {currency_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /currencies/{currency_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle currency status")


# ── DELETE /currencies/{id} ───────────────────────────────────
@router.delete("/{currency_id}", status_code=status.HTTP_200_OK)
def delete_currency(currency_id: int, db: Session = Depends(get_db)):
    """Soft delete a currency (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", currency_id=currency_id, updated_by="Admin")
        db.commit()
        return {"message": f"Currency {currency_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /currencies/{currency_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete currency")
