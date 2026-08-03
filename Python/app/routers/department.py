import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/departments", tags=["Department Master"])

SP_NAME = "SpMasterDepartment"


# ── GET /next-code ─────────────────────────────────────────
@router.get("/next-code")
def get_next_code(db: Session = Depends(get_db)):
    """Fetch the next auto-generated code from the backend."""
    try:
        result = _call_sp(db, "GETNEXTCODE")
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to generate next code")
        return {"nextCode": row[0]}
    except Exception as e:
        logger.error(f"[GET /next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch next code")


# ── Helper: call SpMasterDepartment ──────────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    """Execute SpMasterDepartment with the given p_Opt and field values."""
    params = {
        "p_Opt":            opt,
        "p_DepartmentId":   kwargs.get("department_id"),
        "p_DepartmentName": kwargs.get("department_name"),
        "p_DepartmentType": kwargs.get("department_type"),
        "p_Description":    kwargs.get("description"),
        "p_DepartmentHead": kwargs.get("department_head"),
        "p_Status":         kwargs.get("status"),
        "p_CreatedBy":      kwargs.get("created_by"),
        "p_UpdatedBy":      kwargs.get("updated_by"),
        "p_Search":         kwargs.get("search"),
        "p_StatusFilter":   kwargs.get("status_filter"),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_DepartmentId, :p_DepartmentName, :p_DepartmentType,
            :p_Description, :p_DepartmentHead, :p_Status,
            :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


# ── Helper: map DB row → DepartmentResponse dict ─────────────
def _map_row(row) -> dict:
    return {
        "id":             row.DepartmentId,
        "departmentCode": row.DepartmentCode,
        "departmentName": row.DepartmentName,
        "departmentType": row.DepartmentType,
        "description":    row.Description,
        "departmentHead": row.DepartmentHead,
        "status":         row.Status,
        "createdBy":      row.CreatedBy,
        "createdDate":    row.CreatedDate,
        "updatedBy":      row.UpdatedBy,
        "updatedDate":    row.UpdatedDate,
    }


# ── GET /departments/ ─────────────────────────────────────────
@router.get("/", response_model=List[DepartmentResponse])
def get_departments(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all departments with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        rows = result.fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /departments] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch departments")


# ── GET /departments/{id} ─────────────────────────────────────
@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department_by_id(department_id: int, db: Session = Depends(get_db)):
    """Fetch a single department by ID."""
    try:
        result = _call_sp(db, "GETBYID", department_id=department_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Department with ID {department_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /departments/{department_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch department")


# ── POST /departments/ ────────────────────────────────────────
@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    """Create a new department. DepartmentCode is auto-generated (DPT-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            department_name=payload.departmentName,
            department_type=payload.departmentType.value,
            description=payload.description,
            department_head=payload.departmentHead,
            status=payload.status.value,
            created_by=payload.createdBy or "Admin",
        )
        row = result.fetchone()
        new_id = row.DepartmentId
        db.commit()

        fetch = _call_sp(db, "GETBYID", department_id=new_id)
        created = fetch.fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /departments] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create department: {str(e)}")


# ── PUT /departments/{id} ─────────────────────────────────────
@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)):
    """Update an existing department. DepartmentCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            department_id=department_id,
            department_name=payload.departmentName,
            department_type=payload.departmentType.value,
            description=payload.description,
            department_head=payload.departmentHead,
            status=payload.status.value,
            updated_by=payload.updatedBy or "Admin",
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", department_id=department_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Department with ID {department_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /departments/{department_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update department: {str(e)}")


# ── PATCH /departments/{id}/toggle-status ─────────────────────
@router.patch("/{department_id}/toggle-status", response_model=DepartmentResponse)
def toggle_department_status(department_id: int, db: Session = Depends(get_db)):
    """Toggle department status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", department_id=department_id, updated_by="Admin")
        db.commit()

        fetch = _call_sp(db, "GETBYID", department_id=department_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Department with ID {department_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /departments/{department_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to toggle department status: {str(e)}")


# ── DELETE /departments/{id} ──────────────────────────────────
@router.delete("/{department_id}", status_code=status.HTTP_200_OK)
def delete_department(department_id: int, db: Session = Depends(get_db)):
    """Soft delete a department (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", department_id=department_id, updated_by="Admin")
        db.commit()
        return {"message": f"Department {department_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /departments/{department_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete department: {str(e)}")
