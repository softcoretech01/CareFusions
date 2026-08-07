from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class VendorQuotationItemCreate(BaseModel):
    itemId: int
    itemName: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    qty: int
    quotedRate: Optional[float] = 0.00
    discountPercentage: Optional[float] = 0.00
    gstPercentage: Optional[float] = 0.00
    finalAmount: Optional[float] = 0.00
    remarks: Optional[str] = Field(None, max_length=500)


class VendorQuotationCreate(BaseModel):
    quotationNo: str = Field(..., max_length=50)
    rfqNo: str = Field(..., max_length=50)
    vendorId: int
    vendorName: Optional[str] = Field(None, max_length=255)
    quotationDate: date
    validityDate: date
    paymentTerms: Optional[str] = Field(None, max_length=255)
    deliveryDays: Optional[int] = 0
    totalAmount: Optional[float] = 0.00
    status: Optional[str] = Field("Draft", max_length=50)
    items: List[VendorQuotationItemCreate] = []


class VendorQuotationUpdate(VendorQuotationCreate):
    pass


class VendorQuotationItemResponse(VendorQuotationItemCreate):
    pass


class VendorQuotationResponse(VendorQuotationCreate):
    id: int
    createdBy: Optional[str] = None
    createdDate: Optional[datetime] = None
    modifiedBy: Optional[str] = None
    modifiedDate: Optional[datetime] = None
    isActive: Optional[bool] = True
    
    class Config:
        from_attributes = True

class QuotationApprove(BaseModel):
    rfqNo: str = Field(..., max_length=50)
    approvedQuotationNo: str = Field(..., max_length=50)
