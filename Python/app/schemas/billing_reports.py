from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ConsolidatedBillItem(BaseModel):
    ItemCode: str
    ItemDescription: str
    Quantity: int
    UnitPrice: float
    Subtotal: float

class ConsolidatedBillResponse(BaseModel):
    Type: str = Field(description="Will be either 'OP' or 'IP'")
    BillNumber: str
    PatientId: str
    PatientName: str
    Date: datetime
    TotalAmount: float
    Discount: float
    Tax: float
    NetAmount: float
    PaymentMode: str
    PaymentStatus: str
    Items: Optional[List[ConsolidatedBillItem]] = None
