from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterUom(Base):
    __tablename__ = "Master_Uom"

    UomId       = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    # UomCode/UomName uniqueness is enforced in the SP for non-deleted rows only.
    UomCode     = Column(String(20),   index=True, nullable=False)   # User-entered: EA, KG, BOX
    UomName     = Column(String(100),  index=True, nullable=False)
    ShortName   = Column(String(20),   nullable=False)
    Status      = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy   = Column(String(100),  nullable=True)
    CreatedDate = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy   = Column(String(100),  nullable=True)
    UpdatedDate = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted   = Column(SmallInteger, nullable=False, default=0)
