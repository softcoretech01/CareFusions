from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
NAME_MAX    = 150
MODULE_MAX  = 100
EVENT_MAX   = 100
DESC_MAX    = 500
SUBJECT_MAX = 200
CONTENT_MAX = 1000
REMARKS_MAX = 500


class _SmsTemplateFields(BaseModel):
    templateName: str            = Field(max_length=NAME_MAX)
    module:       str            = Field(max_length=MODULE_MAX)
    event:        str            = Field(max_length=EVENT_MAX)
    description:  Optional[str]  = Field(default=None, max_length=DESC_MAX)
    smsSubject:   Optional[str]  = Field(default=None, max_length=SUBJECT_MAX)
    smsContent:   str            = Field(max_length=CONTENT_MAX)
    status:       StatusEnum     = StatusEnum.Active
    remarks:      Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("templateName", "module", "event", "smsContent")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("description", "smsSubject", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class SmsTemplateCreate(_SmsTemplateFields):
    createdBy: Optional[str] = None


class SmsTemplateUpdate(_SmsTemplateFields):
    updatedBy: Optional[str] = None


class SmsTemplateResponse(BaseModel):
    id:           int
    templateCode: str
    templateName: str
    module:       str
    event:        str
    description:  Optional[str]
    smsSubject:   Optional[str]
    smsContent:   str
    status:       str
    remarks:      Optional[str]
    createdBy:    Optional[str]
    createdDate:  Optional[datetime]
    updatedBy:    Optional[str]
    updatedDate:  Optional[datetime]

    class Config:
        from_attributes = True
