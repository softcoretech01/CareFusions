from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterFinancialYear(Base):
    __tablename__ = "Master_FinancialYear"

    FinancialYearId        = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    # FinancialYear uniqueness is enforced in the SP for non-deleted rows only.
    FinancialYear          = Column(String(50),   index=True, nullable=False)   # FY 2024-2025
    StartDate              = Column(Date,         nullable=False)
    EndDate                = Column(Date,         nullable=False)
    IsCurrentFinancialYear = Column(SmallInteger, nullable=False, default=0)
    AllowBackdatedEntry    = Column(SmallInteger, nullable=False, default=0)
    ClosingDate            = Column(Date,         nullable=True)
    Status                 = Column(Enum("Open", "Closed"), nullable=False, default="Open")
    Remarks                = Column(Text,         nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy              = Column(String(100),  nullable=True)
    CreatedDate            = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy              = Column(String(100),  nullable=True)
    UpdatedDate            = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted              = Column(SmallInteger, nullable=False, default=0)
