from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterRole(Base):
    __tablename__ = "Master_Role"

    RoleId               = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    RoleCode             = Column(String(20),   unique=True, nullable=False)   # Auto: ROL-001
    # RoleName uniqueness is enforced in the SP for non-deleted rows only.
    RoleName             = Column(String(100),  index=True, nullable=False)
    Description          = Column(String(500),  nullable=True)
    DefaultRole          = Column(SmallInteger, nullable=False, default=0)
    CanCreateUsers       = Column(SmallInteger, nullable=False, default=0)
    CanAssignPermissions = Column(SmallInteger, nullable=False, default=0)
    Status               = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks              = Column(Text,         nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy            = Column(String(100),  nullable=True)
    CreatedDate          = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy            = Column(String(100),  nullable=True)
    UpdatedDate          = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted            = Column(SmallInteger, nullable=False, default=0)
