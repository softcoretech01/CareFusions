import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.audit_log import AuditLogCreate, AuditLogResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit-logs", tags=["Audit Log Master"])

SP_NAME = "SpAuditLog"

# Server-side page cap. Audit logs grow unbounded, so a GET never returns more
# than this many rows — the frontend surfaces a note when the cap is hit.
MAX_LIMIT = 500


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":               opt,
        "p_AuditLogId":        kw.get("audit_log_id"),
        "p_UserName":          kw.get("user_name"),
        "p_EmployeeName":      kw.get("employee_name"),
        "p_Role":              kw.get("role"),
        "p_Department":        kw.get("department"),
        "p_Module":            kw.get("module"),
        "p_ScreenName":        kw.get("screen_name"),
        "p_Action":            kw.get("action"),
        "p_RecordId":          kw.get("record_id"),
        "p_TransactionNumber": kw.get("transaction_number"),
        "p_IpAddress":         kw.get("ip_address"),
        "p_Device":            kw.get("device"),
        "p_Browser":           kw.get("browser"),
        "p_OperatingSystem":   kw.get("operating_system"),
        "p_SessionId":         kw.get("session_id"),
        "p_OldValues":         kw.get("old_values"),
        "p_NewValues":         kw.get("new_values"),
        "p_ChangeSummary":     kw.get("change_summary"),
        "p_Status":            kw.get("status"),
        "p_FailureReason":     kw.get("failure_reason"),
        "p_Search":            kw.get("search"),
        "p_ModuleFilter":      kw.get("module_filter"),
        "p_ActionFilter":      kw.get("action_filter"),
        "p_StatusFilter":      kw.get("status_filter"),
        "p_RoleFilter":        kw.get("role_filter"),
        "p_FromDate":          kw.get("from_date"),
        "p_ToDate":            kw.get("to_date"),
        "p_Limit":             kw.get("limit"),
        "p_Offset":            kw.get("offset"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_AuditLogId, :p_UserName, :p_EmployeeName, :p_Role, :p_Department,
            :p_Module, :p_ScreenName, :p_Action, :p_RecordId, :p_TransactionNumber,
            :p_IpAddress, :p_Device, :p_Browser, :p_OperatingSystem, :p_SessionId,
            :p_OldValues, :p_NewValues, :p_ChangeSummary, :p_Status, :p_FailureReason,
            :p_Search, :p_ModuleFilter, :p_ActionFilter, :p_StatusFilter, :p_RoleFilter,
            :p_FromDate, :p_ToDate, :p_Limit, :p_Offset
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                row.AuditLogId,
        "auditId":           row.AuditId,
        "timestamp":         row.AuditTimestamp,
        "userName":          row.UserName,
        "employeeName":      row.EmployeeName,
        "role":              row.Role,
        "department":        row.Department,
        "module":            row.Module,
        "screenName":        row.ScreenName,
        "action":            row.Action,
        "recordId":          row.RecordId,
        "transactionNumber": row.TransactionNumber,
        "ipAddress":         row.IpAddress,
        "device":            row.Device,
        "browser":           row.Browser,
        "operatingSystem":   row.OperatingSystem,
        "sessionId":         row.SessionId,
        "oldValues":         row.OldValues,
        "newValues":         row.NewValues,
        "changeSummary":     row.ChangeSummary,
        "status":            row.Status,
        "failureReason":     row.FailureReason,
    }


@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    search: Optional[str] = None,
    module_filter: Optional[str] = None,
    action_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    role_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = MAX_LIMIT,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Fetch audit logs (read-only, newest first). Capped at MAX_LIMIT rows per request."""
    try:
        limit = max(1, min(limit, MAX_LIMIT))
        offset = max(0, offset)
        rows = _call_sp(db, "GET", search=search, module_filter=module_filter,
                        action_filter=action_filter, status_filter=status_filter,
                        role_filter=role_filter, from_date=from_date, to_date=to_date,
                        limit=limit, offset=offset).fetchall()
        if len(rows) == limit:
            logger.info(f"[GET /audit-logs] returned the {limit}-row cap; more may exist (use offset/filters).")
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /audit-logs] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch audit logs")


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
def get_audit_log_by_id(audit_log_id: int, db: Session = Depends(get_db)):
    """Fetch a single audit entry by its internal ID."""
    try:
        row = _call_sp(db, "GETBYID", audit_log_id=audit_log_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Audit entry {audit_log_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /audit-logs/{audit_log_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch audit entry")


@router.post("/", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
def create_audit_log(payload: AuditLogCreate, db: Session = Depends(get_db)):
    """Append an audit entry. AuditId (ADT-YYYYMMDD-NNN) and timestamp are server-generated.

    This is the ONLY write operation — audit entries can never be updated or deleted.
    """
    try:
        new_id = _call_sp(
            db, "INSERT",
            user_name=payload.userName,
            employee_name=payload.employeeName,
            role=payload.role,
            department=payload.department,
            module=payload.module,
            screen_name=payload.screenName,
            action=payload.action,
            record_id=payload.recordId,
            transaction_number=payload.transactionNumber,
            ip_address=payload.ipAddress,
            device=payload.device,
            browser=payload.browser,
            operating_system=payload.operatingSystem,
            session_id=payload.sessionId,
            old_values=payload.oldValues,
            new_values=payload.newValues,
            change_summary=payload.changeSummary,
            status=payload.status.value,
            failure_reason=payload.failureReason,
        ).fetchone().AuditLogId
        db.commit()
        created = _call_sp(db, "GETBYID", audit_log_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /audit-logs] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record audit entry")


# NOTE: There are intentionally NO PUT / PATCH / DELETE routes.
# An audit trail must be tamper-evident: entries are append-only and immutable.
