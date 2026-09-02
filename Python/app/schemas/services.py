from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class OrderTypeEnum(str, Enum):
    LAB = "LAB"
    RADIOLOGY = "RADIOLOGY"
    OPERATION = "OPERATION"
    OTHER = "OTHER"

class SourceModuleEnum(str, Enum):
    OPD = "OPD"
    IPD = "IPD"
    EMERGENCY = "EMERGENCY"

class OrderStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class PROStatusEnum(str, Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class PaymentStatusEnum(str, Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    UNPAID = "UNPAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"

class FinancialStatusEnum(str, Enum):
    NOT_CLEARED = "NOT_CLEARED"
    PARTIALLY_CLEARED = "PARTIALLY_CLEARED"
    CLEARED = "CLEARED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"

class ServiceStatusEnum(str, Enum):
    NOT_RELEASED = "NOT_RELEASED"
    RELEASED = "RELEASED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class AuthorizationStatusEnum(str, Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    PARTIALLY_APPROVED = "PARTIALLY_APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class ReleaseStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    REVOKED = "REVOKED"


# ----------------------------------------
# Service Release Schemas
# ----------------------------------------

class ServiceReleaseBase(BaseModel):
    ServiceOrderItemId: int
    ReleasedBy: Optional[str] = None
    ReleaseStatus: ReleaseStatusEnum = ReleaseStatusEnum.ACTIVE
    ReleaseReason: Optional[str] = None

class ServiceReleaseCreate(ServiceReleaseBase):
    pass

class ServiceRelease(ServiceReleaseBase):
    ServiceReleaseId: int
    ReleaseDate: datetime
    IsDeleted: bool
    CreatedAt: datetime
    UpdatedAt: datetime

    class Config:
        from_attributes = True


# ----------------------------------------
# Service Order Item Schemas
# ----------------------------------------

class ServiceOrderItemBase(BaseModel):
    ItemType: str
    ItemId: str
    ItemName: str
    Quantity: int = 1
    UOM: Optional[str] = None
    MasterPrice: float = 0.0
    OriginalPrice: float = 0.0
    PROPrice: float = 0.0
    AuthorizedDiscount: float = 0.0
    GrossAmount: float = 0.0
    NetAmount: float = 0.0
    InsuranceCoveredAmount: float = 0.0
    PatientResponsibility: float = 0.0
    
    PROStatus: PROStatusEnum = PROStatusEnum.PENDING
    PaymentStatus: PaymentStatusEnum = PaymentStatusEnum.UNPAID
    FinancialStatus: FinancialStatusEnum = FinancialStatusEnum.NOT_CLEARED
    ServiceStatus: ServiceStatusEnum = ServiceStatusEnum.NOT_RELEASED
    AuthorizationStatus: AuthorizationStatusEnum = AuthorizationStatusEnum.NOT_REQUIRED

class ServiceOrderItemCreate(ServiceOrderItemBase):
    pass

class ServiceOrderItem(ServiceOrderItemBase):
    ServiceOrderItemId: int
    ServiceOrderId: int
    IsDeleted: bool
    CreatedAt: datetime
    UpdatedAt: datetime
    Releases: List[ServiceRelease] = []

    class Config:
        from_attributes = True


# ----------------------------------------
# Service Order Schemas
# ----------------------------------------

class ServiceOrderBase(BaseModel):
    OrderNo: str
    UHID: str
    EncounterId: Optional[int] = None
    AdmissionId: Optional[int] = None
    DoctorId: Optional[int] = None
    DepartmentId: Optional[int] = None
    OrderType: OrderTypeEnum
    SourceModule: SourceModuleEnum
    
    OrderStatus: OrderStatusEnum = OrderStatusEnum.ACTIVE
    PROStatus: PROStatusEnum = PROStatusEnum.PENDING
    PaymentStatus: PaymentStatusEnum = PaymentStatusEnum.UNPAID
    FinancialStatus: FinancialStatusEnum = FinancialStatusEnum.NOT_CLEARED
    ServiceStatus: ServiceStatusEnum = ServiceStatusEnum.NOT_RELEASED
    AuthorizationStatus: AuthorizationStatusEnum = AuthorizationStatusEnum.NOT_REQUIRED

class ServiceOrderCreate(ServiceOrderBase):
    Items: List[ServiceOrderItemCreate]

class ServiceOrder(ServiceOrderBase):
    ServiceOrderId: int
    OrderDate: datetime
    IsDeleted: bool
    CreatedBy: Optional[str] = None
    CreatedAt: datetime
    UpdatedBy: Optional[str] = None
    UpdatedAt: datetime
    Items: List[ServiceOrderItem] = []

    class Config:
        from_attributes = True
