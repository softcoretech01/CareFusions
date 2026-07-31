import logging
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.bank import BankCreate, BankUpdate, BankResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/banks", tags=["Bank Master"])

SP_NAME = "SpMasterBank"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":               opt,
        "p_BankId":            kwargs.get("bank_id"),
        "p_BankName":          kwargs.get("bank_name"),
        "p_AccountNumber":     kwargs.get("account_number"),
        "p_AccountHolderName": kwargs.get("account_holder_name"),
        "p_Branch":            kwargs.get("branch"),
        "p_IfscCode":          kwargs.get("ifsc_code"),
        "p_SwiftCode":         kwargs.get("swift_code"),
        "p_Currency":          kwargs.get("currency"),
        "p_OpeningBalance":    kwargs.get("opening_balance"),
        "p_Status":            kwargs.get("status"),
        "p_Remarks":           kwargs.get("remarks"),
        "p_CreatedBy":         kwargs.get("created_by"),
        "p_UpdatedBy":         kwargs.get("updated_by"),
        "p_Search":            kwargs.get("search"),
        "p_BankFilter":        kwargs.get("bank_filter"),
        "p_StatusFilter":      kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_BankId, :p_BankName, :p_AccountNumber, :p_AccountHolderName,
            :p_Branch, :p_IfscCode, :p_SwiftCode, :p_Currency, :p_OpeningBalance,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_BankFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _money(value) -> str:
    if value is None:
        return "0.00"
    return f"{Decimal(value):.2f}"


def _map_row(row) -> dict:
    return {
        "id":                row.BankId,
        "bankCode":          row.BankCode,
        "bankName":          row.BankName,
        "accountNumber":     row.AccountNumber,
        "accountHolderName": row.AccountHolderName,
        "branch":            row.Branch,
        "ifscCode":          row.IfscCode,
        "swiftCode":         row.SwiftCode,
        "currency":          row.Currency,
        "openingBalance":    _money(row.OpeningBalance),
        "status":            row.Status,
        "remarks":           row.Remarks,
        "createdBy":         row.CreatedBy,
        "createdDate":       row.CreatedDate,
        "updatedBy":         row.UpdatedBy,
        "updatedDate":       row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_ACCOUNT_NUMBER" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Account Number must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Bank_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Bank Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A bank account with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        bank_name=payload.bankName,
        account_number=payload.accountNumber,
        account_holder_name=payload.accountHolderName,
        branch=payload.branch,
        ifsc_code=payload.ifscCode,
        swift_code=payload.swiftCode,
        currency=payload.currency,
        opening_balance=payload.openingBalance,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /banks/ ───────────────────────────────────────────────
@router.get("/", response_model=List[BankResponse])
def get_banks(
    search: Optional[str] = None,
    bank_name: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all bank accounts with optional search and bank/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, bank_filter=bank_name, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /banks] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch bank accounts")


# ── GET /banks/next-code ──────────────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_bank_code(db: Session = Depends(get_db)):
    """Preview the BankCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"bankCode": row.BankCode if row else "BNK-001"}
    except Exception as e:
        logger.error(f"[GET /banks/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next bank code")


# ── GET /banks/{id} ───────────────────────────────────────────
@router.get("/{bank_id}", response_model=BankResponse)
def get_bank_by_id(bank_id: int, db: Session = Depends(get_db)):
    """Fetch a single bank account by ID."""
    try:
        row = _call_sp(db, "GETBYID", bank_id=bank_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Bank account with ID {bank_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /banks/{bank_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch bank account")


# ── POST /banks/ ──────────────────────────────────────────────
@router.post("/", response_model=BankResponse, status_code=status.HTTP_201_CREATED)
def create_bank(payload: BankCreate, db: Session = Depends(get_db)):
    """Create a bank account. BankCode is auto-generated (BNK-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().BankId
        db.commit()

        created = _call_sp(db, "GETBYID", bank_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /banks] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create bank account")


# ── PUT /banks/{id} ───────────────────────────────────────────
@router.put("/{bank_id}", response_model=BankResponse)
def update_bank(bank_id: int, payload: BankUpdate, db: Session = Depends(get_db)):
    """Update an existing bank account. BankCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            bank_id=bank_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", bank_id=bank_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Bank account with ID {bank_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /banks/{bank_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update bank account")


# ── PATCH /banks/{id}/toggle-status ───────────────────────────
@router.patch("/{bank_id}/toggle-status", response_model=BankResponse)
def toggle_bank_status(bank_id: int, db: Session = Depends(get_db)):
    """Toggle bank account status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", bank_id=bank_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", bank_id=bank_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Bank account with ID {bank_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /banks/{bank_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle bank account status")


# ── DELETE /banks/{id} ────────────────────────────────────────
@router.delete("/{bank_id}", status_code=status.HTTP_200_OK)
def delete_bank(bank_id: int, db: Session = Depends(get_db)):
    """Soft delete a bank account (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", bank_id=bank_id, updated_by="Admin")
        db.commit()
        return {"message": f"Bank account {bank_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /banks/{bank_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete bank account")
