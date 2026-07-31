import logging
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.cash_counter import CashCounterCreate, CashCounterUpdate, CashCounterResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cash-counters", tags=["Cash Counter Master"])

SP_NAME = "SpMasterCashCounter"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":              opt,
        "p_CashCounterId":    kwargs.get("cash_counter_id"),
        "p_CounterName":      kwargs.get("counter_name"),
        "p_Hospital":         kwargs.get("hospital"),
        "p_Branch":           kwargs.get("branch"),
        "p_AssignedUser":     kwargs.get("assigned_user"),
        "p_OpeningBalance":   kwargs.get("opening_balance"),
        "p_MaximumCashLimit": kwargs.get("maximum_cash_limit"),
        "p_Status":           kwargs.get("status"),
        "p_Remarks":          kwargs.get("remarks"),
        "p_CreatedBy":        kwargs.get("created_by"),
        "p_UpdatedBy":        kwargs.get("updated_by"),
        "p_Search":           kwargs.get("search"),
        "p_BranchFilter":     kwargs.get("branch_filter"),
        "p_StatusFilter":     kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_CashCounterId, :p_CounterName, :p_Hospital, :p_Branch,
            :p_AssignedUser, :p_OpeningBalance, :p_MaximumCashLimit, :p_Status,
            :p_Remarks, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_BranchFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _money(value) -> str:
    if value is None:
        return "0.00"
    return f"{Decimal(value):.2f}"


def _map_row(row) -> dict:
    return {
        "id":               row.CashCounterId,
        "counterCode":      row.CounterCode,
        "counterName":      row.CounterName,
        "hospital":         row.Hospital,
        "branch":           row.Branch,
        "assignedUser":     row.AssignedUser,
        "openingBalance":   _money(row.OpeningBalance),
        "maximumCashLimit": _money(row.MaximumCashLimit),
        "status":           row.Status,
        "remarks":          row.Remarks,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "updatedBy":        row.UpdatedBy,
        "updatedDate":      row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_COUNTER_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Counter Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_CashCounter_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Counter Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A cash counter with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        counter_name=payload.counterName,
        hospital=payload.hospital,
        branch=payload.branch,
        assigned_user=payload.assignedUser,
        opening_balance=payload.openingBalance,
        maximum_cash_limit=payload.maximumCashLimit,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /cash-counters/ ───────────────────────────────────────
@router.get("/", response_model=List[CashCounterResponse])
def get_cash_counters(
    search: Optional[str] = None,
    branch: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all cash counters with optional search and branch/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, branch_filter=branch, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /cash-counters] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch cash counters")


# ── GET /cash-counters/next-code ──────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_cash_counter_code(db: Session = Depends(get_db)):
    """Preview the CounterCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"counterCode": row.CounterCode if row else "CTR-001"}
    except Exception as e:
        logger.error(f"[GET /cash-counters/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next counter code")


# ── GET /cash-counters/{id} ───────────────────────────────────
@router.get("/{cash_counter_id}", response_model=CashCounterResponse)
def get_cash_counter_by_id(cash_counter_id: int, db: Session = Depends(get_db)):
    """Fetch a single cash counter by ID."""
    try:
        row = _call_sp(db, "GETBYID", cash_counter_id=cash_counter_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Cash Counter with ID {cash_counter_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /cash-counters/{cash_counter_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch cash counter")


# ── POST /cash-counters/ ──────────────────────────────────────
@router.post("/", response_model=CashCounterResponse, status_code=status.HTTP_201_CREATED)
def create_cash_counter(payload: CashCounterCreate, db: Session = Depends(get_db)):
    """Create a cash counter. CounterCode is auto-generated (CTR-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().CashCounterId
        db.commit()

        created = _call_sp(db, "GETBYID", cash_counter_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /cash-counters] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create cash counter")


# ── PUT /cash-counters/{id} ───────────────────────────────────
@router.put("/{cash_counter_id}", response_model=CashCounterResponse)
def update_cash_counter(cash_counter_id: int, payload: CashCounterUpdate, db: Session = Depends(get_db)):
    """Update an existing cash counter. CounterCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            cash_counter_id=cash_counter_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", cash_counter_id=cash_counter_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Cash Counter with ID {cash_counter_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /cash-counters/{cash_counter_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update cash counter")


# ── PATCH /cash-counters/{id}/toggle-status ───────────────────
@router.patch("/{cash_counter_id}/toggle-status", response_model=CashCounterResponse)
def toggle_cash_counter_status(cash_counter_id: int, db: Session = Depends(get_db)):
    """Toggle cash counter status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", cash_counter_id=cash_counter_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", cash_counter_id=cash_counter_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Cash Counter with ID {cash_counter_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /cash-counters/{cash_counter_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle cash counter status")


# ── DELETE /cash-counters/{id} ────────────────────────────────
@router.delete("/{cash_counter_id}", status_code=status.HTTP_200_OK)
def delete_cash_counter(cash_counter_id: int, db: Session = Depends(get_db)):
    """Soft delete a cash counter (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", cash_counter_id=cash_counter_id, updated_by="Admin")
        db.commit()
        return {"message": f"Cash Counter {cash_counter_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /cash-counters/{cash_counter_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete cash counter")
