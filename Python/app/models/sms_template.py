from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterSmsTemplate(Base):
    __tablename__ = "Master_SmsTemplate"

    SmsTemplateId = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    TemplateCode  = Column(String(20),   unique=True, nullable=False)   # Auto: SMS-001
    # TemplateName uniqueness is enforced in the SP for non-deleted rows only.
    TemplateName  = Column(String(150),  index=True, nullable=False)
    Module        = Column(String(100),  nullable=False)
    Event         = Column(String(100),  nullable=False)
    Description   = Column(String(500),  nullable=True)
    SmsSubject    = Column(String(200),  nullable=True)
    SmsContent    = Column(String(1000), nullable=False)
    Status        = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks       = Column(String(500),  nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy     = Column(String(100),  nullable=True)
    CreatedDate   = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy     = Column(String(100),  nullable=True)
    UpdatedDate   = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted     = Column(SmallInteger, nullable=False, default=0)
