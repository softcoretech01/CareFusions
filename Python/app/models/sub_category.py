from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterSubCategory(Base):
    __tablename__ = "Master_SubCategory"

    SubCategoryId   = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    SubCategoryCode = Column(String(20),   unique=True, nullable=False)   # Auto: SUB-001
    Category        = Column(String(100),  index=True, nullable=False)    # Parent category name
    # (Category + SubCategoryName) uniqueness is enforced in the SP for non-deleted rows.
    SubCategoryName = Column(String(100),  index=True, nullable=False)
    Description     = Column(String(500),  nullable=True)
    Status          = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy       = Column(String(100),  nullable=True)
    CreatedDate     = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy       = Column(String(100),  nullable=True)
    UpdatedDate     = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted       = Column(SmallInteger, nullable=False, default=0)
