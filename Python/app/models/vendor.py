from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterVendor(Base):
    __tablename__ = "Master_Vendor"

    VendorId          = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    VendorCode        = Column(String(20),   unique=True, nullable=False)   # Auto: VEN-001
    # VendorName uniqueness is enforced in the SP for non-deleted rows only.
    VendorName        = Column(String(150),  index=True, nullable=False)
    ContactPerson     = Column(String(100),  nullable=False)
    MobileNumber      = Column(String(20),   nullable=False)
    Email             = Column(String(150),  nullable=False)

    # ── Statutory / Tax ──────────────────────────────────────
    GstNumber         = Column(String(20),   nullable=True)
    PanNumber         = Column(String(15),   nullable=True)
    DrugLicenseNumber = Column(String(50),   nullable=True)

    # ── Address ──────────────────────────────────────────────
    Address           = Column(String(255),  nullable=False)
    City              = Column(String(100),  nullable=False)
    State             = Column(String(100),  nullable=False)
    Country           = Column(String(100),  nullable=False)
    PinCode           = Column(String(20),   nullable=False)

    # ── Payment ──────────────────────────────────────────────
    PaymentTerms      = Column(String(50),   nullable=True)
    CreditDays        = Column(Integer,      nullable=True)

    # ── System Information ───────────────────────────────────
    Status            = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy         = Column(String(100),  nullable=True)
    CreatedDate       = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy         = Column(String(100),  nullable=True)
    UpdatedDate       = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted         = Column(SmallInteger, nullable=False, default=0)
