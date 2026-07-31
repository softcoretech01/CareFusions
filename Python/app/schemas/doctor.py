from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime, time
from enum import Enum

class GenderEnum(str, Enum):
    Male   = "Male"
    Female = "Female"
    Other  = "Other"

class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"

class DoctorTypeEnum(str, Enum):
    FullTime = "Full-time"
    Visiting = "Visiting"
    OnCall   = "On-call"

class ConsultationTypeEnum(str, Enum):
    OP   = "OP"
    IP   = "IP"
    OPIP = "OP/IP"

class DoctorCreate(BaseModel):
    registrationNumber: str
    name:               str
    gender:             GenderEnum
    dob:                Optional[date]      = None
    mobile:             str
    alternateMobile:    Optional[str]       = None
    email:              EmailStr
    address1:           Optional[str]       = None
    address2:           Optional[str]       = None
    city:               Optional[str]       = None
    state:              Optional[str]       = None
    country:            Optional[str]       = None
    postalCode:         Optional[str]       = None

    qualification:      str
    specialization:     str
    hospital:           str
    branch:             str
    department:         str
    designation:        str
    medicalCouncil:     Optional[str]       = None
    experience:         Optional[int]       = None
    languages:          Optional[str]       = None
    doctorType:         Optional[DoctorTypeEnum] = None
    consultationType:   Optional[ConsultationTypeEnum] = None
    joiningDate:        Optional[date]      = None
    licenseExpiryDate:  Optional[date]      = None

    consultationFee:    float
    followUpFee:        Optional[float]     = None
    emergencyFee:       Optional[float]     = None
    teleConsultationFee:Optional[float]     = None
    opDuration:         int
    maxPatients:        Optional[int]       = None
    allowOnlineBooking: bool                = False

    availableDays:      str
    fromTime:           time
    toTime:             time
    breakFrom:          Optional[time]      = None
    breakTo:            Optional[time]      = None
    slotDuration:       int
    availableEmergency: bool                = False
    availableTele:      bool                = False

    doctorPhoto:        Optional[str]       = None
    signatureImage:     Optional[str]       = None
    digitalSignature:   Optional[str]       = None
    registrationCertificate: Optional[str]  = None

    status:             StatusEnum          = StatusEnum.Active
    remarks:            Optional[str]       = None
    createdBy:          Optional[str]       = "System"

class DoctorUpdate(DoctorCreate):
    modifiedBy:         Optional[str]       = "System"

class DoctorResponse(BaseModel):
    # Read-only output model: tolerant of NULL columns so a partially-filled
    # doctor row still serializes instead of raising ResponseValidationError.
    id:                 int
    doctorId:           str
    registrationNumber: str
    name:               str
    gender:             Optional[GenderEnum] = None
    dob:                Optional[date]      = None
    mobile:             str
    alternateMobile:    Optional[str]       = None
    email:              Optional[EmailStr]  = None
    address1:           Optional[str]       = None
    address2:           Optional[str]       = None
    city:               Optional[str]       = None
    state:              Optional[str]       = None
    country:            Optional[str]       = None
    postalCode:         Optional[str]       = None

    qualification:      Optional[str]       = None
    specialization:     Optional[str]       = None
    hospital:           Optional[str]       = None
    branch:             Optional[str]       = None
    department:         Optional[str]       = None
    designation:        Optional[str]       = None
    medicalCouncil:     Optional[str]       = None
    experience:         Optional[int]       = None
    languages:          Optional[str]       = None
    doctorType:         Optional[DoctorTypeEnum] = None
    consultationType:   Optional[ConsultationTypeEnum] = None
    joiningDate:        Optional[date]      = None
    licenseExpiryDate:  Optional[date]      = None

    consultationFee:    Optional[float]     = None
    followUpFee:        Optional[float]     = None
    emergencyFee:       Optional[float]     = None
    teleConsultationFee:Optional[float]     = None
    opDuration:         Optional[int]       = None
    maxPatients:        Optional[int]       = None
    allowOnlineBooking: Optional[bool]      = False

    availableDays:      Optional[str]       = None
    fromTime:           Optional[time]      = None
    toTime:             Optional[time]      = None
    breakFrom:          Optional[time]      = None
    breakTo:            Optional[time]      = None
    slotDuration:       Optional[int]       = None
    availableEmergency: Optional[bool]      = False
    availableTele:      Optional[bool]      = False

    doctorPhoto:        Optional[str]       = None
    signatureImage:     Optional[str]       = None
    digitalSignature:   Optional[str]       = None
    registrationCertificate: Optional[str]  = None

    status:             Optional[str]       = None
    remarks:            Optional[str]       = None
    
    createdBy:          Optional[str]       = None
    createdDate:        Optional[datetime]  = None
    modifiedBy:         Optional[str]       = None
    modifiedDate:       Optional[datetime]  = None

    class Config:
        from_attributes = True
