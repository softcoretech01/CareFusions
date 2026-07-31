from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterCostCenter(Base):
    __tablename__ = "Master_CostCenter"

    CostCenterId   = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    CostCenterCode = Column(String(20),   unique=True, nullable=False)   # Auto: CST-001
    # CostCenterName uniqueness is enforced in the SP for non-deleted rows only.
    CostCenterName = Column(String(150),  index=True, nullable=False)
    Department     = Column(String(100),  nullable=False)
    Manager        = Column(String(100),  nullable=True)
    Description    = Column(String(500),  nullable=True)
    Status         = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks        = Column(Text,         nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy      = Column(String(100),  nullable=True)
    CreatedDate    = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy      = Column(String(100),  nullable=True)
    UpdatedDate    = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted      = Column(SmallInteger, nullable=False, default=0)
