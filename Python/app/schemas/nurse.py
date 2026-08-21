from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

class NurseCreate(BaseModel):
    # Master_Nurse.EmployeeCode is NOT NULL. The form does not collect it, so
    # this is optional here and the router falls back to the generated code.
    employeeCode:       Optional[str]       = None
    name:               str
    gender:             str
    dob:                Optional[date]      = None
    qualification:      str
    registrationNumber: str
    department:         str
    designation:        str
    hospital:           str
    branch:             str
    mobile:             str
    alternateMobile:    Optional[str]       = None
    email:              Optional[EmailStr]  = None
    address:            Optional[str]       = None
    city:               Optional[str]       = None
    state:              Optional[str]       = None
    country:            Optional[str]       = None
    postalCode:         Optional[str]       = None
    joiningDate:        date
    shift:              str
    manager:            Optional[str]       = None
    employmentType:     Optional[str]       = None
    experience:         Optional[int]       = None
    
    profilePhoto:       Optional[str]       = None
    nursingLicense:     Optional[str]       = None
    qualificationCertificate: Optional[str] = None
    idProof:            Optional[str]       = None
    remarks:            Optional[str]       = None
    createdBy:          Optional[str]       = "System"

class NurseUpdate(NurseCreate):
    modifiedBy:         Optional[str]       = "System"

class NurseResponse(BaseModel):
    # Read model: tolerant of NULL columns so a partially-filled nurse row
    # still serializes instead of raising ResponseValidationError.
    id:                 int
    nurseId:            str
    employeeCode:       Optional[str]       = None
    name:               str
    gender:             str
    dob:                Optional[date]      = None
    qualification:      str
    registrationNumber: str
    department:         str
    designation:        str
    hospital:           Optional[str]       = None
    branch:             Optional[str]       = None
    mobile:             str
    alternateMobile:    Optional[str]       = None
    email:              Optional[str]       = None
    address:            Optional[str]       = None
    city:               Optional[str]       = None
    state:              Optional[str]       = None
    country:            Optional[str]       = None
    postalCode:         Optional[str]       = None
    joiningDate:        Optional[date]      = None
    shift:              Optional[str]       = None
    status:             Optional[str]       = None
    manager:            Optional[str]       = None
    employmentType:     Optional[str]       = None
    experience:         Optional[int]       = None
    
    profilePhoto:       Optional[str]       = None
    nursingLicense:     Optional[str]       = None
    qualificationCertificate: Optional[str] = None
    idProof:            Optional[str]       = None
    remarks:            Optional[str]       = None
    
    createdBy:          Optional[str]       = None
    createdDate:        Optional[datetime]  = None
    modifiedBy:         Optional[str]       = None
    modifiedDate:       Optional[datetime]  = None

    class Config:
        from_attributes = True
