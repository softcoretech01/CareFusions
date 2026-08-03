from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


ROLE_MAX    = 100
MODULE_MAX  = 100
REMARKS_MAX = 500


class _PermFields(BaseModel):
    role:                str            = Field(max_length=ROLE_MAX)
    module:              str            = Field(max_length=MODULE_MAX)
    subModule:           Optional[str]  = Field(default=None, max_length=MODULE_MAX)
    canView:             bool           = True
    canCreate:           bool           = False
    canEdit:             bool           = False
    canDelete:           bool           = False
    canPrint:            bool           = False
    canExport:           bool           = False
    canImport:           bool           = False
    canApprove:          bool           = False
    allowApiAccess:      bool           = False
    allowDataExport:     bool           = False
    allowBulkOperations: bool           = False
    allowAuditLogAccess: bool           = False
    status:              StatusEnum     = StatusEnum.Active
    remarks:             Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("role", "module")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("subModule", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class PermissionCreate(_PermFields):
    createdBy: Optional[str] = None


class PermissionUpdate(_PermFields):
    updatedBy: Optional[str] = None


class PermissionResponse(BaseModel):
    id:                  int
    permissionCode:      str
    role:                str
    module:              str
    subModule:           Optional[str]
    canView:             bool
    canCreate:           bool
    canEdit:             bool
    canDelete:           bool
    canPrint:            bool
    canExport:           bool
    canImport:           bool
    canApprove:          bool
    allowApiAccess:      bool
    allowDataExport:     bool
    allowBulkOperations: bool
    allowAuditLogAccess: bool
    status:              str
    remarks:             Optional[str]
    createdDate:         Optional[datetime]
    updatedDate:         Optional[datetime]

    class Config:
        from_attributes = True
