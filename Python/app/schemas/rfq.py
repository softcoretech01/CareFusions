from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class RFQItemCreate(BaseModel):
    itemId: int
    # Which master owns itemId; inherited from the upstream document
    # so the type survives PR -> RFQ -> Quotation -> PO -> GRN -> Return.
    itemType: Optional[str] = None
    itemCode: Optional[str] = Field(None, max_length=50)
    itemName: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    requestedQty: int
    uom: Optional[str] = Field(None, max_length=50)
    targetPrice: Optional[float] = 0.00
    expectedDeliveryDays: Optional[int] = 0
    remarks: Optional[str] = Field(None, max_length=500)


class RFQCreate(BaseModel):
    rfqNo: str = Field(..., max_length=50)
    rfqDate: date
    prNumber: str = Field(..., max_length=50)
    department: Optional[str] = Field(None, max_length=100)
    requiredDate: Optional[date] = None
    dueDate: date
    deliveryLocation: Optional[str] = Field(None, max_length=100)
    terms: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field("Draft", max_length=50)
    createdBy: Optional[str] = Field("Admin", max_length=100)
    vendorCount: Optional[int] = 0
    items: List[RFQItemCreate] = []
    vendors: List[int] = []


class RFQUpdate(RFQCreate):
    pass


class RFQItemResponse(RFQItemCreate):
    id: Optional[int] = None
    
    class Config:
        from_attributes = True


class RFQResponse(RFQCreate):
    id: int
    createdDate: Optional[datetime] = None
    updatedBy: Optional[str] = None
    updatedDate: Optional[datetime] = None
    isActive: Optional[bool] = True
    items: List[RFQItemResponse] = []
    
    class Config:
        from_attributes = True
