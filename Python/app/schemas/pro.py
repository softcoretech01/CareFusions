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
    # Orders sharing this number came from one clinical ordering event and are
    # reviewed together as a single row.
    OrderGroupNo: Optional[str] = None
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
    # The amount of cash actually being taken. Must be > 0 and is checked
    # against the outstanding balance the SERVER computes.
    PaidAmount: float = Field(gt=0)
    # Ignored. Kept so existing clients still validate: the amount owed is the
    # advance bill's TotalAmount, which the PRO approval set from the priced
    # items. Reading it from the request is what let {"TotalAmount": 1,
    # "PaidAmount": 1} mark a Rs.310,000 order fully paid.
    TotalAmount: Optional[float] = None
    PaymentMode: str = "Cash"
    PaymentReference: Optional[str] = None
    # Optional caller-supplied key. A retried POST carrying the same key returns
    # the original receipt instead of taking the money a second time.
    IdempotencyKey: Optional[str] = Field(default=None, max_length=120)
