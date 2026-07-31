from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger, Numeric
from sqlalchemy.sql import func
from app.database import Base


class MasterCashCounter(Base):
    __tablename__ = "Master_CashCounter"

    CashCounterId    = Column(Integer,       primary_key=True, index=True, autoincrement=True)
    CounterCode      = Column(String(20),    unique=True, nullable=False)   # Auto: CTR-001
    # CounterName uniqueness is enforced in the SP for non-deleted rows only.
    CounterName      = Column(String(150),   index=True, nullable=False)
    Hospital         = Column(String(150),   nullable=False)
    Branch           = Column(String(150),   nullable=False)
    AssignedUser     = Column(String(150),   nullable=False)
    OpeningBalance   = Column(Numeric(15, 2), nullable=False, default=0)
    MaximumCashLimit = Column(Numeric(15, 2), nullable=False, default=0)
    Status           = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks          = Column(Text,          nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy        = Column(String(100),   nullable=True)
    CreatedDate      = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy        = Column(String(100),   nullable=True)
    UpdatedDate      = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted        = Column(SmallInteger,  nullable=False, default=0)
