from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


class TypeEnum(str, Enum):
    Standard        = "Standard"
    FollowUp        = "Follow-up"
    WalkIn          = "Walk-In"
    Emergency       = "Emergency"
    Teleconsultation = "Teleconsultation"
    HomeVisit       = "Home Visit"


class PriorityEnum(str, Enum):
    Normal    = "Normal"
    High      = "High"
    Emergency = "Emergency"


class StatusEnum(str, Enum):
    Scheduled  = "Scheduled"
    CheckedIn  = "Checked-In"
    Waiting    = "Waiting"
    Consulting = "Consulting"
    Completed  = "Completed"
    Cancelled  = "Cancelled"
    NoShow     = "No-Show"


# ── Field limits ──
UHID_MAX    = 30
NAME_MAX    = 150
MOBILE_MAX  = 20
DEPT_MAX    = 100
DOCTOR_MAX  = 150
SLOT_MAX    = 20
NOTES_MAX   = 1000
DUR_MIN     = 5
DUR_MAX     = 480


class _ApptFields(BaseModel):
    uhid:            str            = Field(max_length=UHID_MAX)
    patientName:     str            = Field(max_length=NAME_MAX)
    mobileNumber:    Optional[str]  = Field(default=None, max_length=MOBILE_MAX)
    department:      str            = Field(max_length=DEPT_MAX)
    doctor:          Optional[str]  = Field(default=None, max_length=DOCTOR_MAX)
    date:            date
    timeSlot:        Optional[str]  = Field(default=None, max_length=SLOT_MAX)
    durationMinutes: int            = 15
    type:            TypeEnum       = TypeEnum.Standard
    priority:        PriorityEnum   = PriorityEnum.Normal
    status:          StatusEnum     = StatusEnum.Scheduled
    notes:           Optional[str]  = Field(default=None, max_length=NOTES_MAX)

    @field_validator("uhid", "patientName", "department")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("mobileNumber", "doctor", "timeSlot", "notes")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("durationMinutes")
    @classmethod
    def duration_range(cls, v: int) -> int:
        if v < DUR_MIN or v > DUR_MAX:
            raise ValueError(f"Duration must be between {DUR_MIN} and {DUR_MAX} minutes")
        return v


class AppointmentCreate(_ApptFields):
    createdBy: Optional[str] = None


class AppointmentUpdate(_ApptFields):
    updatedBy: Optional[str] = None


class StatusUpdate(BaseModel):
    status:    StatusEnum
    updatedBy: Optional[str] = None


class TokenUpdate(BaseModel):
    queueToken: str = Field(max_length=SLOT_MAX)
    updatedBy:  Optional[str] = None


class AppointmentResponse(BaseModel):
    id:                int
    appointmentNumber: str
    uhid:              str
    patientName:       str
    mobileNumber:      Optional[str]
    department:        str
    doctor:            Optional[str]
    date:              Optional[date]
    timeSlot:          Optional[str]
    durationMinutes:   int
    type:              str
    priority:          str
    status:            str
    queueToken:        Optional[str]
    notes:             Optional[str]
    createdDate:       Optional[datetime]
    updatedDate:       Optional[datetime]

    class Config:
        from_attributes = True
