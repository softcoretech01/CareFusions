from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger, Numeric
from sqlalchemy.sql import func
from app.database import Base


class MasterCoaAccount(Base):
    __tablename__ = "Master_CoaAccount"

    CoaId                  = Column(Integer,       primary_key=True, index=True, autoincrement=True)
    AccountCode            = Column(String(20),    unique=True, nullable=False)   # Auto: COA-001
    # AccountName uniqueness is enforced in the SP for non-deleted rows only.
    AccountName            = Column(String(150),   index=True, nullable=False)
    AccountType            = Column(Enum("Asset", "Liability", "Income", "Expense", "Equity"),
                                    nullable=False)
    ParentAccount          = Column(String(150),   nullable=True)
    Description            = Column(String(500),   nullable=True)
    OpeningBalance         = Column(Numeric(15, 2), nullable=False, default=0)
    AllowManualJournal     = Column(SmallInteger,  nullable=False, default=1)
    ReconciliationRequired = Column(SmallInteger,  nullable=False, default=0)
    Status                 = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks                = Column(Text,          nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy              = Column(String(100),   nullable=True)
    CreatedDate            = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy              = Column(String(100),   nullable=True)
    UpdatedDate            = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted              = Column(SmallInteger,  nullable=False, default=0)
