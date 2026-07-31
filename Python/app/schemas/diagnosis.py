from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class IcdVersionEnum(str, Enum):
    ICD_10 = 'ICD-10'
    ICD_11 = 'ICD-11'

class DiagnosisCategoryEnum(str, Enum):
    ENDOCRINE = 'Endocrine'
    INFECTIOUS = 'Infectious'
    CARDIOVASCULAR = 'Cardiovascular'
    RESPIRATORY = 'Respiratory'
    NEUROLOGICAL = 'Neurological'


class DiagnosisCreate(BaseModel):
    diagnosisCode:     str
    diagnosisName:     str
    icdVersion:        IcdVersionEnum
    category:          DiagnosisCategoryEnum
    description:       Optional[str] = None
    chronicDisease:    Optional[bool] = False
    notifiableDisease: Optional[bool] = False
    status:            str = 'Active'
    remarks:           Optional[str] = None
    createdBy:         Optional[str] = "System"


class DiagnosisUpdate(DiagnosisCreate):
    modifiedBy:        Optional[str] = "System"


class DiagnosisResponse(BaseModel):
    id:                int
    diagnosisCode:     str
    diagnosisName:     str
    icdVersion:        IcdVersionEnum
    category:          DiagnosisCategoryEnum
    description:       Optional[str] = None
    chronicDisease:    bool
    notifiableDisease: bool
    status:            str
    remarks:           Optional[str] = None

    createdBy:         Optional[str] = None
    createdDate:       Optional[datetime] = None
    modifiedBy:        Optional[str] = None
    modifiedDate:      Optional[datetime] = None
