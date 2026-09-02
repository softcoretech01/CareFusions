from pydantic import BaseModel, Field
from typing import Optional, List, Any
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
    # Amount the PRO wants collected up front, capped at the order's patient responsibility.
    # Omitted or <= 0 keeps the previous behaviour of raising the full amount as the advance.
    AdvanceAmount: Optional[float] = None

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
    PaymentStatus: Optional[PaymentStatusEnum] = None
    FinancialStatus: Optional[FinancialStatusEnum] = None
    ServiceStatus: Optional[ServiceStatusEnum] = None
    AuthorizationStatus: Optional[AuthorizationStatusEnum] = None

class PROOrderResponse(BaseModel):
    ServiceOrderId: int
    OrderNo: str
    OrderType: str
    SourceModule: str
    UHID: str
    PatientName: Optional[str] = None
    DoctorName: Optional[str] = None
    DepartmentName: Optional[str] = None
    OrderDate: datetime
    PROStatus: PROStatusEnum
    PaymentStatus: Optional[PaymentStatusEnum] = None
    FinancialStatus: Optional[FinancialStatusEnum] = None
    Items: List[PROOrderItemResponse]

class PRODashboardKPIs(BaseModel):
    pending_reviews: int
    opd_pending: int
    ipd_pending: int
    operations_pending: int
    payment_pending: int
    insurance_pending: int
    approved_today: int
    rejected_today: int
    services_released: int
    services_awaiting_clearance: int

class PROAuditLogResponse(BaseModel):
    LogId: int
    ServiceOrderId: int
    ServiceOrderItemId: Optional[int] = None
    UHID: Optional[str] = None
    PatientName: Optional[str] = None
    Action: str
    PreviousValue: Optional[str] = None
    NewValue: Optional[str] = None
    Reason: Optional[str] = None
    ChangedBy: str
    CreatedAt: datetime

class CreateServiceOrderItem(BaseModel):
    ItemType: str
    ItemId: Any
    ItemName: str
    Quantity: int = 1
    UOM: Optional[str] = "Unit"
    MasterPrice: float = 0.0

class CreateServiceOrderRequest(BaseModel):
    SourceModule: str
    UHID: str
    EncounterId: Optional[int] = None
    AdmissionId: Optional[int] = None
    DoctorId: Optional[int] = None
    DepartmentId: Optional[int] = None
    OrderType: str
    Items: List[CreateServiceOrderItem]

class AdvancePaymentRequest(BaseModel):
    PaidAmount: float
    TotalAmount: float
    PaymentMode: str = "Cash"
    PaymentReference: Optional[str] = None
