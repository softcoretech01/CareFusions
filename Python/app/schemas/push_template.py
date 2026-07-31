import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


class PriorityEnum(str, Enum):
    Low    = "Low"
    Medium = "Medium"
    High   = "High"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
NAME_MAX     = 150
MODULE_MAX   = 100
EVENT_MAX    = 100
TITLE_MAX    = 150
MESSAGE_MAX  = 500
ACTION_MAX   = 100
DEEPLINK_MAX = 255
REMARKS_MAX  = 500

# Deep links: a scheme like app://... or https://... (validated only when present)
_DEEPLINK_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://\S+$")


class _PushTemplateFields(BaseModel):
    templateName:        str            = Field(max_length=NAME_MAX)
    module:              str            = Field(max_length=MODULE_MAX)
    event:               str            = Field(max_length=EVENT_MAX)
    notificationTitle:   str            = Field(max_length=TITLE_MAX)
    notificationMessage: str            = Field(max_length=MESSAGE_MAX)
    clickAction:         Optional[str]  = Field(default=None, max_length=ACTION_MAX)
    deepLinkUrl:         Optional[str]  = Field(default=None, max_length=DEEPLINK_MAX)
    priority:            PriorityEnum   = PriorityEnum.Medium
    status:              StatusEnum     = StatusEnum.Active
    remarks:             Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("templateName", "module", "event", "notificationTitle", "notificationMessage")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("clickAction", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("deepLinkUrl")
    @classmethod
    def valid_deeplink(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if not _DEEPLINK_RE.match(v):
            raise ValueError("Deep Link URL must include a scheme, e.g. app://patient or https://example.com")
        return v


class PushTemplateCreate(_PushTemplateFields):
    createdBy: Optional[str] = None


class PushTemplateUpdate(_PushTemplateFields):
    updatedBy: Optional[str] = None


class PushTemplateResponse(BaseModel):
    id:                  int
    templateCode:        str
    templateName:        str
    module:              str
    event:               str
    notificationTitle:   str
    notificationMessage: str
    clickAction:         Optional[str]
    deepLinkUrl:         Optional[str]
    priority:            str
    status:              str
    remarks:             Optional[str]
    createdBy:           Optional[str]
    createdDate:         Optional[datetime]
    updatedBy:           Optional[str]
    updatedDate:         Optional[datetime]

    class Config:
        from_attributes = True
