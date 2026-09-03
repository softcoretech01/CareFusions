from pydantic import BaseModel, Field
from typing import Optional, List, Any, Literal
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
    # PROPrice is a UNIT price, the same basis as MasterPrice. Quantity is NOT
    # accepted from the client: it is read from the stored order item, so the
    # line total cannot be inflated by posting a different quantity.
    PROPrice: float
    AuthorizedDiscount: float = 0.0
    # Advisory only. The backend caps insurance cover at the amount an APPROVED
    # pre-authorization linked to this order actually authorises, so a client
    # cannot zero out the patient's share by claiming insurance pays for it.
    InsuranceCoveredAmount: float = 0.0
    # Ignored on input -- kept so existing clients that send it still validate.
    # The value stored is always recomputed by the backend.
    PatientResponsibility: float = 0.0
    # Per-item decision, so an order can be part-approved and part-rejected in a
    # single review instead of being all-or-nothing.
    Decision: Literal["APPROVED", "REJECTED"] = "APPROVED"
    RejectionReason: Optional[str] = None

class PROOrderApproveRequest(BaseModel):
    Items: List[PROOrderItemUpdate]
    # Accepted for backwards compatibility with existing clients. The advance
    # bill is always raised for the full patient responsibility, because service
    # release requires that amount to be collected in full -- billing less than
    # it would leave the patient paid-up on paper and still blocked.
    AdvanceAmount: Optional[float] = None

class PROOrderRejectRequest(BaseModel):
    Reason: str = Field(min_length=1, max_length=500)

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
    RejectionReason: Optional[str] = None
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
    RejectionReason: Optional[str] = None
    ReviewedBy: Optional[str] = None
    ReviewedAt: Optional[datetime] = None
    PaymentStatus: Optional[PaymentStatusEnum] = None
    FinancialStatus: Optional[FinancialStatusEnum] = None
    ServiceStatus: Optional[ServiceStatusEnum] = None
    AuthorizationStatus: Optional[AuthorizationStatusEnum] = None
    # How much insurance an approved pre-authorization actually permits on this
    # order. Zero when nothing is linked, which is what makes the PRO screen
    # able to show the truth instead of an editable guess.
    AuthorizedInsuranceCap: Optional[float] = None
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
    ChangedByRole: Optional[str] = None
    CreatedAt: datetime

class CreateServiceOrderItem(BaseModel):
    ItemType: str
    ItemId: Any
    ItemName: str
    Quantity: int = Field(default=1, ge=1)
    UOM: Optional[str] = "Unit"
    # Advisory. The backend looks the price up in the service master and uses
    # that; a client-supplied price is never trusted as the master price.
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
