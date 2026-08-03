from sqlalchemy import Column, Integer, String, Text, Date, DateTime, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class Appointment(Base):
    __tablename__ = "Trn_Appointment"

    AppointmentId     = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    AppointmentNumber = Column(String(20),   unique=True, nullable=False)   # Auto: APT-YYYYMMNNN
    Uhid              = Column(String(30),   nullable=False)
    PatientName       = Column(String(150),  nullable=False)
    MobileNumber      = Column(String(20),   nullable=True)
    Department        = Column(String(100),  nullable=False)
    Doctor            = Column(String(150),  nullable=True)
    AppointmentDate   = Column(Date,         nullable=False)
    TimeSlot          = Column(String(20),   nullable=True)
    DurationMinutes   = Column(Integer,      nullable=False, default=15)
    Type              = Column(String(30),   nullable=False, default="Standard")
    Priority          = Column(String(20),   nullable=False, default="Normal")
    Status            = Column(String(20),   nullable=False, default="Scheduled")
    QueueToken        = Column(String(20),   nullable=True)
    Notes             = Column(Text,         nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy         = Column(String(100),  nullable=True)
    CreatedDate       = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy         = Column(String(100),  nullable=True)
    UpdatedDate       = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted         = Column(SmallInteger, nullable=False, default=0)
