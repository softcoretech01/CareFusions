from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class PurchaseReturnItemCreate(BaseModel):
    itemId: int
    itemName: Optional[str] = Field(None, max_length=255)
    receivedQty: Optional[int] = 0
    returnQty: Optional[int] = 0
    reason: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = Field(None, max_length=500)

class PurchaseReturnCreate(BaseModel):
    returnNo: str = Field(..., max_length=50)
    grnNo: str = Field(..., max_length=50)
    vendorId: int
    vendorName: Optional[str] = Field(None, max_length=255)
    store: Optional[str] = Field(None, max_length=255)
    returnDate: date
    reason: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field("Draft", max_length=50)
    items: List[PurchaseReturnItemCreate] = []

class PurchaseReturnUpdate(PurchaseReturnCreate):
    pass

class PurchaseReturnResponse(PurchaseReturnCreate):
    id: int
    createdBy: Optional[str] = None
    createdDate: Optional[datetime] = None
    modifiedBy: Optional[str] = None
    modifiedDate: Optional[datetime] = None
    isActive: Optional[bool] = True
    
    class Config:
        from_attributes = True
