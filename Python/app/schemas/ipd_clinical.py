"""Pydantic schemas for IPD clinical records (flowsheet, rounds, MAR)."""
from typing import Optional, Dict
from pydantic import BaseModel, Field, field_validator, model_validator


class VitalsCreate(BaseModel):
    temperature: Optional[str] = Field(None, max_length=20)
    pulse: Optional[str] = Field(None, max_length=20)
    bloodPressure: Optional[str] = Field(None, max_length=20)
    respiratoryRate: Optional[str] = Field(None, max_length=20)
    spO2: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=500)
    recordedBy: Optional[str] = Field("Nurse", max_length=150)

    @model_validator(mode="after")
    def at_least_one_reading(self):
        if not any([self.temperature, self.pulse, self.bloodPressure,
                    self.respiratoryRate, self.spO2]):
            raise ValueError("Record at least one vital sign")
        return self


class RoundCreate(BaseModel):
    doctorName: str = Field(..., min_length=1, max_length=150)
    note: str = Field(..., min_length=1, max_length=1000)

    @field_validator("doctorName")
    @classmethod
    def name_chars(cls, v):
        if not all(c.isalpha() or c in " .'-" for c in v):
            raise ValueError("Doctor name may contain letters, spaces, . ' - only")
        return v


class MedicationCreate(BaseModel):
    medicineId: Optional[int] = Field(None, gt=0)
    medicineName: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., min_length=1, max_length=50)
    frequency: str = Field(..., min_length=1, max_length=50)
    route: str = Field("Oral", max_length=50)
    prescribedBy: Optional[str] = Field("Doctor", max_length=150)


class AdministrationUpdate(BaseModel):
    """Which time slots have been given, e.g. {"Morning": true}."""
    administrations: Dict[str, bool] = Field(default_factory=dict)
