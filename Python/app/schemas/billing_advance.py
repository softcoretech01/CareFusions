from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AdvanceBillResponse(BaseModel):
    AdvanceId: int
    AdvanceNo: str
    ServiceOrderId: int
    UHID: str
    PatientName: Optional[str] = None
    ServiceSummary: Optional[str] = None
    SourceModule: Optional[str] = None
    OrderNo: Optional[str] = None
    OrderType: Optional[str] = None
    PROStatus: Optional[str] = None
    AuthorizationStatus: Optional[str] = None

    # The full charge breakdown Billing needs to explain the bill to a patient.
    # Only the totals existed before, so the desk could not say what the gross
    # was, what was discounted, or what insurance was absorbing.
    GrossAmount: Optional[float] = None
    DiscountAmount: Optional[float] = None
    NetAmount: Optional[float] = None
    InsuranceCoveredAmount: Optional[float] = None
    PatientResponsibility: Optional[float] = None

    TotalAmount: float
    PaidAmount: float
    RefundedAmount: Optional[float] = 0.0
    Outstanding: Optional[float] = None

    PaymentMode: Optional[str] = None
    PaymentReference: Optional[str] = None
    Status: str
    CancelledReason: Optional[str] = None
    CreatedAt: datetime


class AdvancePaymentRequest(BaseModel):
    """Kept for callers that still import this name; the router defines its own
    input model with the idempotency key."""
    PaymentMode: str  # Cash, Card, UPI, BankTransfer
    PaymentReference: Optional[str] = None
    Amount: float
    IdempotencyKey: Optional[str] = None
