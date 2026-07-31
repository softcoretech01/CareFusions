from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
NAME_MAX     = 150
MODULE_MAX   = 100
EVENT_MAX    = 100
SUBJECT_MAX  = 300
BODY_MAX     = 10000
ATTACH_MAX   = 100
REMARKS_MAX  = 500


class _EmailTemplateFields(BaseModel):
    templateName:      str            = Field(max_length=NAME_MAX)
    module:            str            = Field(max_length=MODULE_MAX)
    event:             str            = Field(max_length=EVENT_MAX)
    emailSubject:      str            = Field(max_length=SUBJECT_MAX)
    emailBody:         str            = Field(max_length=BODY_MAX)
    attachmentAllowed: bool           = False
    attachmentType:    Optional[str]  = Field(default=None, max_length=ATTACH_MAX)
    status:            StatusEnum     = StatusEnum.Active
    remarks:           Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("templateName", "module", "event", "emailSubject", "emailBody")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("attachmentType", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @model_validator(mode="after")
    def attachment_type_required(self):
        # If attachments are allowed, a type must be chosen.
        if self.attachmentAllowed and not self.attachmentType:
            raise ValueError("Attachment Type is required when attachments are allowed")
        # If attachments are NOT allowed, clear any stray type.
        if not self.attachmentAllowed:
            self.attachmentType = None
        return self


class EmailTemplateCreate(_EmailTemplateFields):
    createdBy: Optional[str] = None


class EmailTemplateUpdate(_EmailTemplateFields):
    updatedBy: Optional[str] = None


class EmailTemplateResponse(BaseModel):
    id:                int
    templateCode:      str
    templateName:      str
    module:            str
    event:             str
    emailSubject:      str
    emailBody:         str
    attachmentAllowed: bool
    attachmentType:    Optional[str]
    status:            str
    remarks:           Optional[str]
    createdBy:         Optional[str]
    createdDate:       Optional[datetime]
    updatedBy:         Optional[str]
    updatedDate:       Optional[datetime]

    class Config:
        from_attributes = True
