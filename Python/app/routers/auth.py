import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.core.security import verify_password
from app.core.tokens import issue_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


def _permissions_for_role(db: Session, role: str):
    rows = db.execute(text("""
        SELECT Module, SubModule, CanView, CanCreate, CanEdit, CanDelete, CanPrint,
               CanExport, CanImport, CanApprove, AllowApiAccess, AllowDataExport,
               AllowBulkOperations, AllowAuditLogAccess
        FROM Master_Permission
        WHERE IsDeleted = 0 AND Status = 'Active' AND Role = :role
    """), {"role": role}).fetchall()
    return [{
        "module":              r.Module,
        "subModule":           r.SubModule,
        "canView":             bool(r.CanView),
        "canCreate":           bool(r.CanCreate),
        "canEdit":             bool(r.CanEdit),
        "canDelete":           bool(r.CanDelete),
        "canPrint":            bool(r.CanPrint),
        "canExport":           bool(r.CanExport),
        "canImport":           bool(r.CanImport),
        "canApprove":          bool(r.CanApprove),
        "allowApiAccess":      bool(r.AllowApiAccess),
        "allowDataExport":     bool(r.AllowDataExport),
        "allowBulkOperations": bool(r.AllowBulkOperations),
        "allowAuditLogAccess": bool(r.AllowAuditLogAccess),
    } for r in rows]


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user (against the Users master) and return their role permissions.

    On success returns { token, user, permissions } — the frontend uses `permissions`
    to gate the sidebar and routes.
    """
    username = (payload.username or "").strip()
    if not username or not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required")

    try:
        row = db.execute(text("""
            SELECT UserId, UserCode, Employee, Username, PasswordHash, Role, Department,
                   Hospital, Branch, Status
            FROM Master_User
            WHERE Username = :u AND IsDeleted = 0
            LIMIT 1
        """), {"u": username}).fetchone()
    except Exception as e:
        logger.error(f"[POST /auth/login] lookup error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed")

    # Same generic message whether the user is missing or the password is wrong.
    if not row or not verify_password(payload.password, row.PasswordHash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    if row.Status != "Active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is inactive")

    permissions = _permissions_for_role(db, row.Role)

    return {
        # A signed, expiring token — the old value was an unstored random string
        # that no request could ever be checked against.
        "token": issue_token(row.UserId, row.Username, row.Role),
        "user": {
            "id":         row.UserId,
            "userId":     row.UserCode,
            "employee":   row.Employee,
            "username":   row.Username,
            "role":       row.Role,
            "department": row.Department,
            "hospital":   row.Hospital,
            "branch":     row.Branch,
        },
        "permissions": permissions,
    }
