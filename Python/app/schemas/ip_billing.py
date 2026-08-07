from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class IpBillItemBase(BaseModel):
    ItemCode: str = Field(None, max_length=50)
    ItemDescription: str = Field(..., max_length=200)
    Quantity: int = Field(..., gt=0)
    UnitPrice: float = Field(..., ge=0)
    Subtotal: float = Field(..., ge=0)

class IpBillCreate(BaseModel):
    BillNumber: str = Field(..., max_length=20)
    Uhid: str = Field(..., max_length=20)
    PatientName: str = Field(..., max_length=100)
    MobileNumber: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    TotalAmount: float = Field(..., ge=0)
    Discount: float = Field(default=0, ge=0)
    Tax: float = Field(default=0, ge=0)
    NetAmount: float = Field(..., ge=0)
    PaymentMode: str = Field(default="Cash", max_length=50)
    PaymentStatus: str = Field(default="Pending", max_length=50)
    InsuranceClaimedAmount: float = Field(default=0, ge=0)
    PatientBalance: float = Field(default=0, ge=0)
    IsInsurancePaid: bool = Field(default=False)
    Items: List[IpBillItemBase]

class IpBillItemResponse(IpBillItemBase):
    IpBillItemId: int
    IpBillId: int

class IpBillResponse(BaseModel):
    IpBillId: int
    BillNumber: str
    Uhid: str
    PatientName: str
    MobileNumber: str
    BillDate: datetime
    TotalAmount: float
    Discount: float
    Tax: float
    NetAmount: float
    PaymentMode: str
    PaymentStatus: str
    InsuranceClaimedAmount: float
    PatientBalance: float
    IsInsurancePaid: bool
    Items: Optional[List[IpBillItemResponse]] = None
