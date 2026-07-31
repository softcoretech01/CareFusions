from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Enum, SmallInteger, Numeric
)
from sqlalchemy.sql import func
from app.database import Base


class MasterEquipment(Base):
    __tablename__ = "Master_Equipment"

    EquipmentId          = Column(Integer,       primary_key=True, index=True, autoincrement=True)
    EquipmentCode        = Column(String(20),    unique=True, nullable=False)   # Auto: EQP-001
    EquipmentName        = Column(String(150),   nullable=False)
    Manufacturer         = Column(String(100),   nullable=False)
    Model                = Column(String(100),   nullable=False)
    # SerialNumber uniqueness is enforced in the SP for non-deleted rows only.
    SerialNumber         = Column(String(100),   index=True, nullable=False)

    # ── Purchase Details ─────────────────────────────────────
    PurchaseDate         = Column(Date,          nullable=False)
    WarrantyExpiryDate   = Column(Date,          nullable=True)
    Supplier             = Column(String(150),   nullable=True)
    PurchaseCost         = Column(Numeric(14, 2), nullable=True)

    # ── Maintenance Details ──────────────────────────────────
    CalibrationSchedule  = Column(Enum("Monthly", "Quarterly", "Bi-Annual", "Annual"),
                                  nullable=False)
    NextMaintenanceDate  = Column(Date,          nullable=False)
    MaintenanceVendor    = Column(String(150),   nullable=True)
    LastServiceDate      = Column(Date,          nullable=True)

    # ── Location Details ─────────────────────────────────────
    Hospital             = Column(String(100),   nullable=False)
    Branch               = Column(String(100),   nullable=False)
    Department           = Column(String(100),   nullable=False)
    RoomNumber           = Column(String(50),    nullable=True)

    # ── System Information ───────────────────────────────────
    Status               = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks              = Column(Text,          nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy            = Column(String(100),   nullable=True)
    CreatedDate          = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy            = Column(String(100),   nullable=True)
    UpdatedDate          = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted            = Column(SmallInteger,  nullable=False, default=0)
