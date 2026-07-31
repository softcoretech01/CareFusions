import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.core.security import hash_password
from app.schemas.user import UserCreate, UserUpdate, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["User Master"])

SP_NAME = "SpMasterUser"


def _call_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt":                 opt,
        "p_UserId":              kw.get("user_id"),
        "p_Employee":            kw.get("employee"),
        "p_Username":            kw.get("username"),
        "p_PasswordHash":        kw.get("password_hash"),
        "p_Role":                kw.get("role"),
        "p_Department":          kw.get("department"),
        "p_Hospital":            kw.get("hospital"),
        "p_Branch":              kw.get("branch"),
        "p_Email":               kw.get("email"),
        "p_MobileNumber":        kw.get("mobile_number"),
        "p_ForcePasswordChange": kw.get("force_password_change"),
        "p_PasswordExpiry":      kw.get("password_expiry"),
        "p_TwoFactorAuth":       kw.get("two_factor_auth"),
        "p_LoginAllowedFrom":    kw.get("login_allowed_from"),
        "p_LoginAllowedTo":      kw.get("login_allowed_to"),
        "p_Status":              kw.get("status"),
        "p_Remarks":             kw.get("remarks"),
        "p_CreatedBy":           kw.get("created_by"),
        "p_UpdatedBy":           kw.get("updated_by"),
        "p_Search":              kw.get("search"),
        "p_RoleFilter":          kw.get("role_filter"),
        "p_DepartmentFilter":    kw.get("department_filter"),
        "p_StatusFilter":        kw.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_UserId, :p_Employee, :p_Username, :p_PasswordHash, :p_Role,
            :p_Department, :p_Hospital, :p_Branch, :p_Email, :p_MobileNumber,
            :p_ForcePasswordChange, :p_PasswordExpiry, :p_TwoFactorAuth,
            :p_LoginAllowedFrom, :p_LoginAllowedTo, :p_Status, :p_Remarks,
            :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_RoleFilter,
            :p_DepartmentFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                  row.UserId,
        "userId":              row.UserCode,
        "employee":            row.Employee,
        "username":            row.Username,
        "role":                row.Role,
        "department":          row.Department,
        "hospital":            row.Hospital,
        "branch":              row.Branch,
        "email":               row.Email,
        "mobileNumber":        row.MobileNumber,
        "forcePasswordChange": bool(row.ForcePasswordChange),
        "passwordExpiry":      row.PasswordExpiry,
        "twoFactorAuth":       bool(row.TwoFactorAuth),
        "loginAllowedFrom":    row.LoginAllowedFrom,
        "loginAllowedTo":      row.LoginAllowedTo,
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "updatedBy":           row.UpdatedBy,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_USERNAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Username is already taken")
    if "DUPLICATE_EMAIL" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Email is already registered")
    if "DUPLICATE_ACTIVE_EMPLOYEE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="This employee already has an active user account")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A user with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        employee=payload.employee,
        username=payload.username,
        role=payload.role,
        department=payload.department,
        hospital=payload.hospital,
        branch=payload.branch,
        email=payload.email,
        mobile_number=payload.mobileNumber,
        force_password_change=int(payload.forcePasswordChange),
        password_expiry=payload.passwordExpiry,
        two_factor_auth=int(payload.twoFactorAuth),
        login_allowed_from=payload.loginAllowedFrom,
        login_allowed_to=payload.loginAllowedTo,
        status=payload.status.value,
        remarks=payload.remarks,
    )


@router.get("/", response_model=List[UserResponse])
def get_users(search: Optional[str] = None, role_filter: Optional[str] = None,
              department_filter: Optional[str] = None, status_filter: Optional[str] = None,
              db: Session = Depends(get_db)):
    """Fetch all users (password hash is never selected)."""
    try:
        rows = _call_sp(db, "GET", search=search, role_filter=role_filter,
                        department_filter=department_filter, status_filter=status_filter).fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /users] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch users")


@router.get("/next-code")
def get_next_user_code(db: Session = Depends(get_db)):
    """Preview the UserCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"userId": row.UserCode if row else "USR-001"}
    except Exception as e:
        logger.error(f"[GET /users/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate next user code")


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """Fetch a single user by ID."""
    try:
        row = _call_sp(db, "GETBYID", user_id=user_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /users/{user_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch user")


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Create a user. UserCode is auto-generated; the password is hashed (PBKDF2) before storage."""
    try:
        pwd_hash = hash_password(payload.password)
        new_id = _call_sp(db, "INSERT", created_by=payload.createdBy or "Admin",
                          password_hash=pwd_hash, **_payload_kwargs(payload)).fetchone().UserId
        db.commit()
        created = _call_sp(db, "GETBYID", user_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /users] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    """Update a user. UserCode is immutable. A blank password keeps the existing one."""
    try:
        pwd_hash = hash_password(payload.password) if payload.password else None
        _call_sp(db, "UPDATE", user_id=user_id, updated_by=payload.updatedBy or "Admin",
                 password_hash=pwd_hash, **_payload_kwargs(payload))
        db.commit()
        updated = _call_sp(db, "GETBYID", user_id=user_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /users/{user_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")


@router.patch("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(user_id: int, db: Session = Depends(get_db)):
    """Toggle a user's status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", user_id=user_id, updated_by="Admin")
        db.commit()
        updated = _call_sp(db, "GETBYID", user_id=user_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /users/{user_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to toggle user status")


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Soft delete a user (IsDeleted=1)."""
    try:
        _call_sp(db, "DELETE", user_id=user_id, updated_by="Admin")
        db.commit()
        return {"message": f"User {user_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /users/{user_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")
