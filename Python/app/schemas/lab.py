from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LabTestBase(BaseModel):
    test_id: Optional[int] = None
    test_code: Optional[str] = None
    test_name: str
    normal_range: Optional[str] = None
    unit: Optional[str] = None
    status: Optional[str] = "Pending"
    result_value: Optional[str] = None
    result_file: Optional[str] = None
    is_abnormal: Optional[bool] = False
    is_critical: Optional[bool] = False
    collected_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

class LabTestCreate(BaseModel):
    testId: Optional[int] = None
    testCode: Optional[str] = None
    testName: str
    normalRange: Optional[str] = None
    unit: Optional[str] = None

class LabOrderCreate(BaseModel):
    category: str = "Lab"
    visit_type: str = "OP"
    uhid: str
    patient_name: str
    ordered_by: Optional[str] = None
    priority: str = "Routine"
    clinical_notes: Optional[str] = None
    tests: List[LabTestCreate]

class LabTestUpdateResult(BaseModel):
    result_value: Optional[str] = None
    result_file: Optional[str] = None
    is_abnormal: bool = False
    is_critical: bool = False

class LabTestUpdateStatus(BaseModel):
    status: str

class LabTestResponse(LabTestBase):
    order_test_id: int

class LabOrderBase(BaseModel):
    order_number: str
    category: str = "Lab"
    visit_type: str
    uhid: str
    patient_name: str
    ordered_by: Optional[str] = None
    ordered_at: datetime
    priority: Optional[str] = None
    clinical_notes: Optional[str] = None
    status: str
    age: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None

class LabOrderResponse(LabOrderBase):
    order_id: int
    tests: List[LabTestResponse] = []
