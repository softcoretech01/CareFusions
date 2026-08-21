from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class GoodsReceiptItemCreate(BaseModel):
    itemId: int
    # Which master owns itemId; inherited from the upstream document
    # so the type survives PR -> RFQ -> Quotation -> PO -> GRN -> Return.
    itemType: Optional[str] = None
    itemName: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    orderedQty: Optional[int] = 0
    receivedQty: Optional[int] = 0
    acceptedQty: Optional[int] = 0
    rejectedQty: Optional[int] = 0
    rate: Optional[float] = 0.00
    totalPrice: Optional[float] = 0.00
    batchNumber: Optional[str] = Field(None, max_length=100)
    expiryDate: Optional[str] = None
    manufactureDate: Optional[str] = None
    remarks: Optional[str] = Field(None, max_length=500)

class GoodsReceiptCreate(BaseModel):
    grnNo: str = Field(..., max_length=50)
    poNumber: str = Field(..., max_length=50)
    vendorId: int
    vendorName: Optional[str] = Field(None, max_length=255)
    store: Optional[str] = Field(None, max_length=255)
    receivedDate: date
    invoiceNumber: Optional[str] = Field(None, max_length=100)
    invoiceDate: Optional[date] = None
    transportDetails: Optional[str] = Field(None, max_length=255)
    lrNumber: Optional[str] = Field(None, max_length=100)
    vehicleNumber: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field("Draft", max_length=50)
    qcStatus: Optional[str] = Field("Pending", max_length=50)
    items: List[GoodsReceiptItemCreate] = []

class GoodsReceiptUpdate(GoodsReceiptCreate):
    pass

class GoodsReceiptResponse(GoodsReceiptCreate):
    id: int
    createdBy: Optional[str] = None
    createdDate: Optional[datetime] = None
    modifiedBy: Optional[str] = None
    modifiedDate: Optional[datetime] = None
    isActive: Optional[bool] = True
    
    class Config:
        from_attributes = True
