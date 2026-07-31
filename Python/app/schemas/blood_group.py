from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class BloodGroupEnum(str, Enum):
    A_POSITIVE = 'A+'
    A_NEGATIVE = 'A-'
    B_POSITIVE = 'B+'
    B_NEGATIVE = 'B-'
    AB_POSITIVE = 'AB+'
    AB_NEGATIVE = 'AB-'
    O_POSITIVE = 'O+'
    O_NEGATIVE = 'O-'

class RhFactorEnum(str, Enum):
    POSITIVE = 'Positive'
    NEGATIVE = 'Negative'


class BloodGroupCreate(BaseModel):
    bloodGroup:    BloodGroupEnum
    rhFactor:      RhFactorEnum
    description:   Optional[str] = None
    status:        str = 'Active'
    createdBy:     Optional[str] = "System"


class BloodGroupUpdate(BloodGroupCreate):
    modifiedBy:    Optional[str] = "System"


class BloodGroupResponse(BaseModel):
    id:            int
    bloodGroup:    BloodGroupEnum
    rhFactor:      RhFactorEnum
    description:   Optional[str] = None
    status:        str

    createdBy:     Optional[str] = None
    createdDate:   Optional[datetime] = None
    modifiedBy:    Optional[str] = None
    modifiedDate:  Optional[datetime] = None
