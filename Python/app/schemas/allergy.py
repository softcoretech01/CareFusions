from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class AllergySeverityEnum(str, Enum):
    LOW = 'Low'
    MEDIUM = 'Medium'
    HIGH = 'High'
    CRITICAL = 'Critical'


class AllergyCreate(BaseModel):
    allergyCode:    str
    allergyName:    str
    allergyType:    str
    severity:       AllergySeverityEnum
    description:    Optional[str] = None
    status:         str = 'Active'
    remarks:        Optional[str] = None
    createdBy:      Optional[str] = "System"


class AllergyUpdate(AllergyCreate):
    modifiedBy:     Optional[str] = "System"


class AllergyResponse(BaseModel):
    id:             int
    allergyCode:    str
    allergyName:    str
    allergyType:    str
    severity:       AllergySeverityEnum
    description:    Optional[str] = None
    status:         str
    remarks:        Optional[str] = None

    createdBy:      Optional[str] = None
    createdDate:    Optional[datetime] = None
    modifiedBy:     Optional[str] = None
    modifiedDate:   Optional[datetime] = None


class AllergyTypeResponse(BaseModel):
    id:             int
    typeName:       str
