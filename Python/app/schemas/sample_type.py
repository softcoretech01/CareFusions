from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SampleTypeCreate(BaseModel):
    sampleCode:         str
    sampleType:         str
    description:        Optional[str] = None
    collectionMethod:   Optional[str] = None
    storageTemperature: Optional[str] = None
    maxStorageTime:     Optional[str] = None
    status:             str = 'Active'
    remarks:            Optional[str] = None
    createdBy:          Optional[str] = "System"


class SampleTypeUpdate(SampleTypeCreate):
    modifiedBy:         Optional[str] = "System"


class SampleTypeResponse(BaseModel):
    id:                 int
    sampleCode:         Optional[str] = None
    sampleType:         str
    description:        Optional[str] = None
    collectionMethod:   Optional[str] = None
    storageTemperature: Optional[str] = None
    maxStorageTime:     Optional[str] = None
    status:             Optional[str] = None
    remarks:            Optional[str] = None

    createdBy:          Optional[str] = None
    createdDate:        Optional[datetime] = None
    modifiedBy:         Optional[str] = None
    modifiedDate:       Optional[datetime] = None
