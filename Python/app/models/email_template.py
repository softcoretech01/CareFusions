from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterEmailTemplate(Base):
    __tablename__ = "Master_EmailTemplate"

    EmailTemplateId   = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    TemplateCode      = Column(String(20),   unique=True, nullable=False)   # Auto: EML-001
    # TemplateName uniqueness is enforced in the SP for non-deleted rows only.
    TemplateName      = Column(String(150),  index=True, nullable=False)
    Module            = Column(String(100),  nullable=False)
    Event             = Column(String(100),  nullable=False)
    EmailSubject      = Column(String(300),  nullable=False)
    EmailBody         = Column(Text,         nullable=False)   # HTML supported
    AttachmentAllowed = Column(SmallInteger, nullable=False, default=0)
    AttachmentType    = Column(String(100),  nullable=True)
    Status            = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks           = Column(String(500),  nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy         = Column(String(100),  nullable=True)
    CreatedDate       = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy         = Column(String(100),  nullable=True)
    UpdatedDate       = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted         = Column(SmallInteger, nullable=False, default=0)
