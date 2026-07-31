from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterStore(Base):
    __tablename__ = "Master_Store"

    StoreId       = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    StoreCode     = Column(String(20),   unique=True, nullable=False)   # Auto: STR-001
    # StoreName uniqueness is enforced in the SP for non-deleted rows only.
    StoreName     = Column(String(150),  index=True, nullable=False)
    StoreType     = Column(Enum("Main Store", "Sub Store", "Pharmacy Store", "OT Store", "Lab Store"),
                           nullable=False)
    Location      = Column(String(255),  nullable=True)
    InCharge      = Column(String(100),  nullable=True)
    ContactNumber = Column(String(20),   nullable=True)
    Status        = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy     = Column(String(100),  nullable=True)
    CreatedDate   = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy     = Column(String(100),  nullable=True)
    UpdatedDate   = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted     = Column(SmallInteger, nullable=False, default=0)
