from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import decimal

class AdvanceBillResponse(BaseModel):
    AdvanceId: int
    AdvanceNo: str
    ServiceOrderId: int
    UHID: str
    TotalAmount: float
    PaidAmount: float
    PaymentMode: Optional[str]
    PaymentReference: Optional[str]
    Status: str
    CreatedAt: datetime
    
class AdvancePaymentRequest(BaseModel):
    PaymentMode: str
    PaymentReference: Optional[str] = None
    Amount: float
