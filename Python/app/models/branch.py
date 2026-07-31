from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class MasterBranch(Base):
    __tablename__ = "Master_Branch"

    BranchId           = Column(Integer, primary_key=True, index=True, autoincrement=True)
    BranchCode         = Column(String(50),  unique=True, nullable=False)
    BranchName         = Column(String(255), nullable=False)
    HospitalId         = Column(Integer, ForeignKey("Master_Hospital.HospitalId"), nullable=False)
    BranchType         = Column(String(100), nullable=False, default="Main Hospital")
    Address1           = Column(String(500), nullable=False)
    Address2           = Column(String(500), nullable=True)
    Country            = Column(String(100), nullable=False)
    State              = Column(String(100), nullable=False)
    City               = Column(String(100), nullable=False)
    PostalCode         = Column(String(20),  nullable=False)
    ContactNumber      = Column(String(20),  nullable=False)
    Email              = Column(String(255), nullable=True)
    BranchManager      = Column(String(255), nullable=True)
    WorkingHours       = Column(String(100), nullable=False)
    EmergencyAvailable = Column(Enum("Yes", "No"), nullable=False, default="Yes")
    NumberOfFloors     = Column(SmallInteger, nullable=True)
    NumberOfBeds       = Column(Integer,  nullable=True)
    Status             = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks            = Column(Text, nullable=True)
    CreatedDate        = Column(DateTime, server_default=func.now(), nullable=False)
    ModifiedDate       = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted          = Column(SmallInteger, nullable=False, default=0)
