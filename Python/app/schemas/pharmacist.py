from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

class PharmacistCreate(BaseModel):
    name:               str
    licenseNumber:      str
    qualification:      Optional[str]       = None
    hospital:           Optional[str]       = None
    branch:             Optional[str]       = None
    pharmacy:           Optional[str]       = None
    mobile:             str
    email:              Optional[str]       = None
    address:            Optional[str]       = None
    joiningDate:        Optional[date]      = None
    experience:         Optional[int]       = None
    shift:              Optional[str]       = None
    employmentType:     Optional[str]       = None
    
    photo:              Optional[str]       = None
    licenseCertificate: Optional[str]       = None
    idProof:            Optional[str]       = None
    remarks:            Optional[str]       = None
    createdBy:          Optional[str]       = "System"

class PharmacistUpdate(PharmacistCreate):
    modifiedBy:         Optional[str]       = "System"

class PharmacistResponse(BaseModel):
    id:                 int
    pharmacistId:       str
    name:               str
    licenseNumber:      str
    qualification:      Optional[str]       = None
    hospital:           Optional[str]       = None
    branch:             Optional[str]       = None
    pharmacy:           Optional[str]       = None
    mobile:             str
    email:              Optional[str]       = None
    address:            Optional[str]       = None
    joiningDate:        Optional[date]      = None
    experience:         Optional[int]       = None
    shift:              Optional[str]       = None
    employmentType:     Optional[str]       = None
    
    photo:              Optional[str]       = None
    licenseCertificate: Optional[str]       = None
    idProof:            Optional[str]       = None
    remarks:            Optional[str]       = None
    
    createdBy:          Optional[str]       = None
    createdDate:        Optional[datetime]  = None
    modifiedBy:         Optional[str]       = None
    modifiedDate:       Optional[datetime]  = None
