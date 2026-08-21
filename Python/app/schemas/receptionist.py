from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class ReceptionistCreate(BaseModel):
    name:               str
    hospital:           Optional[str] = None
    branch:             Optional[str] = None
    counter:            str
    mobile:             str
    email:              Optional[str] = None
    address:            Optional[str] = None
    joiningDate:        Optional[date] = None
    shift:              str
    experience:         Optional[int] = None
    manager:            Optional[str] = None

    photo:              Optional[str] = None
    idProof:            Optional[str] = None
    remarks:            Optional[str] = None
    createdBy:          Optional[str] = "System"


class ReceptionistUpdate(ReceptionistCreate):
    modifiedBy:         Optional[str] = "System"


class ReceptionistResponse(BaseModel):
    id:                 int
    receptionistId:     str
    name:               str
    hospital:           Optional[str] = None
    branch:             Optional[str] = None
    counter:            str
    mobile:             str
    email:              Optional[str] = None
    address:            Optional[str] = None
    joiningDate:        Optional[date] = None
    shift:              str
    experience:         Optional[int] = None
    manager:            Optional[str] = None

    photo:              Optional[str] = None
    idProof:            Optional[str] = None
    remarks:            Optional[str] = None

    createdBy:          Optional[str] = None
    createdDate:        Optional[datetime] = None
    modifiedBy:         Optional[str] = None
    modifiedDate:       Optional[datetime] = None
