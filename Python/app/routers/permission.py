import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.permission import PermissionCreate, PermissionUpdate, PermissionResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/permissions", tags=["Permission Master"])

SP_NAME = "SpMasterPermission"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":                 opt,
        "p_PermissionId":        kw.get("permission_id"),
        "p_Role":                kw.get("role"),
        "p_Module":              kw.get("module"),
        "p_SubModule":           kw.get("sub_module"),
        "p_CanView":             kw.get("can_view"),
        "p_CanCreate":           kw.get("can_create"),
        "p_CanEdit":             kw.get("can_edit"),
        "p_CanDelete":           kw.get("can_delete"),
        "p_CanPrint":            kw.get("can_print"),
        "p_CanExport":           kw.get("can_export"),
        "p_CanImport":           kw.get("can_import"),
        "p_CanApprove":          kw.get("can_approve"),
        "p_AllowApiAccess":      kw.get("allow_api_access"),
        "p_AllowDataExport":     kw.get("allow_data_export"),
        "p_AllowBulkOperations": kw.get("allow_bulk_operations"),
        "p_AllowAuditLogAccess": kw.get("allow_audit_log_access"),
        "p_Status":              kw.get("status"),
        "p_Remarks":             kw.get("remarks"),
        "p_CreatedBy":           kw.get("created_by"),
        "p_UpdatedBy":           kw.get("updated_by"),
        "p_Search":              kw.get("search"),
        "p_RoleFilter":          kw.get("role_filter"),
        "p_ModuleFilter":        kw.get("module_filter"),
        "p_StatusFilter":        kw.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_PermissionId, :p_Role, :p_Module, :p_SubModule, :p_CanView, :p_CanCreate,
            :p_CanEdit, :p_CanDelete, :p_CanPrint, :p_CanExport, :p_CanImport, :p_CanApprove,
            :p_AllowApiAccess, :p_AllowDataExport, :p_AllowBulkOperations, :p_AllowAuditLogAccess,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_RoleFilter,
            :p_ModuleFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                  row.PermissionId,
        "permissionCode":      row.PermissionCode,
        "role":                row.Role,
        "module":              row.Module,
        "subModule":           row.SubModule,
        "canView":             bool(row.CanView),
        "canCreate":           bool(row.CanCreate),
        "canEdit":             bool(row.CanEdit),
        "canDelete":           bool(row.CanDelete),
        "canPrint":            bool(row.CanPrint),
        "canExport":           bool(row.CanExport),
        "canImport":           bool(row.CanImport),
        "canApprove":          bool(row.CanApprove),
        "allowApiAccess":      bool(row.AllowApiAccess),
        "allowDataExport":     bool(row.AllowDataExport),
        "allowBulkOperations": bool(row.AllowBulkOperations),
        "allowAuditLogAccess": bool(row.AllowAuditLogAccess),
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdDate":         row.CreatedDate,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_dup(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_ROLE_MODULE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A permission for this Role and Module already exists")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate permission")


def _kw(payload) -> dict:
    return dict(
        role=payload.role, module=payload.module, sub_module=payload.subModule,
        can_view=int(payload.canView), can_create=int(payload.canCreate),
        can_edit=int(payload.canEdit), can_delete=int(payload.canDelete),
        can_print=int(payload.canPrint), can_export=int(payload.canExport),
        can_import=int(payload.canImport), can_approve=int(payload.canApprove),
        allow_api_access=int(payload.allowApiAccess), allow_data_export=int(payload.allowDataExport),
        allow_bulk_operations=int(payload.allowBulkOperations), allow_audit_log_access=int(payload.allowAuditLogAccess),
        status=payload.status.value, remarks=payload.remarks,
    )


@router.get("/", response_model=List[PermissionResponse])
def get_permissions(search: Optional[str] = None, role_filter: Optional[str] = None,
                    module_filter: Optional[str] = None, status_filter: Optional[str] = None,
                    db: Session = Depends(get_db)):
    try:
        rows = _call_sp(db, "GET", search=search, role_filter=role_filter,
                        module_filter=module_filter, status_filter=status_filter).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /permissions] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch permissions")


@router.get("/next-code")
def next_code(db: Session = Depends(get_db)):
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"permissionCode": row.PermissionCode if row else "PRM-001"}
    except Exception as e:
        logger.error(f"[GET /permissions/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate code")


@router.get("/by-role/{role}", response_model=List[PermissionResponse])
def get_by_role(role: str, db: Session = Depends(get_db)):
    """Return every active permission for a role (used to gate the UI at login)."""
    try:
        rows = _call_sp(db, "GETBYROLE", role=role).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /permissions/by-role/{role}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch role permissions")


@router.get("/{permission_id}", response_model=PermissionResponse)
def get_by_id(permission_id: int, db: Session = Depends(get_db)):
    try:
        row = _call_sp(db, "GETBYID", permission_id=permission_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /permissions/{permission_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch permission")


@router.post("/", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
def create_permission(payload: PermissionCreate, db: Session = Depends(get_db)):
    try:
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin", **_kw(payload)).fetchone().PermissionId
        db.commit()
        return _map_row(_call_sp(db, "GETBYID", permission_id=new_id).fetchone())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /permissions] Error: {e}")
        _raise_if_dup(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create permission")


@router.put("/{permission_id}", response_model=PermissionResponse)
def update_permission(permission_id: int, payload: PermissionUpdate, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "UPDATE", permission_id=permission_id, updated_by=payload.updatedBy or "Admin", **_kw(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", permission_id=permission_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /permissions/{permission_id}] Error: {e}")
        _raise_if_dup(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update permission")


@router.patch("/{permission_id}/toggle-status", response_model=PermissionResponse)
def toggle_status(permission_id: int, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "TOGGLESTATUS", permission_id=permission_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", permission_id=permission_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /permissions/{permission_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle status")


@router.delete("/{permission_id}", status_code=status.HTTP_200_OK)
def delete_permission(permission_id: int, db: Session = Depends(get_db)):
    try:
        _call_sp(db, "DELETE", permission_id=permission_id, updated_by="Admin")
        db.commit()
        return {"message": f"Permission {permission_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /permissions/{permission_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete permission")
