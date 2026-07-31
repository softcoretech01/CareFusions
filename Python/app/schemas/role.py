from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


NAME_MAX    = 100
DESC_MAX    = 500
REMARKS_MAX = 500


class _RoleFields(BaseModel):
    roleName:             str            = Field(max_length=NAME_MAX)
    description:          Optional[str]  = Field(default=None, max_length=DESC_MAX)
    defaultRole:          bool           = False
    canCreateUsers:       bool           = False
    canAssignPermissions: bool           = False
    status:               StatusEnum     = StatusEnum.Active
    remarks:              Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("roleName")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Role Name is required and cannot be blank")
        return v.strip()

    @field_validator("description", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class RoleCreate(_RoleFields):
    createdBy: Optional[str] = None


class RoleUpdate(_RoleFields):
    updatedBy: Optional[str] = None


class RoleResponse(BaseModel):
    id:                   int
    roleCode:             str
    roleName:             str
    description:          Optional[str]
    numberOfUsers:        int = 0
    defaultRole:          bool
    canCreateUsers:       bool
    canAssignPermissions: bool
    status:               str
    remarks:              Optional[str]
    createdBy:            Optional[str]
    createdDate:          Optional[datetime]
    updatedBy:            Optional[str]
    updatedDate:          Optional[datetime]

    class Config:
        from_attributes = True
