"""Pydantic schemas for the Pharmacy (retail sales / POS) module."""
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class PaymentModeEnum(str, Enum):
    cash = "Cash"
    card = "Card"
    upi = "UPI"
    pending = "Pending"


class PaymentStatusEnum(str, Enum):
    paid = "Paid"
    unpaid = "Unpaid"
    pending = "Pending"
    refunded = "Refunded"


class SaleItemIn(BaseModel):
    medicineId: int = Field(..., gt=0)
    medicineName: str = Field(..., min_length=1, max_length=200)
    quantity: int = Field(..., gt=0, le=100000)
    unitPrice: float = Field(..., ge=0)
    subtotal: float = Field(..., ge=0)


class SaleCreate(BaseModel):
    patientName: Optional[str] = Field(None, max_length=150)
    patientRef: Optional[str] = Field(None, max_length=50)
    totalAmount: float = Field(..., ge=0)
    discount: float = Field(0, ge=0)
    tax: float = Field(0, ge=0)
    netAmount: float = Field(..., ge=0)
    paymentMode: PaymentModeEnum = PaymentModeEnum.cash
    paymentStatus: PaymentStatusEnum = PaymentStatusEnum.pending
    items: List[SaleItemIn] = Field(..., min_length=1)
    user: Optional[str] = Field("Admin", max_length=100)

    @field_validator("patientRef")
    @classmethod
    def phone_digits_only(cls, v):
        # PatientRef is a phone (or UHID) for walk-in retail; if it looks like a
        # phone (all digits) enforce a sane length, otherwise allow UHID text.
        if v and v.isdigit() and not (7 <= len(v) <= 15):
            raise ValueError("Phone number must be 7–15 digits")
        return v


class StockUpsert(BaseModel):
    batchNo: Optional[str] = Field(None, max_length=50)
    quantity: int = Field(..., ge=0)
    unitPrice: float = Field(..., ge=0)
    expiryDate: Optional[str] = Field(None, max_length=10)  # 'YYYY-MM-DD'
    minStockLevel: int = Field(10, ge=0)
    user: Optional[str] = Field("Admin", max_length=100)


class StockAdjust(BaseModel):
    delta: int  # +restock / -consume
    user: Optional[str] = Field("Admin", max_length=100)


class StatusUpdate(BaseModel):
    paymentStatus: PaymentStatusEnum
    user: Optional[str] = Field("Admin", max_length=100)
