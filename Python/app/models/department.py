from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterDepartment(Base):
    __tablename__ = "Master_Department"

    DepartmentId   = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    DepartmentCode = Column(String(20),  unique=True, nullable=False)
    DepartmentName = Column(String(255), unique=True, nullable=False)
    DepartmentType = Column(Enum("Clinical", "Non-Clinical"), nullable=False, default="Clinical")
    Description    = Column(Text,        nullable=True)
    DepartmentHead = Column(String(255), nullable=True)
    Status         = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    CreatedBy      = Column(String(100), nullable=True)
    CreatedDate    = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy      = Column(String(100), nullable=True)
    UpdatedDate    = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted      = Column(SmallInteger, nullable=False, default=0)
