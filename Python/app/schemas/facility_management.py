from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class FacilityManagementCreate(BaseModel):
    employeeCode:       str
    name:               str
    staffCategory:      str
    hospital:           Optional[str] = None
    branch:             Optional[str] = None
    assignedArea:       str
    mobile:             str
    email:              Optional[str] = None
    address:            Optional[str] = None
    joiningDate:        date
    shift:              str
    employmentType:     Optional[str] = None
    supervisor:         Optional[str] = None

    profilePhoto:       Optional[str] = None
    idProof:            Optional[str] = None
    policeVerification: Optional[str] = None

    status:             str = 'Active'
    remarks:            Optional[str] = None
    createdBy:          Optional[str] = "System"


class FacilityManagementUpdate(FacilityManagementCreate):
    modifiedBy:         Optional[str] = "System"


class FacilityManagementResponse(BaseModel):
    id:                 int
    employeeId:         str
    employeeCode:       str
    name:               str
    staffCategory:      str
    hospital:           Optional[str] = None
    branch:             Optional[str] = None
    assignedArea:       str
    mobile:             str
    email:              Optional[str] = None
    address:            Optional[str] = None
    joiningDate:        Optional[date] = None
    shift:              str
    employmentType:     Optional[str] = None
    supervisor:         Optional[str] = None

    profilePhoto:       Optional[str] = None
    idProof:            Optional[str] = None
    policeVerification: Optional[str] = None

    status:             str
    remarks:            Optional[str] = None

    createdBy:          Optional[str] = None
    createdDate:        Optional[datetime] = None
    modifiedBy:         Optional[str] = None
    modifiedDate:       Optional[datetime] = None
