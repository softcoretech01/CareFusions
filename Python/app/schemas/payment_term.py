from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
NAME_MAX   = 100
DESC_MAX   = 500
CREDIT_MAX = 3650   # days (~10 years)


# ── Shared field rules ───────────────────────────────────────
class _PaymentTermFields(BaseModel):
    paymentTermName: str            = Field(max_length=NAME_MAX)
    creditDays:      int            = 0
    description:     Optional[str]  = Field(default=None, max_length=DESC_MAX)
    status:          StatusEnum     = StatusEnum.Active

    @field_validator("paymentTermName")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Payment Term Name is required and cannot be blank")
        return v.strip()

    @field_validator("description")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("creditDays")
    @classmethod
    def credit_in_range(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Credit Days cannot be negative")
        if v > CREDIT_MAX:
            raise ValueError(f"Credit Days cannot exceed {CREDIT_MAX}")
        return v


# ── Request: Create ──────────────────────────────────────────
class PaymentTermCreate(_PaymentTermFields):
    createdBy: Optional[str] = None


# ── Request: Update ──────────────────────────────────────────
class PaymentTermUpdate(_PaymentTermFields):
    updatedBy: Optional[str] = None


# ── Response ─────────────────────────────────────────────────
class PaymentTermResponse(BaseModel):
    id:              int
    paymentTermName: str
    creditDays:      int
    description:     Optional[str]
    status:          str
    createdBy:       Optional[str]
    createdDate:     Optional[datetime]
    updatedBy:       Optional[str]
    updatedDate:     Optional[datetime]

    class Config:
        from_attributes = True
