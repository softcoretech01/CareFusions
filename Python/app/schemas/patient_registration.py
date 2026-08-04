from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date
from enum import Enum

# --- Enums for Static Dropdowns ---
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

class MaritalStatusEnum(str, Enum):
    single = "Single"
    married = "Married"
    divorced = "Divorced"
    widowed = "Widowed"

class NationalIdTypeEnum(str, Enum):
    voter_id = "Voter ID"
    ration_card = "Ration Card"

class EmergencyRelationshipEnum(str, Enum):
    spouse = "Spouse"
    parent = "Parent"
    child = "Child"
    sibling = "Sibling"
    other = "Other"

class YesNoEnum(str, Enum):
    yes = "Yes"
    no = "No"

class PatientTypeEnum(str, Enum):
    op = "OP"
    ip = "IP"
    emergency = "Emergency"

class RegistrationSourceEnum(str, Enum):
    walk_in = "Walk-In"
    referral = "Referral"
    online = "Online"
    camp = "Camp"

class StatusEnum(str, Enum):
    active = "Active"
    inactive = "Inactive"

# --- Pydantic Models ---

class PatientRegistrationBase(BaseModel):
    RegistrationDate: date
    Title: TitleEnum
    PatientName: str = Field(..., max_length=50)
    Gender: GenderEnum
    DateOfBirth: date
    Age: Optional[int] = 0
    MaritalStatus: Optional[MaritalStatusEnum] = None
    BloodGroup: Optional[str] = Field(None, max_length=10)
    Nationality: Optional[str] = Field("Indian", max_length=50)
    Religion: Optional[str] = Field(None, max_length=50)
    Occupation: Optional[str] = Field(None, max_length=50)
    
    MobileNumber: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    AlternateMobile: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^\d{10}$")
    Email: Optional[EmailStr] = None
    
    Address1: str = Field(..., max_length=250)
    Address2: Optional[str] = Field(None, max_length=250)
    Country: str = Field("India", max_length=50)
    State: str = Field(..., max_length=50)
    District: Optional[str] = Field(None, max_length=50)
    City: str = Field(..., max_length=50)
    PinCode: str = Field(..., max_length=20)
    
    AadhaarNumber: Optional[str] = Field(None, max_length=20)
    PassportNumber: Optional[str] = Field(None, max_length=20)
    PanNumber: Optional[str] = Field(None, max_length=20)
    DrivingLicense: Optional[str] = Field(None, max_length=20)
    NationalIdType: Optional[NationalIdTypeEnum] = None
    NationalIdNumber: Optional[str] = Field(None, max_length=50)
    
    EmergencyContactName: str = Field(..., max_length=50)
    EmergencyRelationship: EmergencyRelationshipEnum
    EmergencyMobile: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^\d{10}$")
    EmergencyAlternateMobile: Optional[str] = Field(None, min_length=10, max_length=10, pattern=r"^\d{10}$")
    EmergencyAddress: Optional[str] = Field(None, max_length=250)
    
    Allergies: Optional[str] = Field(None, max_length=250)
    ChronicDiseases: Optional[str] = Field(None, max_length=250)
    CurrentMedication: Optional[str] = Field(None, max_length=250)
    OrganDonor: YesNoEnum = YesNoEnum.no
    Disability: Optional[str] = Field(None, max_length=50)
    
    InsuranceRequired: YesNoEnum = YesNoEnum.no
    InsuranceProvider: Optional[str] = Field(None, max_length=50)
    Tpa: Optional[str] = Field(None, max_length=50)
    PolicyNumber: Optional[str] = Field(None, max_length=50)
    ValidTill: Optional[date] = None
    
    PatientType: PatientTypeEnum = PatientTypeEnum.op
    ReferredBy: Optional[str] = Field(None, max_length=50)
    PrimaryDoctor: Optional[str] = Field(None, max_length=50)
    Department: Optional[str] = Field(None, max_length=50)
    RegistrationSource: RegistrationSourceEnum = RegistrationSourceEnum.walk_in
    
    PrivacyConsent: bool = True
    SmsConsent: bool = False
    EmailConsent: bool = False
    WhatsappConsent: bool = False
    
    Status: StatusEnum = StatusEnum.active
    Remarks: Optional[str] = Field(None, max_length=250)

class PatientRegistrationCreate(PatientRegistrationBase):
    pass

class PatientRegistrationUpdate(PatientRegistrationBase):
    pass

class PatientRegistrationResponse(PatientRegistrationBase):
    PatientId: int
    Uhid: str
    
    class Config:
        from_attributes = True

class OptionsResponse(BaseModel):
    Title: List[str]
    Gender: List[str]
    MaritalStatus: List[str]
    NationalIdType: List[str]
    EmergencyRelationship: List[str]
    YesNo: List[str]
    PatientType: List[str]
    RegistrationSource: List[str]
    Status: List[str]
    BloodGroups: List[str]
