from sqlalchemy import Column, Integer, String, Date, Text, DateTime, Boolean
from app.database import Base
from datetime import datetime

class MasterNurse(Base):
    __tablename__ = "Master_Nurse"

    NurseId = Column(Integer, primary_key=True, index=True, autoincrement=True)
    NurseCode = Column(String(20), unique=True, index=True, nullable=False)
    NurseName = Column(String(100), index=True, nullable=False)
    Gender = Column(String(20))
    DateOfBirth = Column(Date)
    Qualification = Column(String(100))
    RegistrationNumber = Column(String(100), nullable=False)
    DepartmentName = Column(String(100))
    Designation = Column(String(100))
    HospitalName = Column(String(150))
    BranchName = Column(String(150))
    Mobile = Column(String(20), nullable=False)
    AlternateMobile = Column(String(20))
    Email = Column(String(150))
    Address = Column(String(255))
    City = Column(String(100))
    State = Column(String(100))
    Country = Column(String(100))
    PostalCode = Column(String(20))
    JoiningDate = Column(Date)
    Shift = Column(String(50))
    ReportingManager = Column(String(100))
    EmploymentType = Column(String(50))
    ExperienceYears = Column(Integer)
    Remarks = Column(Text)
    
    CreatedBy = Column(String(100), default="System")
    CreatedDate = Column(DateTime, default=datetime.utcnow)
    ModifiedBy = Column(String(100))
    ModifiedDate = Column(DateTime)
    IsDeleted = Column(Boolean, default=False)
