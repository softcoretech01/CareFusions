from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class CurrencyEnum(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    INR = "INR"


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Request: Create ──────────────────────────────────────────
class HospitalCreate(BaseModel):
    code:            str
    name:            str
    legalName:       str
    registrationNo:  str
    gstVatNo:        Optional[str] = None
    panTinNo:        Optional[str] = None
    contactNumber:   str
    alternateNumber: Optional[str] = None
    email:           EmailStr
    website:         Optional[str] = None
    address1:        str
    address2:        Optional[str] = None
    country:         str
    state:           str
    city:            str
    postalCode:      str
    currency:        CurrencyEnum = CurrencyEnum.USD
    financialYear:   str
    timeZone:        str
    status:          StatusEnum   = StatusEnum.Active
    remarks:         Optional[str] = None

    @field_validator("code", "name", "legalName", "registrationNo",
                     "contactNumber", "address1", "country", "state",
                     "city", "postalCode", "financialYear", "timeZone")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()


# ── Request: Update ──────────────────────────────────────────
class HospitalUpdate(BaseModel):
    name:            str
    legalName:       str
    registrationNo:  str
    gstVatNo:        Optional[str] = None
    panTinNo:        Optional[str] = None
    contactNumber:   str
    alternateNumber: Optional[str] = None
    email:           EmailStr
    website:         Optional[str] = None
    address1:        str
    address2:        Optional[str] = None
    country:         str
    state:           str
    city:            str
    postalCode:      str
    currency:        CurrencyEnum = CurrencyEnum.USD
    financialYear:   str
    timeZone:        str
    status:          StatusEnum   = StatusEnum.Active
    remarks:         Optional[str] = None


# ── Response ─────────────────────────────────────────────────
class HospitalResponse(BaseModel):
    id:              int
    code:            str
    name:            str
    legalName:       str
    registrationNo:  str
    gstVatNo:        Optional[str]
    panTinNo:        Optional[str]
    contactNumber:   str
    alternateNumber: Optional[str]
    email:           str
    website:         Optional[str]
    address1:        str
    address2:        Optional[str]
    country:         str
    state:           str
    city:            str
    postalCode:      str
    currency:        str
    financialYear:   str
    timeZone:        str
    status:          str
    remarks:         Optional[str]
    createdDate:     Optional[datetime]
    modifiedDate:    Optional[datetime]

    class Config:
        from_attributes = True
