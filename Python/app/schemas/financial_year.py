from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime, date
from enum import Enum


class StatusEnum(str, Enum):
    Open   = "Open"
    Closed = "Closed"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
NAME_MAX    = 50
REMARKS_MAX = 500


# ── Shared field rules ───────────────────────────────────────
class _FinancialYearFields(BaseModel):
    financialYear:          str            = Field(max_length=NAME_MAX)
    startDate:              date
    endDate:                date
    isCurrentFinancialYear: bool           = False
    allowBackdatedEntry:    bool           = False
    closingDate:            Optional[date] = None
    status:                 StatusEnum     = StatusEnum.Open
    remarks:                Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("financialYear")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Financial Year is required and cannot be blank")
        return v.strip()

    @field_validator("remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @model_validator(mode="after")
    def check_dates(self):
        if self.endDate <= self.startDate:
            raise ValueError("End Date must be after Start Date")
        if self.closingDate and self.closingDate < self.endDate:
            raise ValueError("Closing Date cannot be before the End Date")
        return self


# ── Request: Create ──────────────────────────────────────────
class FinancialYearCreate(_FinancialYearFields):
    createdBy: Optional[str] = None


# ── Request: Update ──────────────────────────────────────────
class FinancialYearUpdate(_FinancialYearFields):
    updatedBy: Optional[str] = None


# ── Response ─────────────────────────────────────────────────
class FinancialYearResponse(BaseModel):
    id:                     int
    financialYear:          str
    startDate:              Optional[str]
    endDate:                Optional[str]
    isCurrentFinancialYear: bool
    allowBackdatedEntry:    bool
    closingDate:            Optional[str]
    status:                 str
    remarks:                Optional[str]
    createdBy:              Optional[str]
    createdDate:            Optional[datetime]
    updatedBy:              Optional[str]
    updatedDate:            Optional[datetime]

    class Config:
        from_attributes = True
