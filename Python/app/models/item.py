from sqlalchemy import Column, Integer, String, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterItem(Base):
    __tablename__ = "Master_Item"

    ItemId          = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    ItemCode        = Column(String(20),   unique=True, nullable=False)   # Auto: ITM-001
    # ItemName / Barcode uniqueness is enforced in the SP for non-deleted rows only.
    ItemName        = Column(String(200),  index=True, nullable=False)
    Category        = Column(String(100),  index=True, nullable=False)
    SubCategory     = Column(String(100),  nullable=True)
    Department      = Column(String(100),  nullable=True)
    Brand           = Column(String(100),  nullable=True)
    Manufacturer    = Column(String(150),  nullable=True)
    Vendor          = Column(String(150),  nullable=True)
    Uom             = Column(String(50),   nullable=False)

    # ── Tax / Statutory ──────────────────────────────────────
    HsnCode         = Column(String(20),   nullable=True)
    GstPercentage   = Column(Integer,      nullable=False, default=0)

    # ── Stock Control ────────────────────────────────────────
    ReorderLevel    = Column(Integer,      nullable=True)
    MinStock        = Column(Integer,      nullable=True)
    MaxStock        = Column(Integer,      nullable=True)
    ShelfLife       = Column(Integer,      nullable=True)   # Days
    BatchRequired   = Column(SmallInteger, nullable=False, default=0)
    ExpiryRequired  = Column(SmallInteger, nullable=False, default=0)

    # ── Identification ───────────────────────────────────────
    Barcode         = Column(String(50),   index=True, nullable=True)
    ItemDescription = Column(String(500),  nullable=True)

    # ── System Information ───────────────────────────────────
    Status          = Column(Enum("Active", "Inactive"), nullable=False, default="Active")

    # ── Audit ────────────────────────────────────────────────
    CreatedBy       = Column(String(100),  nullable=True)
    CreatedDate     = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy       = Column(String(100),  nullable=True)
    UpdatedDate     = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted       = Column(SmallInteger, nullable=False, default=0)
