import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


class GenderEnum(str, Enum):
    Male   = "Male"
    Female = "Female"
    Other  = "Other"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
EMPCODE_MAX = 50
NAME_MAX    = 100
AREA_MAX    = 150
MOBILE_LEN  = 10
EMAIL_MAX   = 150
ADDRESS_MAX = 255
SHIFT_MAX   = 50
EXP_MAX     = 60          # years; anything beyond this is a typo, not a career

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class _HousekeepingFields(BaseModel):
    name:             str            = Field(max_length=NAME_MAX)
    gender:           Optional[GenderEnum] = None
    hospital:         Optional[str]  = Field(default=None, max_length=150)
    branch:           Optional[str]  = Field(default=None, max_length=150)
    assignedArea:     str            = Field(max_length=AREA_MAX)
    mobile:           str
    email:            Optional[str]  = Field(default=None, max_length=EMAIL_MAX)
    address:          Optional[str]  = Field(default=None, max_length=ADDRESS_MAX)
    joiningDate:      Optional[date] = None
    shift:            str            = Field(max_length=SHIFT_MAX)
    experience:       Optional[int]  = None
    manager:          Optional[str]  = Field(default=None, max_length=NAME_MAX)

    photo:            Optional[str]  = None
    idProof:          Optional[str]  = None
    status:           Optional[StatusEnum] = StatusEnum.Active
    remarks:          Optional[str]  = None

    @field_validator("name", "manager")
    @classmethod
    def person_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        # Letters and spaces, plus the punctuation that appears in real names.
        if not all(c.isalpha() or c in " .'-" for c in v):
            raise ValueError("Name may only contain letters, spaces and . ' -")
        return v

    @field_validator("name")
    @classmethod
    def name_required(cls, v: Optional[str]) -> str:
        if not v:
            raise ValueError("Staff Name is required and cannot be blank")
        return v

    @field_validator("mobile")
    @classmethod
    def mobile_valid(cls, v: str) -> str:
        v = (v or "").strip()
        if not v.isdigit():
            raise ValueError("Mobile must contain digits only")
        if len(v) != MOBILE_LEN:
            raise ValueError(f"Mobile must be exactly {MOBILE_LEN} digits")
        return v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if not _EMAIL_RE.match(v):
            raise ValueError("Email is not a valid address")
        return v

    @field_validator("experience")
    @classmethod
    def experience_valid(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v < 0:
            raise ValueError("Experience cannot be negative")
        if v > EXP_MAX:
            raise ValueError(f"Experience cannot exceed {EXP_MAX} years")
        return v

    @field_validator("joiningDate")
    @classmethod
    def joining_not_future(cls, v: Optional[date]) -> Optional[date]:
        # A future joining date would put the person on the roster before they
        # actually start.
        if v and v > date.today():
            raise ValueError("Joining Date cannot be in the future")
        return v

    @field_validator("assignedArea", "shift")
    @classmethod
    def required_text(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("This field is required and cannot be blank")
        return v

    @field_validator("hospital", "branch", "address", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class HousekeepingCreate(_HousekeepingFields):
    createdBy: Optional[str] = "System"


class HousekeepingUpdate(_HousekeepingFields):
    modifiedBy: Optional[str] = "System"


class HousekeepingResponse(BaseModel):
    id:               int
    housekeepingCode: str
    name:             str
    gender:           Optional[str] = None
    hospital:         Optional[str] = None
    branch:           Optional[str] = None
    assignedArea:     str
    mobile:           str
    email:            Optional[str] = None
    address:          Optional[str] = None
    joiningDate:      Optional[date] = None
    shift:            str
    experience:       Optional[int] = None
    manager:          Optional[str] = None

    photo:            Optional[str] = None
    idProof:          Optional[str] = None
    remarks:          Optional[str] = None

    createdBy:        Optional[str] = None
    createdDate:      Optional[datetime] = None
    modifiedBy:       Optional[str] = None
    modifiedDate:     Optional[datetime] = None

    class Config:
        from_attributes = True
