from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class IpdVitalsSchema(BaseModel):
    temperature: Optional[str] = None
    pulse: Optional[str] = None
    bloodPressure: Optional[str] = None
    respiratoryRate: Optional[str] = None
    spO2: Optional[str] = None
    notes: Optional[str] = None

class IpdRoundSchema(BaseModel):
    doctorName: str
    note: str

class IpdMedicationSchema(BaseModel):
    medicineId: Optional[int] = None
    medicineName: str
    dosage: str
    frequency: str
    route: str
    administrations: Optional[Dict[str, Any]] = None

class IpdInvestigationSchema(BaseModel):
    testName: str
    result: Optional[str] = None
    normalRange: Optional[str] = None
    status: Optional[str] = "Ordered"

class IpdClinicalSaveRequest(BaseModel):
    admissionId: int
    vitals: Optional[IpdVitalsSchema] = None
    round: Optional[IpdRoundSchema] = None
    medication: Optional[IpdMedicationSchema] = None
    investigation: Optional[IpdInvestigationSchema] = None
