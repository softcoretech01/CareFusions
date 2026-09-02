from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .services import (
    PROStatusEnum, 
    PaymentStatusEnum, 
    FinancialStatusEnum, 
    ServiceStatusEnum,
    AuthorizationStatusEnum
)

class PROOrderItemUpdate(BaseModel):
    ServiceOrderItemId: int
    PROPrice: float
    AuthorizedDiscount: float = 0.0
    InsuranceCoveredAmount: float = 0.0
    PatientResponsibility: float = 0.0
    
class PROOrderApproveRequest(BaseModel):
    Items: List[PROOrderItemUpdate]
    
class PROOrderItemResponse(BaseModel):
    ServiceOrderItemId: int
    ServiceOrderId: int
    ItemType: str
    ItemName: str
    Quantity: int
    MasterPrice: float
    OriginalPrice: float
    PROPrice: float
    AuthorizedDiscount: float
    GrossAmount: float
    NetAmount: float
    InsuranceCoveredAmount: float
    PatientResponsibility: float
    PROStatus: PROStatusEnum

class PROOrderResponse(BaseModel):
    ServiceOrderId: int
    OrderNo: str
    OrderType: str
    SourceModule: str
    UHID: str
    OrderDate: datetime
    PROStatus: PROStatusEnum
    Items: List[PROOrderItemResponse]
