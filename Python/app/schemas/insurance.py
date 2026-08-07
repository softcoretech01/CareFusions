"""Pydantic schemas for the Insurance module."""
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class PolicyStatusEnum(str, Enum):
    active = "Active"
    expired = "Expired"


class PreAuthStatusEnum(str, Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"


class ClaimStatusEnum(str, Enum):
    submitted = "Submitted"
    in_process = "In Process"
    settled = "Settled"
    denied = "Denied"


def _name_ok(v: Optional[str]) -> Optional[str]:
    if v and not all(c.isalpha() or c in " .'-" for c in v):
        raise ValueError("Name may contain letters, spaces, . ' - only")
    return v


class PolicyUpsert(BaseModel):
    uhid: str = Field(..., min_length=1, max_length=30)
    patientName: str = Field(..., min_length=1, max_length=150)
    policyNumber: str = Field(..., min_length=1, max_length=50)
    providerId: Optional[int] = Field(None, gt=0)
    insurerName: str = Field(..., min_length=1, max_length=150)
    tpaId: Optional[int] = Field(None, gt=0)
    tpaName: Optional[str] = Field(None, max_length=150)
    planName: Optional[str] = Field(None, max_length=150)
    status: PolicyStatusEnum = PolicyStatusEnum.active
    validUntil: Optional[str] = Field(None, max_length=10)   # YYYY-MM-DD
    sumInsured: float = Field(0, ge=0)
    balanceAmount: Optional[float] = Field(None, ge=0)
    networkHospital: bool = True
    copayPercentage: float = Field(0, ge=0, le=100)
    deductible: float = Field(0, ge=0)
    user: Optional[str] = Field("Admin", max_length=100)

    @field_validator("patientName")
    @classmethod
    def check_name(cls, v):
        return _name_ok(v)


class PreAuthCreate(BaseModel):
    uhid: str = Field(..., min_length=1, max_length=30)
    patientName: str = Field(..., min_length=1, max_length=150)
    providerId: Optional[int] = Field(None, gt=0)
    insurerName: str = Field(..., min_length=1, max_length=150)
    diagnosis: Optional[str] = Field(None, max_length=500)
    requestedAmount: float = Field(..., ge=0)
    user: Optional[str] = Field("Admin", max_length=100)

    @field_validator("patientName")
    @classmethod
    def check_name(cls, v):
        return _name_ok(v)


class PreAuthUpdate(PreAuthCreate):
    status: Optional[PreAuthStatusEnum] = None


class PreAuthStatusUpdate(BaseModel):
    status: PreAuthStatusEnum
    approvedAmount: Optional[float] = Field(None, ge=0)
    decisionReason: Optional[str] = Field(None, max_length=500)
    user: Optional[str] = Field("Admin", max_length=100)


class ClaimCreate(BaseModel):
    uhid: str = Field(..., min_length=1, max_length=30)
    patientName: str = Field(..., min_length=1, max_length=150)
    providerId: Optional[int] = Field(None, gt=0)
    insurerName: str = Field(..., min_length=1, max_length=150)
    preAuthId: Optional[int] = Field(None, gt=0)
    admissionId: Optional[int] = Field(None, gt=0)
    diagnosis: Optional[str] = Field(None, max_length=500)
    billedAmount: float = Field(..., ge=0)
    preAuthAmount: float = Field(0, ge=0)
    claimedAmount: float = Field(..., ge=0)
    user: Optional[str] = Field("Admin", max_length=100)

    @field_validator("patientName")
    @classmethod
    def check_name(cls, v):
        return _name_ok(v)


class ClaimStatusUpdate(BaseModel):
    status: ClaimStatusEnum
    approvedAmount: Optional[float] = Field(None, ge=0)
    reason: Optional[str] = Field(None, max_length=500)
    user: Optional[str] = Field("Admin", max_length=100)


class AppealFile(BaseModel):
    appealReason: Optional[str] = Field(None, max_length=500)
    user: Optional[str] = Field("Admin", max_length=100)


class AppealResolve(BaseModel):
    approvedAmount: Optional[float] = Field(None, ge=0)
    user: Optional[str] = Field("Admin", max_length=100)


class SettlementReconcile(BaseModel):
    utrReference: Optional[str] = Field(None, max_length=50)
    user: Optional[str] = Field("Admin", max_length=100)
