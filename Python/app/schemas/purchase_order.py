from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class PurchaseOrderItemCreate(BaseModel):
    itemId: int
    itemName: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    orderedQty: int
    uom: Optional[str] = Field(None, max_length=50)
    rate: Optional[float] = 0.00
    discount: Optional[float] = 0.00
    gst: Optional[float] = 0.00
    amount: Optional[float] = 0.00


class PurchaseOrderCreate(BaseModel):
    poNumber: str = Field(..., max_length=50)
    poDate: date
    prNo: Optional[str] = Field(None, max_length=50)
    quotationNo: Optional[str] = Field(None, max_length=50)
    vendorId: int
    vendorName: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    billingAddress: Optional[str] = Field(None, max_length=500)
    shippingAddress: Optional[str] = Field(None, max_length=500)
    paymentTerms: Optional[str] = Field(None, max_length=255)
    deliveryTerms: Optional[str] = Field(None, max_length=255)
    expectedDelivery: date
    currency: Optional[str] = Field("INR", max_length=50)
    totalAmount: Optional[float] = 0.00
    status: Optional[str] = Field("Draft", max_length=50)
    items: List[PurchaseOrderItemCreate] = []


class PurchaseOrderUpdate(PurchaseOrderCreate):
    pass


class PurchaseOrderItemResponse(PurchaseOrderItemCreate):
    pass


class PurchaseOrderResponse(PurchaseOrderCreate):
    id: int
    createdBy: Optional[str] = None
    createdDate: Optional[datetime] = None
    modifiedBy: Optional[str] = None
    modifiedDate: Optional[datetime] = None
    isActive: Optional[bool] = True
    
    class Config:
        from_attributes = True
