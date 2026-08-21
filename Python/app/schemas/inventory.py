"""Pydantic schemas for the Inventory (stock movement) module."""
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator


class DocTypeEnum(str, Enum):
    receipt = "RECEIPT"
    issue = "ISSUE"
    transfer = "TRANSFER"
    ret = "RETURN"
    adjustment = "ADJUSTMENT"


class DocumentItemIn(BaseModel):
    itemId: int = Field(..., gt=0)
    # Which master owns itemId. Defaults to MEDICAL_ITEM so callers written
    # before the unified ledger keep posting exactly as they did; the SP
    # validates the pair against the owning master either way.
    itemType: str = Field(default="MEDICAL_ITEM",
                          pattern="^(MEDICINE|MEDICAL_ITEM|NON_MEDICAL)$")
    batchNo: Optional[str] = Field(None, max_length=50)
    mfgDate: Optional[str] = Field(None, max_length=10)      # YYYY-MM-DD
    expiryDate: Optional[str] = Field(None, max_length=10)   # YYYY-MM-DD
    quantity: float
    rate: float = Field(0, ge=0)
    uom: Optional[str] = Field(None, max_length=50)
    remarks: Optional[str] = Field(None, max_length=255)

    @field_validator("quantity")
    @classmethod
    def qty_nonzero(cls, v):
        if v == 0:
            raise ValueError("Quantity cannot be zero")
        return v


class DocumentCreate(BaseModel):
    docType: DocTypeEnum
    fromStoreId: Optional[int] = Field(None, gt=0)
    toStoreId: Optional[int] = Field(None, gt=0)
    departmentName: Optional[str] = Field(None, max_length=150)
    vendorName: Optional[str] = Field(None, max_length=150)
    referenceNo: Optional[str] = Field(None, max_length=50)
    requestedBy: Optional[str] = Field(None, max_length=150)
    approvedBy: Optional[str] = Field(None, max_length=150)
    reason: Optional[str] = Field(None, max_length=100)
    remarks: Optional[str] = Field(None, max_length=500)
    items: List[DocumentItemIn] = Field(..., min_length=1)
    user: Optional[str] = Field("Admin", max_length=100)

    @model_validator(mode="after")
    def check_stores(self):
        """Each document type needs the right store legs."""
        dt = self.docType
        if dt in (DocTypeEnum.receipt, DocTypeEnum.ret) and not self.toStoreId:
            raise ValueError(f"{dt.value} requires a destination store")
        if dt in (DocTypeEnum.issue, DocTypeEnum.adjustment) and not self.fromStoreId:
            raise ValueError(f"{dt.value} requires a source store")
        if dt == DocTypeEnum.transfer:
            if not self.fromStoreId or not self.toStoreId:
                raise ValueError("TRANSFER requires both source and destination stores")
            if self.fromStoreId == self.toStoreId:
                raise ValueError("Source and destination stores must differ")
        # Only adjustments may carry a negative quantity (a write-off).
        if dt != DocTypeEnum.adjustment and any(i.quantity < 0 for i in self.items):
            raise ValueError("Negative quantities are only allowed on an ADJUSTMENT")
        return self
