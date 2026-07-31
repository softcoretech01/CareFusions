from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Enum, SmallInteger, Numeric
)
from sqlalchemy.sql import func
from app.database import Base


class MasterTax(Base):
    __tablename__ = "Master_Tax"

    TaxId          = Column(Integer,       primary_key=True, index=True, autoincrement=True)
    # TaxCode is derived from GstPercentage; not a hard unique (see SQL note).
    TaxCode        = Column(String(20),    index=True, nullable=False)     # Auto: GST-18
    # GstPercentage uniqueness is enforced in the SP for non-deleted rows only.
    GstPercentage  = Column(Integer,       index=True, nullable=False)    # 0 - 100
    Cgst           = Column(Numeric(5, 2), nullable=False)
    Sgst           = Column(Numeric(5, 2), nullable=False)
    Igst           = Column(Numeric(5, 2), nullable=False)
    EffectiveDate  = Column(Date,          nullable=False)
    Status         = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy      = Column(String(100),   nullable=True)
    CreatedDate    = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy      = Column(String(100),   nullable=True)
    UpdatedDate    = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted      = Column(SmallInteger,  nullable=False, default=0)
