from pydantic import BaseModel
from typing import Optional

class ApprovalRecordResponse(BaseModel):
    id: str
    originalId: int
    documentType: str
    refNo: str
    date: str
    departmentOrVendor: str
    amount: float
    requestedBy: str
    priority: str
    status: str

    class Config:
        from_attributes = True

class ApprovalStatusUpdate(BaseModel):
    status: str
