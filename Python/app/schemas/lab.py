"""Pydantic schemas for the Laboratory / Investigations module."""
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class CategoryEnum(str, Enum):
    lab = "Lab"
    radiology = "Radiology"


class VisitTypeEnum(str, Enum):
    op = "OP"
    ip = "IP"


class PriorityEnum(str, Enum):
    routine = "Routine"
    urgent = "Urgent"
    stat = "STAT"


class TestStatusEnum(str, Enum):
    pending = "Pending"
    collected = "Sample Collected"
    accepted = "Sample Accepted"
    processing = "Processing"
    completed = "Completed"
    verified = "Verified"


class OrderTestIn(BaseModel):
    testId: Optional[int] = Field(None, gt=0)
    testCode: Optional[str] = Field(None, max_length=50)
    testName: str = Field(..., min_length=1, max_length=200)
    normalRange: Optional[str] = Field(None, max_length=100)
    unit: Optional[str] = Field(None, max_length=50)


class OrderCreate(BaseModel):
    category: CategoryEnum = CategoryEnum.lab
    visitType: VisitTypeEnum = VisitTypeEnum.op
    uhid: str = Field(..., min_length=1, max_length=30)
    patientName: str = Field(..., min_length=1, max_length=150)
    orderedBy: Optional[str] = Field(None, max_length=150)
    priority: PriorityEnum = PriorityEnum.routine
    clinicalNotes: Optional[str] = Field(None, max_length=500)
    tests: List[OrderTestIn] = Field(..., min_length=1)
    user: Optional[str] = Field("Admin", max_length=150)

    @field_validator("patientName")
    @classmethod
    def name_chars(cls, v):
        # Letters, spaces and the punctuation that legitimately appears in names.
        if v and not all(c.isalpha() or c in " .'-" for c in v):
            raise ValueError("Patient name may contain letters, spaces, . ' - only")
        return v


class TestStatusUpdate(BaseModel):
    status: TestStatusEnum
    user: Optional[str] = Field("Admin", max_length=150)


class TestResultUpdate(BaseModel):
    resultValue: Optional[str] = Field(None, max_length=255)
    resultFile: Optional[str] = Field(None, max_length=500)
    user: Optional[str] = Field("Admin", max_length=150)


class VerifyIn(BaseModel):
    verifiedBy: str = Field(..., min_length=1, max_length=150)


class AckIn(BaseModel):
    acknowledgedBy: Optional[str] = Field("Admin", max_length=150)


class QcCreate(BaseModel):
    category: CategoryEnum = CategoryEnum.lab
    qcDate: str = Field(..., min_length=10, max_length=10)   # YYYY-MM-DD
    machineName: str = Field(..., min_length=1, max_length=150)
    testName: str = Field(..., min_length=1, max_length=200)
    expectedValue: float
    actualValue: float
    remarks: Optional[str] = Field(None, max_length=500)
    user: Optional[str] = Field("Admin", max_length=150)
