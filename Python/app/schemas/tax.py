from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, date
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Field limits ─────────────────────────────────────────────
GST_MIN = 0
GST_MAX = 100


# ── Shared field rules ───────────────────────────────────────
# TaxCode + CGST/SGST/IGST are DERIVED from gstPercentage by the backend and are
# NOT accepted from the client (prevents inconsistent splits).
class _TaxFields(BaseModel):
    gstPercentage: int
    effectiveDate: date
    status:        StatusEnum = StatusEnum.Active

    @field_validator("gstPercentage")
    @classmethod
    def gst_in_range(cls, v: int) -> int:
        if v < GST_MIN or v > GST_MAX:
            raise ValueError(f"GST Percentage must be between {GST_MIN} and {GST_MAX}")
        return v


# ── Request: Create (code + splits auto-generated) ───────────
class TaxCreate(_TaxFields):
    createdBy: Optional[str] = None


# ── Request: Update ──────────────────────────────────────────
class TaxUpdate(_TaxFields):
    updatedBy: Optional[str] = None


# ── Response ─────────────────────────────────────────────────
class TaxResponse(BaseModel):
    id:            int
    taxCode:       str
    gstPercentage: int
    cgst:          float
    sgst:          float
    igst:          float
    effectiveDate: Optional[str]
    status:        str
    createdBy:     Optional[str]
    createdDate:   Optional[datetime]
    updatedBy:     Optional[str]
    updatedDate:   Optional[datetime]

    class Config:
        from_attributes = True
