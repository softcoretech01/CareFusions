from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConsultationTypeCreate(BaseModel):
    consultationCode:  str
    consultationType:  str
    description:       Optional[str] = None
    duration:          str
    status:            str = 'Active'
    remarks:           Optional[str] = None
    createdBy:         Optional[str] = "System"


class ConsultationTypeUpdate(ConsultationTypeCreate):
    modifiedBy:        Optional[str] = "System"


class ConsultationTypeResponse(BaseModel):
    id:                int
    consultationCode:  str
    consultationType:  str
    description:       Optional[str] = None
    duration:          str
    status:            str
    remarks:           Optional[str] = None

    createdBy:         Optional[str] = None
    createdDate:       Optional[datetime] = None
    modifiedBy:        Optional[str] = None
    modifiedDate:      Optional[datetime] = None
