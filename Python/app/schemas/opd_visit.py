from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal, Union

class VitalsSchema(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    respRate: Optional[int] = None
    temp: Optional[float] = None
    tempUnit: Optional[str] = None
    spo2: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    bloodSugar: Optional[int] = None
    recordedAt: Optional[str] = None
    recordedBy: Optional[str] = None

class TriageInfoSchema(BaseModel):
    chiefComplaint: Optional[str] = None
    painScore: Optional[int] = None
    allergyVerified: Optional[bool] = False
    pregnancyStatus: Optional[str] = None
    fallRisk: Optional[str] = None
    infectionStatus: Optional[str] = None
    observations: Optional[str] = None

class DiagnosisSchema(BaseModel):
    id: Optional[str] = None
    description: Optional[str] = None

class PrescriptionSchema(BaseModel):
    type: Optional[str] = None
    # The medicine master row this line prescribes. Optional so a line written
    # before the id was stored still validates; MedicineName stays as the
    # snapshot of what was written at the time.
    medicineId: Optional[int] = None
    medicineName: Optional[str] = None
    quantity: Optional[str] = None
    alerts: Optional[Union[List[str], str]] = None
    price: Optional[float] = 0.0

class LabOrderSchema(BaseModel):
    testName: Optional[str] = None
    testCode: Optional[str] = None
    priority: Optional[str] = None
    clinicalNotes: Optional[str] = None
    status: Optional[str] = None
    result: Optional[str] = None
    resultSummary: Optional[str] = None

class RadiologyOrderSchema(BaseModel):
    serviceName: Optional[str] = None
    modality: Optional[str] = None
    bodyPart: Optional[str] = None
    indication: Optional[str] = None
    priority: Optional[str] = None
    contrastRequired: Optional[bool] = False
    specialInstructions: Optional[str] = None
    status: Optional[str] = None
    result: Optional[str] = None
    resultSummary: Optional[str] = None

class ProcedureSchema(BaseModel):
    procedureName: Optional[str] = None
    performedBy: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    notes: Optional[str] = None
    billingCode: Optional[str] = None

class OpdVisitClinicalSaveRequest(BaseModel):
    appointmentId: int
    uhid: str
    isFinalized: Optional[bool] = None
    finalizedBy: Optional[str] = None
    createdBy: Optional[str] = "System"
    vitals: Optional[VitalsSchema] = None
    triageInfo: Optional[TriageInfoSchema] = None
    diagnoses: Optional[List[DiagnosisSchema]] = None
    prescriptions: Optional[List[PrescriptionSchema]] = None
    labOrders: Optional[List[LabOrderSchema]] = None
    radiologyOrders: Optional[List[RadiologyOrderSchema]] = None
    procedures: Optional[List[ProcedureSchema]] = None

class OpdVisitScheduleResponse(BaseModel):
    id: int
    appointmentId: int
    queueToken: Optional[str] = None
    appointmentNumber: Optional[str] = None
    uhid: str
    patientName: str
    age: Optional[int] = None
    gender: Optional[str] = None
    mobileNumber: Optional[str] = None
    doctorName: Optional[str] = None
    department: Optional[str] = None
    date: Optional[str] = None
    timeSlot: Optional[str] = None
    visitType: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    billingStatus: Optional[str] = None
    isFinalized: bool = False
    labOrders: Optional[List[LabOrderSchema]] = []
    radiologyOrders: Optional[List[RadiologyOrderSchema]] = []
    prescriptions: Optional[List[PrescriptionSchema]] = []
    diagnoses: Optional[List[DiagnosisSchema]] = []
