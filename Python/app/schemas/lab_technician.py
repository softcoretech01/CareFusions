from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from enum import Enum

class LaboratoryEnum(str, Enum):
    MAIN_LAB = 'Main Lab'
    PATHOLOGY_LAB = 'Pathology Lab'
    MICROBIOLOGY_LAB = 'Microbiology Lab'
    BIOCHEMISTRY_LAB = 'Biochemistry Lab'

class LabTechnicianCreate(BaseModel):
    name:               str
    qualification:      str
    department:         str
    laboratory:         LaboratoryEnum
    hospital:           Optional[str]       = None
    branch:             Optional[str]       = None
    mobile:             str
    email:              Optional[str]       = None
    address:            Optional[str]       = None
    joiningDate:        Optional[date]      = None
    experience:         Optional[int]       = None
    shift:              str
    manager:            Optional[str]       = None
    
    profilePhoto:       Optional[str]       = None
    qualificationCertificate: Optional[str]       = None
    idProof:            Optional[str]       = None
    remarks:            Optional[str]       = None
    createdBy:          Optional[str]       = "System"

class LabTechnicianUpdate(LabTechnicianCreate):
    modifiedBy:         Optional[str]       = "System"

class LabTechnicianResponse(BaseModel):
    id:                 int
    technicianId:       str
    name:               str
    qualification:      str
    department:         str
    laboratory:         LaboratoryEnum
    hospital:           Optional[str]       = None
    branch:             Optional[str]       = None
    mobile:             str
    email:              Optional[str]       = None
    address:            Optional[str]       = None
    joiningDate:        Optional[date]      = None
    experience:         Optional[int]       = None
    shift:              str
    manager:            Optional[str]       = None
    
    profilePhoto:       Optional[str]       = None
    qualificationCertificate: Optional[str]       = None
    idProof:            Optional[str]       = None
    remarks:            Optional[str]       = None
    
    createdBy:          Optional[str]       = None
    createdDate:        Optional[datetime]  = None
    modifiedBy:         Optional[str]       = None
    modifiedDate:       Optional[datetime]  = None
