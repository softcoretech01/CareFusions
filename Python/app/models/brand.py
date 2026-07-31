from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterBrand(Base):
    __tablename__ = "Master_Brand"

    BrandId     = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    BrandCode   = Column(String(20),   unique=True, nullable=False)   # Auto: BRD-001
    # BrandName uniqueness is enforced in the SP for non-deleted rows only.
    BrandName   = Column(String(100),  index=True, nullable=False)
    Description = Column(String(500),  nullable=True)
    Status      = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy   = Column(String(100),  nullable=True)
    CreatedDate = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy   = Column(String(100),  nullable=True)
    UpdatedDate = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted   = Column(SmallInteger, nullable=False, default=0)
