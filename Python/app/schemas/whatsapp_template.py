import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


class LanguageEnum(str, Enum):
    en_US = "en_US"
    en_GB = "en_GB"
    hi    = "hi"


class MediaEnum(str, Enum):
    Nil      = "None"
    Image    = "Image"
    Document = "Document"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
NAME_MAX    = 150
MODULE_MAX  = 100
EVENT_MAX   = 100
META_ID_MAX = 100
MSG_MAX     = 1000
REMARKS_MAX = 500

# Meta template names: lowercase letters, numbers, and underscores only.
_META_ID_RE = re.compile(r"^[a-z0-9_]+$")


class _WaTemplateFields(BaseModel):
    templateName:       str            = Field(max_length=NAME_MAX)
    module:             str            = Field(max_length=MODULE_MAX)
    event:              str            = Field(max_length=EVENT_MAX)
    whatsappTemplateId: str            = Field(max_length=META_ID_MAX)
    language:           LanguageEnum   = LanguageEnum.en_US
    templateMessage:    str            = Field(max_length=MSG_MAX)
    mediaAttachment:    MediaEnum      = MediaEnum.Nil
    status:             StatusEnum     = StatusEnum.Active
    remarks:            Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("templateName", "module", "event", "templateMessage")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("whatsappTemplateId")
    @classmethod
    def valid_meta_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("WhatsApp Template ID is required")
        if not _META_ID_RE.match(v):
            raise ValueError("WhatsApp Template ID may contain only lowercase letters, numbers and underscores")
        return v

    @field_validator("remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class WaTemplateCreate(_WaTemplateFields):
    createdBy: Optional[str] = None


class WaTemplateUpdate(_WaTemplateFields):
    updatedBy: Optional[str] = None


class WaTemplateResponse(BaseModel):
    id:                 int
    templateCode:       str
    templateName:       str
    module:             str
    event:              str
    whatsappTemplateId: str
    language:           str
    templateMessage:    str
    mediaAttachment:    str
    status:             str
    remarks:            Optional[str]
    createdBy:          Optional[str]
    createdDate:        Optional[datetime]
    updatedBy:          Optional[str]
    updatedDate:        Optional[datetime]

    class Config:
        from_attributes = True
