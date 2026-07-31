import logging
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/roles", tags=["Role Master"])

SP_NAME = "SpMasterRole"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                  opt,
        "p_RoleId":               kwargs.get("role_id"),
        "p_RoleName":             kwargs.get("role_name"),
        "p_Description":          kwargs.get("description"),
        "p_DefaultRole":          kwargs.get("default_role"),
        "p_CanCreateUsers":       kwargs.get("can_create_users"),
        "p_CanAssignPermissions": kwargs.get("can_assign_permissions"),
        "p_Status":               kwargs.get("status"),
        "p_Remarks":              kwargs.get("remarks"),
        "p_CreatedBy":            kwargs.get("created_by"),
        "p_UpdatedBy":            kwargs.get("updated_by"),
        "p_Search":               kwargs.get("search"),
        "p_StatusFilter":         kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_RoleId, :p_RoleName, :p_Description, :p_DefaultRole,
            :p_CanCreateUsers, :p_CanAssignPermissions, :p_Status, :p_Remarks,
            :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _user_counts(db: Session) -> Dict[str, int]:
    """Count active, non-deleted users per role (empty if the user table is absent)."""
    try:
        rows = db.execute(text(
            "SELECT Role, COUNT(*) AS n FROM Master_User "
            "WHERE IsDeleted = 0 AND Status = 'Active' GROUP BY Role"
        )).fetchall()
        return {r.Role: r.n for r in rows}
    except Exception:
        return {}


def _map_row(row, counts: Dict[str, int]) -> dict:
    return {
        "id":                   row.RoleId,
        "roleCode":             row.RoleCode,
        "roleName":             row.RoleName,
        "description":          row.Description,
        "numberOfUsers":        counts.get(row.RoleName, 0),
        "defaultRole":          bool(row.DefaultRole),
        "canCreateUsers":       bool(row.CanCreateUsers),
        "canAssignPermissions": bool(row.CanAssignPermissions),
        "status":               row.Status,
        "remarks":              row.Remarks,
        "createdBy":            row.CreatedBy,
        "createdDate":          row.CreatedDate,
        "updatedBy":            row.UpdatedBy,
        "updatedDate":          row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_ROLE_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Role Name must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Role_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Role Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A role with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        role_name=payload.roleName,
        description=payload.description,
        default_role=int(payload.defaultRole),
        can_create_users=int(payload.canCreateUsers),
        can_assign_permissions=int(payload.canAssignPermissions),
        status=payload.status.value,
        remarks=payload.remarks,
    )


@router.get("/", response_model=List[RoleResponse])
def get_roles(search: Optional[str] = None, status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch all roles (with live user counts)."""
    try:
        rows = _call_sp(db, "GET", search=search, status_filter=status_filter).fetchall()
        counts = _user_counts(db)
        return [_map_row(r, counts) for r in rows]
    except Exception as e:
        logger.error(f"[GET /roles] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch roles")


@router.get("/next-code")
def get_next_role_code(db: Session = Depends(get_db)):
    """Preview the RoleCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"roleCode": row.RoleCode if row else "ROL-001"}
    except Exception as e:
        logger.error(f"[GET /roles/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next role code")


@router.get("/{role_id}", response_model=RoleResponse)
def get_role_by_id(role_id: int, db: Session = Depends(get_db)):
    """Fetch a single role by ID."""
    try:
        row = _call_sp(db, "GETBYID", role_id=role_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {role_id} not found")
        return _map_row(row, _user_counts(db))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /roles/{role_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch role")


@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, db: Session = Depends(get_db)):
    """Create a role. RoleCode is auto-generated (ROL-001 format)."""
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_payload_kwargs(payload)).fetchone().RoleId
        db.commit()
        created = _call_sp(db, "GETBYID", role_id=new_id).fetchone()
        return _map_row(created, _user_counts(db))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /roles] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create role")


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, payload: RoleUpdate, db: Session = Depends(get_db)):
    """Update an existing role. RoleCode is immutable."""
    try:
        _call_sp(db, "UPDATE", role_id=role_id, updated_by=payload.updatedBy or "Admin", **_payload_kwargs(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", role_id=role_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {role_id} not found")
        return _map_row(updated, _user_counts(db))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /roles/{role_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update role")


@router.patch("/{role_id}/toggle-status", response_model=RoleResponse)
def toggle_role_status(role_id: int, db: Session = Depends(get_db)):
    """Toggle role status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", role_id=role_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", role_id=role_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with ID {role_id} not found")
        return _map_row(updated, _user_counts(db))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /roles/{role_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle role status")


@router.delete("/{role_id}", status_code=status.HTTP_200_OK)
def delete_role(role_id: int, db: Session = Depends(get_db)):
    """Soft delete a role (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", role_id=role_id, updated_by="Admin")
        db.commit()
        return {"message": f"Role {role_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /roles/{role_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete role")
