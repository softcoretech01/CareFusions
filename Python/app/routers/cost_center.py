import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.cost_center import CostCenterCreate, CostCenterUpdate, CostCenterResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cost-centers", tags=["Cost Center Master"])

SP_NAME = "SpMasterCostCenter"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":              opt,
        "p_CostCenterId":     kwargs.get("cost_center_id"),
        "p_CostCenterName":   kwargs.get("cost_center_name"),
        "p_Department":       kwargs.get("department"),
        "p_Manager":          kwargs.get("manager"),
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
            :p_Opt, :p_CostCenterId, :p_CostCenterName, :p_Department, :p_Manager,
            :p_Description, :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_DepartmentFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":             row.CostCenterId,
        "costCenterCode": row.CostCenterCode,
        "costCenterName": row.CostCenterName,
        "department":     row.Department,
        "manager":        row.Manager,
        "description":    row.Description,
        "status":         row.Status,
        "remarks":        row.Remarks,
        "createdBy":      row.CreatedBy,
        "createdDate":    row.CreatedDate,
        "updatedBy":      row.UpdatedBy,
        "updatedDate":    row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_COSTCENTER_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Cost Center Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_CostCenter_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Cost Center Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A cost center with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        cost_center_name=payload.costCenterName,
        department=payload.department,
        manager=payload.manager,
        description=payload.description,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /cost-centers/ ────────────────────────────────────────
@router.get("/", response_model=List[CostCenterResponse])
def get_cost_centers(
    search: Optional[str] = None,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all cost centers with optional search and department/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, department_filter=department, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /cost-centers] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch cost centers")


# ── GET /cost-centers/next-code ───────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_cost_center_code(db: Session = Depends(get_db)):
    """Preview the CostCenterCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"costCenterCode": row.CostCenterCode if row else "CST-001"}
    except Exception as e:
        logger.error(f"[GET /cost-centers/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next cost center code")


# ── GET /cost-centers/{id} ────────────────────────────────────
@router.get("/{cost_center_id}", response_model=CostCenterResponse)
def get_cost_center_by_id(cost_center_id: int, db: Session = Depends(get_db)):
    """Fetch a single cost center by ID."""
    try:
        row = _call_sp(db, "GETBYID", cost_center_id=cost_center_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Cost Center with ID {cost_center_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /cost-centers/{cost_center_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch cost center")


# ── POST /cost-centers/ ───────────────────────────────────────
@router.post("/", response_model=CostCenterResponse, status_code=status.HTTP_201_CREATED)
def create_cost_center(payload: CostCenterCreate, db: Session = Depends(get_db)):
    """Create a cost center. CostCenterCode is auto-generated (CST-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().CostCenterId
        db.commit()

        created = _call_sp(db, "GETBYID", cost_center_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /cost-centers] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create cost center")


# ── PUT /cost-centers/{id} ────────────────────────────────────
@router.put("/{cost_center_id}", response_model=CostCenterResponse)
def update_cost_center(cost_center_id: int, payload: CostCenterUpdate, db: Session = Depends(get_db)):
    """Update an existing cost center. CostCenterCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            cost_center_id=cost_center_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", cost_center_id=cost_center_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Cost Center with ID {cost_center_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /cost-centers/{cost_center_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update cost center")


# ── PATCH /cost-centers/{id}/toggle-status ────────────────────
@router.patch("/{cost_center_id}/toggle-status", response_model=CostCenterResponse)
def toggle_cost_center_status(cost_center_id: int, db: Session = Depends(get_db)):
    """Toggle cost center status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", cost_center_id=cost_center_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", cost_center_id=cost_center_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Cost Center with ID {cost_center_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /cost-centers/{cost_center_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle cost center status")


# ── DELETE /cost-centers/{id} ─────────────────────────────────
@router.delete("/{cost_center_id}", status_code=status.HTTP_200_OK)
def delete_cost_center(cost_center_id: int, db: Session = Depends(get_db)):
    """Soft delete a cost center (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", cost_center_id=cost_center_id, updated_by="Admin")
        db.commit()
        return {"message": f"Cost Center {cost_center_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /cost-centers/{cost_center_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete cost center")
