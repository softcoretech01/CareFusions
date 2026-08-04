from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterPermission(Base):
    __tablename__ = "Master_Permission"

    PermissionId        = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    PermissionCode      = Column(String(20),   unique=True, nullable=False)   # Auto: PRM-001
    Role                = Column(String(100),  index=True, nullable=False)
    Module              = Column(String(100),  index=True, nullable=False)
    SubModule           = Column(String(100),  nullable=True)
    CanView             = Column(SmallInteger, nullable=False, default=1)
    CanCreate           = Column(SmallInteger, nullable=False, default=0)
    CanEdit             = Column(SmallInteger, nullable=False, default=0)
    CanDelete           = Column(SmallInteger, nullable=False, default=0)
    CanPrint            = Column(SmallInteger, nullable=False, default=0)
    CanExport           = Column(SmallInteger, nullable=False, default=0)
    CanImport           = Column(SmallInteger, nullable=False, default=0)
    CanApprove          = Column(SmallInteger, nullable=False, default=0)
    AllowApiAccess      = Column(SmallInteger, nullable=False, default=0)
    AllowDataExport     = Column(SmallInteger, nullable=False, default=0)
    AllowBulkOperations = Column(SmallInteger, nullable=False, default=0)
    AllowAuditLogAccess = Column(SmallInteger, nullable=False, default=0)
    Status              = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks             = Column(String(500),  nullable=True)

    CreatedBy           = Column(String(100),  nullable=True)
    CreatedDate         = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy           = Column(String(100),  nullable=True)
    UpdatedDate         = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted           = Column(SmallInteger, nullable=False, default=0)
