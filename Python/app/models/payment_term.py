from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterPaymentTerm(Base):
    __tablename__ = "Master_PaymentTerm"

    PaymentTermId   = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    # PaymentTermName uniqueness is enforced in the SP for non-deleted rows only.
    PaymentTermName = Column(String(100),  index=True, nullable=False)
    CreditDays      = Column(Integer,      nullable=False, default=0)
    Description     = Column(String(500),  nullable=True)
    Status          = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy       = Column(String(100),  nullable=True)
    CreatedDate     = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy       = Column(String(100),  nullable=True)
    UpdatedDate     = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted       = Column(SmallInteger, nullable=False, default=0)
