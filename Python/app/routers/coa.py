import logging
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.coa import CoaCreate, CoaUpdate, CoaResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coa-accounts", tags=["Chart of Accounts Master"])

SP_NAME = "SpMasterCoa"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                    opt,
        "p_CoaId":                  kwargs.get("coa_id"),
        "p_AccountName":            kwargs.get("account_name"),
        "p_AccountType":            kwargs.get("account_type"),
        "p_ParentAccount":          kwargs.get("parent_account"),
        "p_Description":            kwargs.get("description"),
        "p_OpeningBalance":         kwargs.get("opening_balance"),
        "p_AllowManualJournal":     kwargs.get("allow_manual_journal"),
        "p_ReconciliationRequired": kwargs.get("reconciliation_required"),
        "p_Status":                 kwargs.get("status"),
        "p_Remarks":                kwargs.get("remarks"),
        "p_CreatedBy":              kwargs.get("created_by"),
        "p_UpdatedBy":              kwargs.get("updated_by"),
        "p_Search":                 kwargs.get("search"),
        "p_TypeFilter":             kwargs.get("type_filter"),
        "p_StatusFilter":           kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_CoaId, :p_AccountName, :p_AccountType, :p_ParentAccount,
            :p_Description, :p_OpeningBalance, :p_AllowManualJournal, :p_ReconciliationRequired,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_TypeFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _money(value) -> str:
    if value is None:
        return "0.00"
    return f"{Decimal(value):.2f}"


def _map_row(row) -> dict:
    return {
        "id":                     row.CoaId,
        "accountCode":            row.AccountCode,
        "accountName":            row.AccountName,
        "accountType":            row.AccountType,
        "parentAccount":          row.ParentAccount,
        "description":            row.Description,
        "openingBalance":         _money(row.OpeningBalance),
        "allowManualJournal":     bool(row.AllowManualJournal),
        "reconciliationRequired": bool(row.ReconciliationRequired),
        "status":                 row.Status,
        "remarks":                row.Remarks,
        "createdBy":              row.CreatedBy,
        "createdDate":            row.CreatedDate,
        "updatedBy":              row.UpdatedBy,
        "updatedDate":            row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_ACCOUNT_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Account Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Coa_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Account Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An account with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        account_name=payload.accountName,
        account_type=payload.accountType.value,
        parent_account=payload.parentAccount,
        description=payload.description,
        opening_balance=payload.openingBalance,
        allow_manual_journal=int(payload.allowManualJournal),
        reconciliation_required=int(payload.reconciliationRequired),
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /coa-accounts/ ────────────────────────────────────────
@router.get("/", response_model=List[CoaResponse])
def get_coa_accounts(
    search: Optional[str] = None,
    account_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all chart-of-accounts entries with optional search and type/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, type_filter=account_type, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /coa-accounts] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch accounts")


# ── GET /coa-accounts/next-code ───────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_coa_code(db: Session = Depends(get_db)):
    """Preview the AccountCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"accountCode": row.AccountCode if row else "COA-001"}
    except Exception as e:
        logger.error(f"[GET /coa-accounts/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next account code")


# ── GET /coa-accounts/{id} ────────────────────────────────────
@router.get("/{coa_id}", response_model=CoaResponse)
def get_coa_by_id(coa_id: int, db: Session = Depends(get_db)):
    """Fetch a single account by ID."""
    try:
        row = _call_sp(db, "GETBYID", coa_id=coa_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Account with ID {coa_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /coa-accounts/{coa_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch account")


# ── POST /coa-accounts/ ───────────────────────────────────────
@router.post("/", response_model=CoaResponse, status_code=status.HTTP_201_CREATED)
def create_coa(payload: CoaCreate, db: Session = Depends(get_db)):
    """Create an account. AccountCode is auto-generated (COA-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().CoaId
        db.commit()

        created = _call_sp(db, "GETBYID", coa_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /coa-accounts] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create account")


# ── PUT /coa-accounts/{id} ────────────────────────────────────
@router.put("/{coa_id}", response_model=CoaResponse)
def update_coa(coa_id: int, payload: CoaUpdate, db: Session = Depends(get_db)):
    """Update an existing account. AccountCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            coa_id=coa_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", coa_id=coa_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Account with ID {coa_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /coa-accounts/{coa_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update account")


# ── PATCH /coa-accounts/{id}/toggle-status ────────────────────
@router.patch("/{coa_id}/toggle-status", response_model=CoaResponse)
def toggle_coa_status(coa_id: int, db: Session = Depends(get_db)):
    """Toggle account status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", coa_id=coa_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", coa_id=coa_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Account with ID {coa_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /coa-accounts/{coa_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle account status")


# ── DELETE /coa-accounts/{id} ─────────────────────────────────
@router.delete("/{coa_id}", status_code=status.HTTP_200_OK)
def delete_coa(coa_id: int, db: Session = Depends(get_db)):
    """Soft delete an account (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", coa_id=coa_id, updated_by="Admin")
        db.commit()
        return {"message": f"Account {coa_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /coa-accounts/{coa_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete account")
