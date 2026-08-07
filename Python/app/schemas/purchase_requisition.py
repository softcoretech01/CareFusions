from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class PRItemBase(BaseModel):
    id: Optional[str] = None # Frontend dummy id
    itemId: int
    itemCode: Optional[str] = None
    itemName: Optional[str] = None
    category: Optional[str] = None
    subCategory: Optional[str] = None
    availableStock: Optional[int] = 0
    requestedQty: int = Field(..., gt=0)
    uom: Optional[str] = None
    estimatedPrice: Optional[float] = 0.0
    estimatedAmount: Optional[float] = 0.0
    store: str = Field(..., max_length=100)
    remarks: Optional[str] = None

class PurchaseRequisitionBase(BaseModel):
    prNo: str = Field(..., max_length=50)
    requisitionDate: date
    department: str = Field(..., max_length=100)
    requestedBy: str = Field(..., max_length=100)
    priority: Optional[str] = Field("Normal", max_length=20)
    requiredDate: date
    purpose: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = Field(None, max_length=500)
    totalItems: Optional[int] = 0
    estimatedCost: Optional[float] = 0.0
    approvalStatus: Optional[str] = Field("Draft", max_length=50)
    currentStage: Optional[str] = Field("Draft", max_length=50)
    createdBy: Optional[str] = Field("Admin", max_length=100)

class PurchaseRequisitionCreate(PurchaseRequisitionBase):
    items: List[PRItemBase] = Field(..., min_items=1)

class PurchaseRequisitionUpdate(PurchaseRequisitionBase):
    id: int
    items: List[PRItemBase] = Field(..., min_items=1)

class PRItemResponse(PRItemBase):
    PrItemId: int
    PrId: int

class PurchaseRequisitionResponse(PurchaseRequisitionBase):
    id: int
    items: List[PRItemBase] = []
