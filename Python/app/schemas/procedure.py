from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProcedureCreate(BaseModel):
    procedureCode:     str
    procedureName:     str
    department:        str
    procedureType:     str
    description:       Optional[str] = None
    defaultCharge:     str
    taxApplicable:     Optional[bool] = False
    estimatedDuration: str
    requiresConsent:   Optional[bool] = False
    requiresAdmission: Optional[bool] = False
    otRequired:        Optional[bool] = False
    status:            str = 'Active'
    remarks:           Optional[str] = None
    createdBy:         Optional[str] = "System"


class ProcedureUpdate(ProcedureCreate):
    modifiedBy:        Optional[str] = "System"


class ProcedureResponse(BaseModel):
    id:                int
    procedureCode:     str
    procedureName:     str
    department:        str
    procedureType:     str
    description:       Optional[str] = None
    defaultCharge:     str
    taxApplicable:     bool
    estimatedDuration: str
    requiresConsent:   bool
    requiresAdmission: bool
    otRequired:        bool
    status:            str
    remarks:           Optional[str] = None

    createdBy:         Optional[str] = None
    createdDate:       Optional[datetime] = None
    modifiedBy:        Optional[str] = None
    modifiedDate:      Optional[datetime] = None
