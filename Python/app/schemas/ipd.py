from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum


# ── Enums (mirror the DB) ────────────────────────────────────
class WardType(str, Enum):
    General = "General"
    SemiPrivate = "Semi-Private"
    Private = "Private"
    Deluxe = "Deluxe"
    ICU = "ICU"
    NICU = "NICU"
    PICU = "PICU"
    HDU = "HDU"
    OT = "OT"


class GenderRestriction(str, Enum):
    Male = "Male"
    Female = "Female"
    Any = "Any"


class BedStatus(str, Enum):
    Available = "Available"
    Reserved = "Reserved"
    Occupied = "Occupied"
    Cleaning = "Cleaning"
    Maintenance = "Maintenance"


class RequestStatus(str, Enum):
    Pending = "Pending"
    Admitted = "Admitted"
    Cancelled = "Cancelled"


# ── Field limits ─────────────────────────────────────────────
NAME_MAX = 150
UHID_MAX = 30
DIAG_MAX = 500


def _clean(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v or None


# ── Ward ─────────────────────────────────────────────────────
class WardCreate(BaseModel):
    wardName: str = Field(max_length=120)
    wardType: WardType
    genderRestriction: GenderRestriction = GenderRestriction.Any
    capacity: int
    status: str = "Active"
    user: Optional[str] = None

    @field_validator("wardName")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Ward name is required")
        return v.strip()

    @field_validator("capacity")
    @classmethod
    def capacity_range(cls, v: int) -> int:
        if v < 0 or v > 1000:
            raise ValueError("Capacity must be between 0 and 1000")
        return v


# ── Bed ──────────────────────────────────────────────────────
class BedCreate(BaseModel):
    wardId: int
    roomNumber: Optional[str] = Field(default=None, max_length=50)
    bedNumber: str = Field(max_length=50)
    status: BedStatus = BedStatus.Available
    user: Optional[str] = None

    @field_validator("bedNumber")
    @classmethod
    def bed_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Bed number is required")
        return v.strip()


class BedStatusUpdate(BaseModel):
    status: BedStatus
    user: Optional[str] = None


# ── Admission ────────────────────────────────────────────────
class DischargeMedicine(BaseModel):
    medicineName: str = Field(max_length=255)
    dosage: Optional[str] = Field(default=None, max_length=50)
    frequency: Optional[str] = Field(default=None, max_length=50)
    duration: Optional[str] = Field(default=None, max_length=50)
    quantity: Optional[int] = None
    notes: Optional[str] = Field(default=None, max_length=255)


class AdmissionCreate(BaseModel):
    uhid: str = Field(max_length=UHID_MAX)
    patientName: str = Field(max_length=NAME_MAX)
    age: Optional[int] = None
    gender: Optional[str] = Field(default=None, max_length=10)
    bloodGroup: Optional[str] = Field(default=None, max_length=5)
    admittingDoctor: Optional[str] = Field(default=None, max_length=NAME_MAX)
    specialty: Optional[str] = Field(default=None, max_length=100)
    admissionType: Optional[str] = Field(default=None, max_length=50)
    priority: Optional[str] = Field(default=None, max_length=20)
    expectedStayDays: Optional[int] = None
    wardId: Optional[int] = None
    bedId: Optional[int] = None
    provisionalDiagnosis: Optional[str] = Field(default=None, max_length=DIAG_MAX)
    insuranceStatus: Optional[str] = Field(default=None, max_length=50)
    operations: Optional[List[dict]] = None
    user: Optional[str] = None

    @field_validator("uhid", "patientName")
    @classmethod
    def required_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required")
        return v.strip()

    @field_validator("patientName", "admittingDoctor")
    @classmethod
    def letters_only(cls, v: Optional[str]) -> Optional[str]:
        v = _clean(v)
        if v is None:
            return None
        # Letters, spaces, dot, hyphen (for names like "Dr. J. Smith")
        cleaned = v.replace(" ", "").replace(".", "").replace("-", "")
        if not cleaned.isalpha():
            raise ValueError("Name may only contain letters, spaces, '.' and '-'")
        return v

    @field_validator("age")
    @classmethod
    def age_range(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v < 0 or v > 150:
            raise ValueError("Age must be between 0 and 150")
        return v

    @field_validator("expectedStayDays")
    @classmethod
    def stay_range(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        if v < 0 or v > 365:
            raise ValueError("Expected stay must be between 0 and 365 days")
        return v


class AdmissionUpdate(AdmissionCreate):
    pass


class AllocateBed(BaseModel):
    wardId: int
    bedId: int
    reason: Optional[str] = Field(default=None, max_length=255)
    operations: Optional[List[dict]] = None
    user: Optional[str] = None


class DischargeRequest(BaseModel):
    dischargeSummary: Optional[str] = None
    dischargedBy: Optional[str] = Field(default=None, max_length=NAME_MAX)
    medicines: List[DischargeMedicine] = []
    user: Optional[str] = None

class OperationsEMRUpdate(BaseModel):
    operations: List[dict] = []



# ── Admission Request ────────────────────────────────────────
class AdmissionRequestCreate(BaseModel):
    uhid: str = Field(max_length=UHID_MAX)
    patientName: str = Field(max_length=NAME_MAX)
    specialty: Optional[str] = Field(default=None, max_length=100)
    admissionType: Optional[str] = Field(default=None, max_length=50)
    priority: Optional[str] = Field(default=None, max_length=20)
    provisionalDiagnosis: Optional[str] = Field(default=None, max_length=DIAG_MAX)
    requestedBy: Optional[str] = Field(default=None, max_length=NAME_MAX)
    user: Optional[str] = None

    @field_validator("uhid", "patientName")
    @classmethod
    def required_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required")
        return v.strip()


class RequestStatusUpdate(BaseModel):
    status: RequestStatus
    user: Optional[str] = None
