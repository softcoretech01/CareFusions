from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger, Numeric
from sqlalchemy.sql import func
from app.database import Base


class MasterBank(Base):
    __tablename__ = "Master_Bank"

    BankId            = Column(Integer,       primary_key=True, index=True, autoincrement=True)
    BankCode          = Column(String(20),    unique=True, nullable=False)   # Auto: BNK-001
    BankName          = Column(String(150),   index=True, nullable=False)
    # AccountNumber uniqueness is enforced in the SP for non-deleted rows only.
    AccountNumber     = Column(String(50),    index=True, nullable=False)
    AccountHolderName = Column(String(150),   nullable=False)
    Branch            = Column(String(150),   nullable=False)
    IfscCode          = Column(String(20),    nullable=False)
    SwiftCode         = Column(String(20),    nullable=True)
    Currency          = Column(String(10),    nullable=False, default="INR")
    OpeningBalance    = Column(Numeric(15, 2), nullable=False, default=0)
    Status            = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks           = Column(Text,          nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy         = Column(String(100),   nullable=True)
    CreatedDate       = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy         = Column(String(100),   nullable=True)
    UpdatedDate       = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted         = Column(SmallInteger,  nullable=False, default=0)
