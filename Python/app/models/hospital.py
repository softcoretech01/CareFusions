from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterHospital(Base):
    __tablename__ = "Master_Hospital"

    HospitalId      = Column(Integer, primary_key=True, index=True, autoincrement=True)
    HospitalCode    = Column(String(50),  unique=True, nullable=False)
    HospitalName    = Column(String(255), unique=True, nullable=False)
    LegalName       = Column(String(255), nullable=False)
    RegistrationNo  = Column(String(100), unique=True, nullable=False)
    GstVatNo        = Column(String(100), nullable=True)
    PanTinNo        = Column(String(100), nullable=True)
    ContactNumber   = Column(String(20),  nullable=False)
    AlternateNumber = Column(String(20),  nullable=True)
    Email           = Column(String(255), nullable=False)
    Website         = Column(String(255), nullable=True)
    Address1        = Column(String(500), nullable=False)
    Address2        = Column(String(500), nullable=True)
    Country         = Column(String(100), nullable=False)
    State           = Column(String(100), nullable=False)
    City            = Column(String(100), nullable=False)
    PostalCode      = Column(String(20),  nullable=False)
    Currency        = Column(Enum("USD", "EUR", "GBP", "INR"), nullable=False, default="USD")
    FinancialYear   = Column(String(20),  nullable=False)
    TimeZone        = Column(String(100), nullable=False)
    Status          = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks         = Column(Text, nullable=True)
    CreatedDate     = Column(DateTime, server_default=func.now(), nullable=False)
    ModifiedDate    = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted       = Column(SmallInteger, nullable=False, default=0)
