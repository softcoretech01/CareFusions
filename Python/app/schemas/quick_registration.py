from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date, time, datetime
from enum import Enum

class TitleEnum(str, Enum):
    mr = "Mr."
    mrs = "Mrs."
    miss = "Miss"
    dr = "Dr."
    mast = "Mast."
    baby = "Baby"

class GenderEnum(str, Enum):
    male = "Male"
    female = "Female"
    other = "Other"

class YesNoEnum(str, Enum):
    yes = "Yes"
    no = "No"

class PriorityEnum(str, Enum):
    normal = "Normal"
    urgent = "Urgent"

class VisitTypeEnum(str, Enum):
    op = "OP"
    walk_in = "Walk-In"
    emergency = "Emergency"

class StatusEnum(str, Enum):
    active = "Active"
    inactive = "Inactive"

class PaymentModeEnum(str, Enum):
    cash = "Cash"
    card = "Card"
    upi = "UPI"
    insurance = "Insurance"

class QuickRegistrationBase(BaseModel):
    RegistrationDate: date
    RegistrationTime: str
    Title: TitleEnum
    PatientName: str = Field(..., max_length=50)
    Gender: GenderEnum
    DateOfBirth: Optional[date] = None
    Age: Optional[int] = 0
    MobileNumber: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    AlternateMobile: Optional[str] = Field(None, max_length=10)
    VisitType: VisitTypeEnum = VisitTypeEnum.op
    Department: Optional[str] = Field(None, max_length=50)
    Doctor: Optional[str] = Field(None, max_length=50)
    Priority: PriorityEnum = PriorityEnum.normal
    VisitReason: Optional[str] = Field(None, max_length=250)
    ConsultationRequired: YesNoEnum = YesNoEnum.yes
    ConsultationFee: Optional[float] = 0.0
    PaymentMode: PaymentModeEnum = PaymentModeEnum.cash
    InsuranceRequired: Optional[YesNoEnum] = YesNoEnum.no
    InsuranceProvider: Optional[str] = Field(None, max_length=50)
    Tpa: Optional[str] = Field(None, max_length=50)
    PolicyNumber: Optional[str] = Field(None, max_length=50)
    ValidTill: Optional[date] = None
    Status: StatusEnum = StatusEnum.active
    Remarks: Optional[str] = Field(None, max_length=250)
    CreatedBy: Optional[str] = Field(None, max_length=50)
    ModifiedBy: Optional[str] = Field(None, max_length=50)

class QuickRegistrationCreate(QuickRegistrationBase):
    pass

class QuickRegistrationUpdate(QuickRegistrationBase):
    pass

class QuickRegistrationResponse(QuickRegistrationBase):
    QuickRegistrationId: int
    Uhid: Optional[str] = None
    CreatedDate: Optional[datetime] = None

    class Config:
        from_attributes = True

class QuickRegistrationOptions(BaseModel):
    Title: List[str]
    Gender: List[str]
    YesNo: List[str]
    Priority: List[str]
    VisitType: List[str]
    Status: List[str]
    PaymentMode: List[str]
    Departments: List[str]
    Doctors: List[str]
