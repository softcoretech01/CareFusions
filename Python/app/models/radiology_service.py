from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Enum, SmallInteger, Numeric
)
from sqlalchemy.sql import func
from app.database import Base


class MasterRadiologyService(Base):
    __tablename__ = "Master_RadiologyService"

    RadiologyServiceId   = Column(Integer,       primary_key=True, index=True, autoincrement=True)
    ServiceCode          = Column(String(20),    unique=True, nullable=False)   # Auto: RAD-001
    # ServiceName uniqueness is enforced in the SP for non-deleted rows only
    # (so a soft-deleted name can be reused) — not a hard DB constraint.
    ServiceName          = Column(String(255),   index=True, nullable=False)
    Department           = Column(String(100),   nullable=False)
    Description          = Column(String(500),   nullable=True)

    # ── Service Details ──────────────────────────────────────
    ServiceCategory      = Column(Enum("X-Ray", "CT Scan", "MRI", "Ultrasound",
                                       "Mammogram", "ECG", "Echo", "PET Scan"),
                                  nullable=False)
    EstimatedDuration    = Column(Integer,       nullable=False)   # Minutes
    ReportTat            = Column(Integer,       nullable=False)   # Hours
    RequiresAppointment  = Column(SmallInteger,  nullable=False, default=1)
    RequiresContrast     = Column(SmallInteger,  nullable=False, default=0)
    RequiresFasting      = Column(SmallInteger,  nullable=False, default=0)

    # ── Billing Information ──────────────────────────────────
    ServicePrice         = Column(Numeric(12, 2), nullable=False)
    Gst                  = Column(Numeric(5, 2),  nullable=True)   # Percent

    # ── Report Configuration ─────────────────────────────────
    ReportTemplate       = Column(String(255),   nullable=True)
    RequiresApproval     = Column(SmallInteger,  nullable=False, default=1)
    CriticalFindingAlert = Column(SmallInteger,  nullable=False, default=0)

    # ── System Information ───────────────────────────────────
    Status               = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks              = Column(Text,          nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy            = Column(String(100),   nullable=True)
    CreatedDate          = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy            = Column(String(100),   nullable=True)
    UpdatedDate          = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted            = Column(SmallInteger,  nullable=False, default=0)
