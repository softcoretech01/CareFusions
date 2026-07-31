from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AppointmentStatusCreate(BaseModel):
    statusCode:        str
    statusName:        str
    displayOrder:      str
    description:       Optional[str] = None
    isDefault:         bool = False
    isFinal:           bool = False
    allowReschedule:   bool = False
    allowCancellation: bool = False
    status:            str = 'Active'
    remarks:           Optional[str] = None
    createdBy:         Optional[str] = "System"


class AppointmentStatusUpdate(AppointmentStatusCreate):
    modifiedBy:        Optional[str] = "System"


class AppointmentStatusResponse(BaseModel):
    id:                int
    statusCode:        str
    statusName:        str
    displayOrder:      str
    description:       Optional[str] = None
    isDefault:         bool
    isFinal:           bool
    allowReschedule:   bool
    allowCancellation: bool
    status:            str
    remarks:           Optional[str] = None

    createdBy:         Optional[str] = None
    createdDate:       Optional[datetime] = None
    modifiedBy:        Optional[str] = None
    modifiedDate:      Optional[datetime] = None
