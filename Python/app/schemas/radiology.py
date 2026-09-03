from pydantic import BaseModel, constr
from typing import List, Optional, Any
from datetime import datetime

class RadiologyTestBase(BaseModel):
    test_id: Optional[int] = None
    test_code: Optional[str] = None
    test_name: str
    body_part: Optional[str] = None
    status: str
    result_value: Optional[str] = None
    result_file: Optional[str] = None
    result_summary: Optional[str] = None
    is_critical: bool = False
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

class RadiologyTestUpdate(BaseModel):
    result_value: Optional[str] = None
    result_file: Optional[str] = None
    result_summary: Optional[str] = None
    is_critical: bool = False

class RadiologyTestCreate(BaseModel):
    testId: Optional[Any] = None
    test_id: Optional[Any] = None
    testName: str
    testCode: Optional[str] = None
    test_code: Optional[str] = None
    bodyPart: Optional[str] = None
    body_part: Optional[str] = None
    isCritical: Optional[bool] = False
    is_critical: Optional[bool] = False

class RadiologyTestResponse(RadiologyTestBase):
    order_test_id: int

class RadiologyOrderBase(BaseModel):
    order_number: str
    category: str = "Radiology"
    visit_type: str
    uhid: str
    patient_name: str
    ordered_by: Optional[str] = None
    ordered_at: datetime
    status: str
    age: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None

class RadiologyOrderCreate(BaseModel):
    category: str = "Radiology"
    visit_type: str = "OP"
    uhid: str
    patient_name: str
    ordered_by: Optional[str] = None
    priority: str = "Routine"
    tests: List[RadiologyTestCreate]
    # Shared with the lab order raised by the same "Update EMR" click. See
    # services.create_service_order_internal.
    order_group_no: Optional[str] = None

class RadiologyOrderResponse(RadiologyOrderBase):
    order_id: int
    tests: List[RadiologyTestResponse] = []

class RadiologyQCBase(BaseModel):
    qc_number: str
    category: str = "Radiology"
    qc_date: str
    machine_name: str
    test_name: str
    expected_value: float
    actual_value: float
    deviation: float
    status: str
    remarks: Optional[str] = None

class RadiologyQCCreate(RadiologyQCBase):
    pass

class RadiologyQCResponse(RadiologyQCBase):
    qc_id: int
    created_date: datetime
