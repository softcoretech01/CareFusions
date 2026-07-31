from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    __tablename__ = "Audit_Log"

    AuditLogId        = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    AuditId           = Column(String(30),   unique=True, nullable=False)   # Auto: ADT-YYYYMMDD-NNN
    AuditTimestamp    = Column(DateTime,     nullable=False)                # Server-set
    UserName          = Column(String(100),  index=True, nullable=False)
    EmployeeName      = Column(String(150),  nullable=True)
    Role              = Column(String(100),  index=True, nullable=True)
    Department        = Column(String(100),  nullable=True)
    Module            = Column(String(100),  index=True, nullable=False)
    ScreenName        = Column(String(150),  nullable=True)
    Action            = Column(String(50),   index=True, nullable=False)
    RecordId          = Column(String(50),   nullable=True)
    TransactionNumber = Column(String(50),   nullable=True)
    IpAddress         = Column(String(45),   nullable=True)
    Device            = Column(String(50),   nullable=True)
    Browser           = Column(String(100),  nullable=True)
    OperatingSystem   = Column(String(100),  nullable=True)
    SessionId         = Column(String(100),  nullable=True)
    OldValues         = Column(Text,         nullable=True)
    NewValues         = Column(Text,         nullable=True)
    ChangeSummary     = Column(String(1000), nullable=True)
    Status            = Column(Enum("Success", "Failed"), nullable=False, default="Success")
    FailureReason     = Column(String(500),  nullable=True)
    CreatedDate       = Column(DateTime, server_default=func.now(), nullable=False)
