from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MinorOperationCreate(BaseModel):
    operationCode:     str
    operationName:     str
    department:        str
    medications:       Optional[str] = None
    procedures:        Optional[str] = None
    equipment:         Optional[str] = None
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


class MinorOperationUpdate(MinorOperationCreate):
    modifiedBy:        Optional[str] = "System"


class MinorOperationResponse(BaseModel):
    id:                int
    serialNo:          Optional[int] = None
    operationCode:     str
    operationName:     str
    department:        str
    medications:       Optional[str] = None
    procedures:        Optional[str] = None
    equipment:         Optional[str] = None
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
