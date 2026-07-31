from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterPushTemplate(Base):
    __tablename__ = "Master_PushTemplate"

    PushTemplateId      = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    TemplateCode        = Column(String(20),   unique=True, nullable=False)   # Auto: PNT-001
    # TemplateName uniqueness is enforced in the SP for non-deleted rows only.
    TemplateName        = Column(String(150),  index=True, nullable=False)
    Module              = Column(String(100),  nullable=False)
    Event               = Column(String(100),  nullable=False)
    NotificationTitle   = Column(String(150),  nullable=False)
    NotificationMessage = Column(String(500),  nullable=False)
    ClickAction         = Column(String(100),  nullable=True)
    DeepLinkUrl         = Column(String(255),  nullable=True)
    Priority            = Column(String(10),   nullable=False, default="Medium")
    Status              = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks             = Column(String(500),  nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy           = Column(String(100),  nullable=True)
    CreatedDate         = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy           = Column(String(100),  nullable=True)
    UpdatedDate         = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted           = Column(SmallInteger, nullable=False, default=0)
