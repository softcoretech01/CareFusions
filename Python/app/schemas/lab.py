from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class VisitType(str, Enum):
    OP = "OP"
    IP = "IP"
    ER = "ER"

class Category(str, Enum):
    Lab = "Lab"
    Radiology = "Radiology"

class Priority(str, Enum):
    Routine = "Routine"
    Urgent = "Urgent"
    Stat = "Stat"

class TestStatus(str, Enum):
    Pending = "Pending"
    SampleCollected = "Sample Collected"
    SampleAccepted = "Sample Accepted"
    Processing = "Processing"
    Completed = "Completed"
    Verified = "Verified"

class TestCreate(BaseModel):
    testId: Optional[int] = None
    testCode: Optional[str] = None
    testName: str
    bodyPart: Optional[str] = None
    normalRange: Optional[str] = None
    unit: Optional[str] = None

class OrderCreate(BaseModel):
    category: Category
    visitType: VisitType
    uhid: str
    patientName: str
    orderedBy: Optional[str] = None
    priority: Priority
    clinicalNotes: Optional[str] = None
    tests: List[TestCreate]
    user: Optional[str] = None

class TestStatusUpdate(BaseModel):
    status: TestStatus
    user: Optional[str] = None

class TestResultUpdate(BaseModel):
    resultValue: Optional[str] = None
    resultFile: Optional[str] = None
    user: Optional[str] = None

class VerifyIn(BaseModel):
    verifiedBy: str

class AckIn(BaseModel):
    acknowledgedBy: Optional[str] = None

class QcCreate(BaseModel):
    category: Category
    qcDate: str
    machineName: str
    testName: str
    expectedValue: float
    actualValue: float
    remarks: Optional[str] = None
    user: Optional[str] = None
