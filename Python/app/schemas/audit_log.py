from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Success = "Success"
    Failed  = "Failed"


# ── Field limits (kept in sync with the DB columns) ──
USERNAME_MAX = 100
EMP_MAX      = 150
ROLE_MAX     = 100
DEPT_MAX     = 100
MODULE_MAX   = 100
SCREEN_MAX   = 150
ACTION_MAX   = 50
RECORD_MAX   = 50
TXN_MAX      = 50
IP_MAX       = 45
DEVICE_MAX   = 50
BROWSER_MAX  = 100
OS_MAX       = 100
SESSION_MAX  = 100
VALUES_MAX   = 5000
SUMMARY_MAX  = 1000
REASON_MAX   = 500


# ── Request: append a new audit entry (used by the system to record actions) ──
# NOTE: AuditId and the timestamp are ALWAYS server-generated — never accepted here.
class AuditLogCreate(BaseModel):
    userName:          str            = Field(max_length=USERNAME_MAX)
    module:            str            = Field(max_length=MODULE_MAX)
    action:            str            = Field(max_length=ACTION_MAX)
    employeeName:      Optional[str]  = Field(default=None, max_length=EMP_MAX)
    role:              Optional[str]  = Field(default=None, max_length=ROLE_MAX)
    department:        Optional[str]  = Field(default=None, max_length=DEPT_MAX)
    screenName:        Optional[str]  = Field(default=None, max_length=SCREEN_MAX)
    recordId:          Optional[str]  = Field(default=None, max_length=RECORD_MAX)
    transactionNumber: Optional[str]  = Field(default=None, max_length=TXN_MAX)
    ipAddress:         Optional[str]  = Field(default=None, max_length=IP_MAX)
    device:            Optional[str]  = Field(default=None, max_length=DEVICE_MAX)
    browser:           Optional[str]  = Field(default=None, max_length=BROWSER_MAX)
    operatingSystem:   Optional[str]  = Field(default=None, max_length=OS_MAX)
    sessionId:         Optional[str]  = Field(default=None, max_length=SESSION_MAX)
    oldValues:         Optional[str]  = Field(default=None, max_length=VALUES_MAX)
    newValues:         Optional[str]  = Field(default=None, max_length=VALUES_MAX)
    changeSummary:     Optional[str]  = Field(default=None, max_length=SUMMARY_MAX)
    status:            StatusEnum     = StatusEnum.Success
    failureReason:     Optional[str]  = Field(default=None, max_length=REASON_MAX)

    @field_validator("userName", "module", "action")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @model_validator(mode="after")
    def failure_reason_rule(self):
        # A failed action must record why; a successful one carries no failure reason.
        if self.status == StatusEnum.Failed and not (self.failureReason and self.failureReason.strip()):
            raise ValueError("Failure Reason is required when Status is 'Failed'")
        if self.status == StatusEnum.Success:
            self.failureReason = None
        return self


class AuditLogResponse(BaseModel):
    id:                int
    auditId:           str
    timestamp:         Optional[datetime]
    userName:          str
    employeeName:      Optional[str]
    role:              Optional[str]
    department:        Optional[str]
    module:            str
    screenName:        Optional[str]
    action:            str
    recordId:          Optional[str]
    transactionNumber: Optional[str]
    ipAddress:         Optional[str]
    device:            Optional[str]
    browser:           Optional[str]
    operatingSystem:   Optional[str]
    sessionId:         Optional[str]
    oldValues:         Optional[str]
    newValues:         Optional[str]
    changeSummary:     Optional[str]
    status:            str
    failureReason:     Optional[str]

    class Config:
        from_attributes = True
