from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class PatientVisitBase(BaseModel):
    Uhid: str = Field(..., max_length=20)
    VisitDate: date
    VisitTime: Optional[str] = Field(None, max_length=20)
    VisitType: str = Field(..., max_length=50)
    Department: Optional[str] = Field(None, max_length=100)
    Doctor: Optional[str] = Field(None, max_length=100)
    Status: Optional[str] = Field('Scheduled', max_length=50)
    Notes: Optional[str] = Field(None, max_length=500)

class PatientVisitCreate(PatientVisitBase):
    pass

class PatientVisitUpdate(PatientVisitBase):
    pass

class PatientVisitResponse(PatientVisitBase):
    VisitId: int
    
    class Config:
        from_attributes = True
