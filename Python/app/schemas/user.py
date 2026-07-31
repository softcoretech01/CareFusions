import re
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
EMPLOYEE_MAX = 150
USERNAME_MAX = 100
ROLE_MAX     = 100
DEPT_MAX     = 100
HOSPITAL_MAX = 150
BRANCH_MAX   = 150
EMAIL_MAX    = 150
MOBILE_MAX   = 20
REMARKS_MAX  = 500
PWD_MIN      = 8
PWD_MAX      = 128
EXPIRY_MAX   = 3650   # days

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_TIME_RE  = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


# ── Shared field rules (no password here) ────────────────────
class _UserFields(BaseModel):
    employee:            str            = Field(max_length=EMPLOYEE_MAX)
    username:            str            = Field(max_length=USERNAME_MAX)
    role:                str            = Field(max_length=ROLE_MAX)
    department:          Optional[str]  = Field(default=None, max_length=DEPT_MAX)
    hospital:            Optional[str]  = Field(default=None, max_length=HOSPITAL_MAX)
    branch:              Optional[str]  = Field(default=None, max_length=BRANCH_MAX)
    email:               str            = Field(max_length=EMAIL_MAX)
    mobileNumber:        Optional[str]  = Field(default=None, max_length=MOBILE_MAX)
    forcePasswordChange: bool           = True
    passwordExpiry:      int            = 90
    twoFactorAuth:       bool           = False
    loginAllowedFrom:    str            = "00:00"
    loginAllowedTo:      str            = "23:59"
    status:              StatusEnum     = StatusEnum.Active
    remarks:             Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("employee", "username", "role")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("department", "hospital", "branch", "mobileNumber", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("email")
    @classmethod
    def valid_email(cls, v: str) -> str:
        v = v.strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("A valid Email is required")
        return v

    @field_validator("loginAllowedFrom", "loginAllowedTo")
    @classmethod
    def valid_time(cls, v: str) -> str:
        v = v.strip()
        if not _TIME_RE.match(v):
            raise ValueError("Login time must be in HH:MM (24-hour) format")
        return v

    @field_validator("passwordExpiry")
    @classmethod
    def expiry_in_range(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Password Expiry cannot be negative")
        if v > EXPIRY_MAX:
            raise ValueError(f"Password Expiry cannot exceed {EXPIRY_MAX} days")
        return v

    @model_validator(mode="after")
    def check_login_window(self):
        if self.loginAllowedTo <= self.loginAllowedFrom:
            raise ValueError("Login 'allowed to' must be after 'allowed from'")
        return self


def _validate_password(v: str) -> str:
    if len(v) < PWD_MIN:
        raise ValueError(f"Password must be at least {PWD_MIN} characters")
    if len(v) > PWD_MAX:
        raise ValueError(f"Password cannot exceed {PWD_MAX} characters")
    return v


# ── Request: Create (password required) ──────────────────────
class UserCreate(_UserFields):
    password:  str
    createdBy: Optional[str] = None

    @field_validator("password")
    @classmethod
    def pwd(cls, v: str) -> str:
        return _validate_password(v)


# ── Request: Update (password optional — blank keeps existing) ─
class UserUpdate(_UserFields):
    password:  Optional[str] = None
    updatedBy: Optional[str] = None

    @field_validator("password")
    @classmethod
    def pwd(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return _validate_password(v)


# ── Response (NEVER includes the password / hash) ────────────
class UserResponse(BaseModel):
    id:                  int
    userId:              str            # UserCode (USR-001)
    employee:            str
    username:            str
    role:                str
    department:          Optional[str]
    hospital:            Optional[str]
    branch:              Optional[str]
    email:               str
    mobileNumber:        Optional[str]
    forcePasswordChange: bool
    passwordExpiry:      int
    twoFactorAuth:       bool
    loginAllowedFrom:    str
    loginAllowedTo:      str
    status:              str
    remarks:             Optional[str]
    createdBy:           Optional[str]
    createdDate:         Optional[datetime]
    updatedBy:           Optional[str]
    updatedDate:         Optional[datetime]

    class Config:
        from_attributes = True
