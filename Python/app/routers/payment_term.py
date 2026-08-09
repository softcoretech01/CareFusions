import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.payment_term import PaymentTermCreate, PaymentTermUpdate, PaymentTermResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payment-terms", tags=["Payment Terms Master"])

SP_NAME = "SpMasterPaymentTerm"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":             opt,
        "p_PaymentTermId":   kwargs.get("payment_term_id"),
        "p_PaymentTermName": kwargs.get("payment_term_name"),
        "p_CreditDays":      kwargs.get("credit_days"),
        "p_Description":     kwargs.get("description"),
        "p_Status":          kwargs.get("status"),
        "p_CreatedBy":       kwargs.get("created_by"),
        "p_UpdatedBy":       kwargs.get("updated_by"),
        "p_Search":          kwargs.get("search"),
        "p_StatusFilter":    kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_PaymentTermId, :p_PaymentTermName, :p_CreditDays, :p_Description,
            :p_Status, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":              row.PaymentTermId,
        "paymentTermCode": row.PaymentTermCode,
        "paymentTermName": row.PaymentTermName,
        "creditDays":      row.CreditDays,
        "description":     row.Description,
        "status":          row.Status,
        "createdBy":       row.CreatedBy,
        "createdDate":     row.CreatedDate,
        "updatedBy":       row.UpdatedBy,
        "updatedDate":     row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_PAYMENTTERM_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Payment Term Name must be unique")
    if "INVALID_CREDIT_DAYS" in msg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Credit Days cannot be negative")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A payment term with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        payment_term_name=payload.paymentTermName,
        credit_days=payload.creditDays,
        description=payload.description,
        status=payload.status.value,
    )


# ── GET /payment-terms/ ───────────────────────────────────────
@router.get("/", response_model=List[PaymentTermResponse])
def get_payment_terms(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all payment terms with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /payment-terms] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch payment terms")


# ── GET /payment-terms/next-code ──────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_payment_term_code(db: Session = Depends(get_db)):
    """Preview the PaymentTermCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"paymentTermCode": row.PaymentTermCode if row else "PT-001"}
    except Exception as e:
        logger.error(f"[GET /payment-terms/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next payment term code")


# ── GET /payment-terms/{id} ───────────────────────────────────
@router.get("/{payment_term_id}", response_model=PaymentTermResponse)
def get_payment_term_by_id(payment_term_id: int, db: Session = Depends(get_db)):
    """Fetch a single payment term by ID."""
    try:
        row = _call_sp(db, "GETBYID", payment_term_id=payment_term_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Payment Term with ID {payment_term_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /payment-terms/{payment_term_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch payment term")


# ── POST /payment-terms/ ──────────────────────────────────────
@router.post("/", response_model=PaymentTermResponse, status_code=status.HTTP_201_CREATED)
def create_payment_term(payload: PaymentTermCreate, db: Session = Depends(get_db)):
    """Create a payment term."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().PaymentTermId
        db.commit()

        created = _call_sp(db, "GETBYID", payment_term_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /payment-terms] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create payment term")


# ── PUT /payment-terms/{id} ───────────────────────────────────
@router.put("/{payment_term_id}", response_model=PaymentTermResponse)
def update_payment_term(payment_term_id: int, payload: PaymentTermUpdate, db: Session = Depends(get_db)):
    """Update an existing payment term."""
    try:
        _call_sp(
            db, "UPDATE",
            payment_term_id=payment_term_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", payment_term_id=payment_term_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Payment Term with ID {payment_term_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /payment-terms/{payment_term_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update payment term")


# ── PATCH /payment-terms/{id}/toggle-status ───────────────────
@router.patch("/{payment_term_id}/toggle-status", response_model=PaymentTermResponse)
def toggle_payment_term_status(payment_term_id: int, db: Session = Depends(get_db)):
    """Toggle payment term status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", payment_term_id=payment_term_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", payment_term_id=payment_term_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Payment Term with ID {payment_term_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /payment-terms/{payment_term_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle payment term status")


# ── DELETE /payment-terms/{id} ────────────────────────────────
@router.delete("/{payment_term_id}", status_code=status.HTTP_200_OK)
def delete_payment_term(payment_term_id: int, db: Session = Depends(get_db)):
    """Soft delete a payment term (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", payment_term_id=payment_term_id, updated_by="Admin")
        db.commit()
        return {"message": f"Payment Term {payment_term_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /payment-terms/{payment_term_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete payment term")
