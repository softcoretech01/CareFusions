import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.payment_mode import (
    PaymentModeCreate,
    PaymentModeUpdate,
    PaymentModeResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payment-modes", tags=["Payment Mode Master"])

SP_NAME = "SpMasterPaymentMode"


# ── Helper: call SpMasterPaymentMode ──────────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_PaymentModeId":       kwargs.get("payment_mode_id"),
        "p_PaymentMode":         kwargs.get("payment_mode"),
        "p_Description":         kwargs.get("description"),
        "p_TransactionRequired": kwargs.get("transaction_required"),
        "p_SupportsRefund":      kwargs.get("supports_refund"),
        "p_IsDefault":           kwargs.get("is_default"),
        "p_Status":              kwargs.get("status"),
        "p_Remarks":             kwargs.get("remarks"),
        "p_CreatedBy":           kwargs.get("created_by"),
        "p_UpdatedBy":           kwargs.get("updated_by"),
        "p_Search":              kwargs.get("search"),
        "p_StatusFilter":        kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_PaymentModeId, :p_PaymentMode, :p_Description,
            :p_TransactionRequired, :p_SupportsRefund, :p_IsDefault,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                  row.PaymentModeId,
        "paymentCode":         row.PaymentCode,
        "paymentMode":         row.PaymentMode,
        "description":         row.Description,
        "transactionRequired": bool(row.TransactionRequired),
        "supportsRefund":      bool(row.SupportsRefund),
        "isDefault":           bool(row.IsDefault),
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "updatedBy":           row.UpdatedBy,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_PAYMENT_MODE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Payment Mode cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_PaymentMode_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Payment Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A payment mode with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        payment_mode=payload.paymentMode,
        description=payload.description,
        transaction_required=int(payload.transactionRequired),
        supports_refund=int(payload.supportsRefund),
        is_default=int(payload.isDefault),
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /payment-modes/ ───────────────────────────────────────
@router.get("/", response_model=List[PaymentModeResponse])
def get_payment_modes(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all payment modes with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /payment-modes] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch payment modes")


# ── GET /payment-modes/next-code ──────────────────────────────
# NOTE: declared BEFORE /{payment_mode_id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_payment_code(db: Session = Depends(get_db)):
    """Preview the PaymentCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"paymentCode": row.PaymentCode if row else "PAY-001"}
    except Exception as e:
        logger.error(f"[GET /payment-modes/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next payment code")


# ── GET /payment-modes/{id} ───────────────────────────────────
@router.get("/{payment_mode_id}", response_model=PaymentModeResponse)
def get_payment_mode_by_id(payment_mode_id: int, db: Session = Depends(get_db)):
    """Fetch a single payment mode by ID."""
    try:
        row = _call_sp(db, "GETBYID", payment_mode_id=payment_mode_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Payment Mode with ID {payment_mode_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /payment-modes/{payment_mode_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch payment mode")


# ── POST /payment-modes/ ──────────────────────────────────────
@router.post("/", response_model=PaymentModeResponse, status_code=status.HTTP_201_CREATED)
def create_payment_mode(payload: PaymentModeCreate, db: Session = Depends(get_db)):
    """Create a payment mode. PaymentCode is auto-generated (PAY-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().PaymentModeId
        db.commit()

        created = _call_sp(db, "GETBYID", payment_mode_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /payment-modes] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create payment mode")


# ── PUT /payment-modes/{id} ───────────────────────────────────
@router.put("/{payment_mode_id}", response_model=PaymentModeResponse)
def update_payment_mode(payment_mode_id: int, payload: PaymentModeUpdate, db: Session = Depends(get_db)):
    """Update an existing payment mode. PaymentCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            payment_mode_id=payment_mode_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", payment_mode_id=payment_mode_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Payment Mode with ID {payment_mode_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /payment-modes/{payment_mode_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update payment mode")


# ── PATCH /payment-modes/{id}/toggle-status ───────────────────
@router.patch("/{payment_mode_id}/toggle-status", response_model=PaymentModeResponse)
def toggle_payment_mode_status(payment_mode_id: int, db: Session = Depends(get_db)):
    """Toggle payment mode status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", payment_mode_id=payment_mode_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", payment_mode_id=payment_mode_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Payment Mode with ID {payment_mode_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /payment-modes/{payment_mode_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle payment mode status")


# ── DELETE /payment-modes/{id} ────────────────────────────────
@router.delete("/{payment_mode_id}", status_code=status.HTTP_200_OK)
def delete_payment_mode(payment_mode_id: int, db: Session = Depends(get_db)):
    """Soft delete a payment mode (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", payment_mode_id=payment_mode_id, updated_by="Admin")
        db.commit()
        return {"message": f"Payment Mode {payment_mode_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /payment-modes/{payment_mode_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete payment mode")
