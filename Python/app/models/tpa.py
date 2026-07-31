from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterTpa(Base):
    __tablename__ = "Master_Tpa"

    TpaId               = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    TpaCode             = Column(String(20),   unique=True, nullable=False)   # Auto: TPA-001
    # TpaName uniqueness is enforced in the SP for non-deleted rows only.
    TpaName             = Column(String(150),  index=True, nullable=False)
    InsuranceProvider   = Column(String(150),  nullable=False)
    RegistrationNumber  = Column(String(50),   nullable=True)
    Description         = Column(String(500),  nullable=True)

    # ── Contact Information ──────────────────────────────────
    ContactPerson       = Column(String(100),  nullable=False)
    PhoneNumber         = Column(String(20),   nullable=False)
    AlternatePhone      = Column(String(20),   nullable=True)
    Email               = Column(String(150),  nullable=False)
    Website             = Column(String(255),  nullable=True)

    # ── Address Information ──────────────────────────────────
    AddressLine1        = Column(String(255),  nullable=False)
    AddressLine2        = Column(String(255),  nullable=True)
    Country             = Column(String(100),  nullable=False)
    State               = Column(String(100),  nullable=False)
    City                = Column(String(100),  nullable=False)
    PostalCode          = Column(String(20),   nullable=False)

    # ── Claim Processing ─────────────────────────────────────
    ClaimProcessingTime = Column(Integer,      nullable=True)
    CashlessApproval    = Column(SmallInteger, nullable=False, default=0)
    OnlineClaimPortal   = Column(String(255),  nullable=True)

    # ── System Information ───────────────────────────────────
    Status              = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks             = Column(Text,         nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy           = Column(String(100),  nullable=True)
    CreatedDate         = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy           = Column(String(100),  nullable=True)
    UpdatedDate         = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted           = Column(SmallInteger, nullable=False, default=0)
