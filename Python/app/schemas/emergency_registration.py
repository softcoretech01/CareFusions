from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class EmergencyGenderEnum(str, Enum):
    male = "Male"
    female = "Female"
    other = "Other"
    unknown = "Unknown"

class EmergencyStatusEnum(str, Enum):
    active = "Active"
    inactive = "Inactive"

class EmergencyRegistrationBase(BaseModel):
    RegistrationDate: date
    RegistrationTime: str
    PatientName: str = Field(..., max_length=50)
    Gender: EmergencyGenderEnum = EmergencyGenderEnum.unknown
    ApproximateAge: Optional[int] = 0
    EmergencyContactName: Optional[str] = Field(None, max_length=50)
    EmergencyContactPhone: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^\d{10}$")
    InsuranceRequired: Optional[str] = "No"
    InsuranceProvider: Optional[str] = Field(None, max_length=50)
    Tpa: Optional[str] = Field(None, max_length=50)
    PolicyNumber: Optional[str] = Field(None, max_length=50)
    ValidTill: Optional[date] = None
    Status: EmergencyStatusEnum = EmergencyStatusEnum.active
    CreatedBy: Optional[str] = Field(None, max_length=50)
    ModifiedBy: Optional[str] = Field(None, max_length=50)

class EmergencyRegistrationCreate(EmergencyRegistrationBase):
    pass

class EmergencyRegistrationUpdate(EmergencyRegistrationBase):
    pass

class EmergencyRegistrationResponse(EmergencyRegistrationBase):
    EmergencyRegistrationId: int
    Uhid: Optional[str] = None
    CreatedDate: Optional[datetime] = None

    class Config:
        from_attributes = True

class EmergencyRegistrationOptions(BaseModel):
    Gender: List[str]
    Status: List[str]
