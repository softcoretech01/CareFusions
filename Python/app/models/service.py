from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Enum, SmallInteger, Numeric
)
from sqlalchemy.sql import func
from app.database import Base


class MasterService(Base):
    __tablename__ = "Master_Service"

    ServiceId              = Column(Integer,       primary_key=True, index=True, autoincrement=True)
    ServiceCode            = Column(String(20),    unique=True, nullable=False)   # Auto: SRV-001
    # ServiceName uniqueness is enforced in the SP for non-deleted rows only.
    ServiceName            = Column(String(150),   index=True, nullable=False)
    ServiceCategory        = Column(String(100),   nullable=False)
    Department             = Column(String(100),   nullable=False)
    Description            = Column(String(500),   nullable=True)

    # ── Pricing Information ──────────────────────────────────
    StandardPrice          = Column(Numeric(12, 2), nullable=False)
    CostPrice              = Column(Numeric(12, 2), nullable=True)
    TaxApplicable          = Column(SmallInteger,  nullable=False, default=0)
    Tax                    = Column(String(20),    nullable=True)

    # ── Configuration ────────────────────────────────────────
    AllowDiscount          = Column(SmallInteger,  nullable=False, default=0)
    RequiresDoctorApproval = Column(SmallInteger,  nullable=False, default=0)
    AvailableForOp         = Column(SmallInteger,  nullable=False, default=0)
    AvailableForIp         = Column(SmallInteger,  nullable=False, default=0)
    AvailableForEmergency  = Column(SmallInteger,  nullable=False, default=0)

    # ── System Information ───────────────────────────────────
    Status                 = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks                = Column(Text,          nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy              = Column(String(100),   nullable=True)
    CreatedDate            = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy              = Column(String(100),   nullable=True)
    UpdatedDate            = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted              = Column(SmallInteger,  nullable=False, default=0)
