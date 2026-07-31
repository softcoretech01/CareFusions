from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterPaymentMode(Base):
    __tablename__ = "Master_PaymentMode"

    PaymentModeId       = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    PaymentCode         = Column(String(20),   unique=True, nullable=False)   # Auto: PAY-001
    # PaymentMode uniqueness is enforced in the SP for non-deleted rows only.
    PaymentMode         = Column(String(100),  index=True, nullable=False)
    Description         = Column(String(500),  nullable=True)

    # ── Configuration ────────────────────────────────────────
    TransactionRequired = Column(SmallInteger, nullable=False, default=0)
    SupportsRefund      = Column(SmallInteger, nullable=False, default=0)
    IsDefault           = Column(SmallInteger, nullable=False, default=0)

    # ── System Information ───────────────────────────────────
    Status              = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks             = Column(Text,         nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy           = Column(String(100),  nullable=True)
    CreatedDate         = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy           = Column(String(100),  nullable=True)
    UpdatedDate         = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted           = Column(SmallInteger, nullable=False, default=0)
