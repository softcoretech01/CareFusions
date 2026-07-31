from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterReminderRule(Base):
    __tablename__ = "Master_ReminderRule"

    ReminderRuleId      = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    RuleCode            = Column(String(20),   unique=True, nullable=False)   # Auto: RR-001
    # RuleName uniqueness is enforced in the SP for non-deleted rows only.
    RuleName            = Column(String(150),  index=True, nullable=False)
    Module              = Column(String(100),  nullable=False)
    Event               = Column(String(100),  nullable=False)
    TriggerBefore       = Column(String(100),  nullable=False)
    NotificationChannel = Column(String(20),   nullable=False, default="SMS")
    RepeatReminder      = Column(SmallInteger, nullable=False, default=0)
    RepeatFrequency     = Column(String(100),  nullable=True)
    MaxRetryCount       = Column(Integer,      nullable=False, default=1)
    RecipientPatient    = Column(SmallInteger, nullable=False, default=1)
    RecipientDoctor     = Column(SmallInteger, nullable=False, default=0)
    RecipientStaff      = Column(SmallInteger, nullable=False, default=0)
    RecipientAttender   = Column(SmallInteger, nullable=False, default=0)
    Status              = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks             = Column(String(500),  nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy           = Column(String(100),  nullable=True)
    CreatedDate         = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy           = Column(String(100),  nullable=True)
    UpdatedDate         = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted           = Column(SmallInteger, nullable=False, default=0)
