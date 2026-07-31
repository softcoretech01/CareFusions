from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
CODE_MAX  = 20
NAME_MAX  = 100
SHORT_MAX = 20


# ── Shared field rules ───────────────────────────────────────
class _UomFields(BaseModel):
    uomCode:   str        = Field(max_length=CODE_MAX)
    uomName:   str        = Field(max_length=NAME_MAX)
    shortName: str        = Field(max_length=SHORT_MAX)
    status:    StatusEnum = StatusEnum.Active

    @field_validator("uomCode", "uomName", "shortName")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()


# ── Request: Create ──────────────────────────────────────────
class UomCreate(_UomFields):
    createdBy: Optional[str] = None


# ── Request: Update ──────────────────────────────────────────
class UomUpdate(_UomFields):
    updatedBy: Optional[str] = None


# ── Response ─────────────────────────────────────────────────
class UomResponse(BaseModel):
    id:          int
    uomCode:     str
    uomName:     str
    shortName:   str
    status:      str
    createdBy:   Optional[str]
    createdDate: Optional[datetime]
    updatedBy:   Optional[str]
    updatedDate: Optional[datetime]

    class Config:
        from_attributes = True
