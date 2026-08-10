from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
CODE_MAX   = 10
NAME_MAX   = 100
SYMBOL_MAX = 10


# ── Shared field rules ───────────────────────────────────────
class _CurrencyFields(BaseModel):
    currencyCode: str        = Field(max_length=CODE_MAX)
    currencyName: str        = Field(max_length=NAME_MAX)
    symbol:       str        = Field(max_length=SYMBOL_MAX)
    # Units of this currency per one unit of the base currency. gt=0 because a
    # zero or negative rate would silently zero out every converted amount.
    exchangeRate: Decimal    = Field(default=Decimal("1"), gt=0, max_digits=14, decimal_places=6)
    baseCurrency: bool       = False
    status:       StatusEnum = StatusEnum.Active

    @field_validator("currencyCode")
    @classmethod
    def code_valid(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Currency Code is required and cannot be blank")
        return v

    @field_validator("currencyName", "symbol")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("exchangeRate")
    @classmethod
    def rate_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Exchange Rate must be greater than zero")
        return v


# ── Request: Create ──────────────────────────────────────────
class CurrencyCreate(_CurrencyFields):
    createdBy: Optional[str] = None


# ── Request: Update ──────────────────────────────────────────
class CurrencyUpdate(_CurrencyFields):
    updatedBy: Optional[str] = None


# ── Response ─────────────────────────────────────────────────
class CurrencyResponse(BaseModel):
    id:           int
    currencyCode: str
    currencyName: str
    symbol:       str
    exchangeRate: Decimal
    baseCurrency: bool
    status:       str
    createdBy:    Optional[str]
    createdDate:  Optional[datetime]
    updatedBy:    Optional[str]
    updatedDate:  Optional[datetime]

    class Config:
        from_attributes = True
