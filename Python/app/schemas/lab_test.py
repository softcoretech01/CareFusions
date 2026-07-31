from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LabTestCreate(BaseModel):
    testCode:           str
    testName:           str
    testCategory:       str
    department:         str
    sampleType:         str
    description:        Optional[str] = None
    normalRange:        Optional[str] = None
    unit:               Optional[str] = None
    testMethod:         Optional[str] = None
    turnaroundTime:     str
    testPrice:          float
    gst:                Optional[float] = 0.0
    reportTemplate:     Optional[str] = None
    requiresApproval:   Optional[bool] = False
    criticalValueAlert: Optional[bool] = False
    status:             str = 'Active'
    remarks:            Optional[str] = None
    createdBy:          Optional[str] = "System"


class LabTestUpdate(LabTestCreate):
    modifiedBy:         Optional[str] = "System"


class LabTestResponse(BaseModel):
    id:                 int
    testCode:           str
    testName:           str
    testCategory:       str
    department:         str
    sampleType:         str
    description:        Optional[str] = None
    normalRange:        Optional[str] = None
    unit:               Optional[str] = None
    testMethod:         Optional[str] = None
    turnaroundTime:     str
    testPrice:          float
    gst:                Optional[float] = 0.0
    reportTemplate:     Optional[str] = None
    requiresApproval:   Optional[bool] = False
    criticalValueAlert: Optional[bool] = False
    status:             str
    remarks:            Optional[str] = None

    createdBy:          Optional[str] = None
    createdDate:        Optional[datetime] = None
    modifiedBy:         Optional[str] = None
    modifiedDate:       Optional[datetime] = None


class LookupResponse(BaseModel):
    id: int
    name: str
