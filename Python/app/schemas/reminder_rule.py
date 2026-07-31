from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class StatusEnum(str, Enum):
    Active   = "Active"
    Inactive = "Inactive"


class ChannelEnum(str, Enum):
    SMS      = "SMS"
    Email    = "Email"
    WhatsApp = "WhatsApp"
    Push     = "Push"


# ── Field limits (kept in sync with the frontend LIMITS + DB columns) ──
NAME_MAX     = 150
MODULE_MAX   = 100
EVENT_MAX    = 100
TRIGGER_MAX  = 100
FREQ_MAX     = 100
REMARKS_MAX  = 500
RETRY_MIN    = 1
RETRY_MAX    = 10


class _ReminderRuleFields(BaseModel):
    ruleName:            str            = Field(max_length=NAME_MAX)
    module:              str            = Field(max_length=MODULE_MAX)
    event:               str            = Field(max_length=EVENT_MAX)
    triggerBefore:       str            = Field(max_length=TRIGGER_MAX)
    notificationChannel: ChannelEnum    = ChannelEnum.SMS
    repeatReminder:      bool           = False
    repeatFrequency:     Optional[str]  = Field(default=None, max_length=FREQ_MAX)
    maxRetryCount:       int            = 1
    recipientPatient:    bool           = True
    recipientDoctor:     bool           = False
    recipientStaff:      bool           = False
    recipientAttender:   bool           = False
    status:              StatusEnum     = StatusEnum.Active
    remarks:             Optional[str]  = Field(default=None, max_length=REMARKS_MAX)

    @field_validator("ruleName", "module", "event", "triggerBefore")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required and cannot be blank")
        return v.strip()

    @field_validator("repeatFrequency", "remarks")
    @classmethod
    def blank_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @model_validator(mode="after")
    def cross_field_rules(self):
        # At least one recipient must be selected.
        if not (self.recipientPatient or self.recipientDoctor
                or self.recipientStaff or self.recipientAttender):
            raise ValueError("Select at least one recipient (Patient, Doctor, Staff or Attender)")

        if self.repeatReminder:
            # Repeat on: frequency required, retry within range.
            if not self.repeatFrequency:
                raise ValueError("Repeat Frequency is required when 'Repeat Reminder' is on")
            if self.maxRetryCount < RETRY_MIN or self.maxRetryCount > RETRY_MAX:
                raise ValueError(f"Max Retry Count must be between {RETRY_MIN} and {RETRY_MAX}")
        else:
            # Repeat off: these fields don't apply — normalise them.
            self.repeatFrequency = None
            self.maxRetryCount = 1
        return self


class ReminderRuleCreate(_ReminderRuleFields):
    createdBy: Optional[str] = None


class ReminderRuleUpdate(_ReminderRuleFields):
    updatedBy: Optional[str] = None


class ReminderRuleResponse(BaseModel):
    id:                  int
    ruleCode:            str
    ruleName:            str
    module:              str
    event:               str
    triggerBefore:       str
    notificationChannel: str
    repeatReminder:      bool
    repeatFrequency:     Optional[str]
    maxRetryCount:       int
    recipientPatient:    bool
    recipientDoctor:     bool
    recipientStaff:      bool
    recipientAttender:   bool
    status:              str
    remarks:             Optional[str]
    createdBy:           Optional[str]
    createdDate:         Optional[datetime]
    updatedBy:           Optional[str]
    updatedDate:         Optional[datetime]

    class Config:
        from_attributes = True
