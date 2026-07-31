from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterManufacturer(Base):
    __tablename__ = "Master_Manufacturer"

    ManufacturerId   = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    ManufacturerCode = Column(String(20),   unique=True, nullable=False)   # Auto: MFG-001
    # ManufacturerName uniqueness is enforced in the SP for non-deleted rows only.
    ManufacturerName = Column(String(150),  index=True, nullable=False)
    ContactDetails   = Column(String(150),  nullable=True)
    Address          = Column(String(255),  nullable=True)
    Country          = Column(String(100),  nullable=True)
    Status           = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy        = Column(String(100),  nullable=True)
    CreatedDate      = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy        = Column(String(100),  nullable=True)
    UpdatedDate      = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted        = Column(SmallInteger, nullable=False, default=0)
