import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.profit_center import ProfitCenterCreate, ProfitCenterUpdate, ProfitCenterResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profit-centers", tags=["Profit Center Master"])

SP_NAME = "SpMasterProfitCenter"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":              opt,
        "p_ProfitCenterId":   kwargs.get("profit_center_id"),
        "p_ProfitCenterName": kwargs.get("profit_center_name"),
        "p_Department":       kwargs.get("department"),
        "p_Description":      kwargs.get("description"),
        "p_Status":           kwargs.get("status"),
        "p_Remarks":          kwargs.get("remarks"),
        "p_CreatedBy":        kwargs.get("created_by"),
        "p_UpdatedBy":        kwargs.get("updated_by"),
        "p_Search":           kwargs.get("search"),
        "p_DepartmentFilter": kwargs.get("department_filter"),
        "p_StatusFilter":     kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ProfitCenterId, :p_ProfitCenterName, :p_Department,
            :p_Description, :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_DepartmentFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":               row.ProfitCenterId,
        "profitCenterCode": row.ProfitCenterCode,
        "profitCenterName": row.ProfitCenterName,
        "department":       row.Department,
        "description":      row.Description,
        "status":           row.Status,
        "remarks":          row.Remarks,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "updatedBy":        row.UpdatedBy,
        "updatedDate":      row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_PROFITCENTER_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Profit Center Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_ProfitCenter_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Profit Center Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A profit center with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        profit_center_name=payload.profitCenterName,
        department=payload.department,
        description=payload.description,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /profit-centers/ ──────────────────────────────────────
@router.get("/", response_model=List[ProfitCenterResponse])
def get_profit_centers(
    search: Optional[str] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all profit centers with optional search and department/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, department_filter=department, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /profit-centers] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch profit centers")


# ── GET /profit-centers/next-code ─────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_profit_center_code(db: Session = Depends(get_db)):
    """Preview the ProfitCenterCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"profitCenterCode": row.ProfitCenterCode if row else "PFT-001"}
    except Exception as e:
        logger.error(f"[GET /profit-centers/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next profit center code")


# ── GET /profit-centers/{id} ──────────────────────────────────
@router.get("/{profit_center_id}", response_model=ProfitCenterResponse)
def get_profit_center_by_id(profit_center_id: int, db: Session = Depends(get_db)):
    """Fetch a single profit center by ID."""
    try:
        row = _call_sp(db, "GETBYID", profit_center_id=profit_center_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Profit Center with ID {profit_center_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /profit-centers/{profit_center_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch profit center")


# ── POST /profit-centers/ ─────────────────────────────────────
@router.post("/", response_model=ProfitCenterResponse, status_code=status.HTTP_201_CREATED)
def create_profit_center(payload: ProfitCenterCreate, db: Session = Depends(get_db)):
    """Create a profit center. ProfitCenterCode is auto-generated (PFT-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().ProfitCenterId
        db.commit()

        created = _call_sp(db, "GETBYID", profit_center_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /profit-centers] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create profit center")


# ── PUT /profit-centers/{id} ──────────────────────────────────
@router.put("/{profit_center_id}", response_model=ProfitCenterResponse)
def update_profit_center(profit_center_id: int, payload: ProfitCenterUpdate, db: Session = Depends(get_db)):
    """Update an existing profit center. ProfitCenterCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            profit_center_id=profit_center_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", profit_center_id=profit_center_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Profit Center with ID {profit_center_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /profit-centers/{profit_center_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update profit center")


# ── PATCH /profit-centers/{id}/toggle-status ──────────────────
@router.patch("/{profit_center_id}/toggle-status", response_model=ProfitCenterResponse)
def toggle_profit_center_status(profit_center_id: int, db: Session = Depends(get_db)):
    """Toggle profit center status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", profit_center_id=profit_center_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", profit_center_id=profit_center_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Profit Center with ID {profit_center_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /profit-centers/{profit_center_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle profit center status")


# ── DELETE /profit-centers/{id} ───────────────────────────────
@router.delete("/{profit_center_id}", status_code=status.HTTP_200_OK)
def delete_profit_center(profit_center_id: int, db: Session = Depends(get_db)):
    """Soft delete a profit center (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", profit_center_id=profit_center_id, updated_by="Admin")
        db.commit()
        return {"message": f"Profit Center {profit_center_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /profit-centers/{profit_center_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete profit center")
