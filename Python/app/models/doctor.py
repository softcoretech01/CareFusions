from sqlalchemy import Column, Integer, String, Date, Text, Boolean, Enum, ForeignKey, Numeric, Time, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Doctor(Base):
    __tablename__ = "Master_Doctor_Header"

    DoctorId            = Column(Integer, primary_key=True, index=True, autoincrement=True)
    DoctorCode          = Column(String(20), unique=True, nullable=False)
    DoctorName          = Column(String(255), nullable=False)
    Gender              = Column(Enum("Male", "Female", "Other"), nullable=False)
    DateOfBirth         = Column(Date, nullable=True)
    Mobile              = Column(String(20), nullable=False)
    AlternateMobile     = Column(String(20), nullable=True)
    Email               = Column(String(255), unique=True, nullable=False)
    Address1            = Column(String(500), nullable=True)
    Address2            = Column(String(500), nullable=True)
    City                = Column(String(100), nullable=True)
    State               = Column(String(100), nullable=True)
    Country             = Column(String(100), nullable=True)
    PostalCode          = Column(String(20), nullable=True)
    Status              = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks             = Column(Text, nullable=True)
    CreatedDate         = Column(DateTime, nullable=False, server_default=func.now())
    CreatedBy           = Column(String(100), nullable=False, default="System")
    ModifiedDate        = Column(DateTime, nullable=True, onupdate=func.now())
    ModifiedBy          = Column(String(100), nullable=True)
    IsDeleted           = Column(Boolean, nullable=False, default=False)

    professional_detail = relationship("DoctorProfessionalDetail", back_populates="doctor", uselist=False)
    consultation_detail = relationship("DoctorConsultationDetail", back_populates="doctor", uselist=False)
    schedule_detail     = relationship("DoctorScheduleDetail", back_populates="doctor", uselist=False)
    document_detail     = relationship("DoctorDocumentDetail", back_populates="doctor", uselist=False)

class DoctorProfessionalDetail(Base):
    __tablename__ = "Master_DoctorProfessional_Detail"

    DoctorId            = Column(Integer, ForeignKey("Master_Doctor_Header.DoctorId", ondelete="CASCADE"), primary_key=True)
    Qualification       = Column(String(255), nullable=False)
    Specialization      = Column(String(255), nullable=False)
    HospitalName        = Column(String(255), nullable=False)
    BranchName          = Column(String(255), nullable=False)
    DepartmentName      = Column(String(255), nullable=False)
    Designation         = Column(String(100), nullable=True)
    Experience          = Column(Integer, nullable=True)
    Languages           = Column(String(500), nullable=True)
    JoiningDate         = Column(Date, nullable=True)

    doctor = relationship("Doctor", back_populates="professional_detail")

class DoctorConsultationDetail(Base):
    __tablename__ = "Master_DoctorConsultation_Detail"

    DoctorId            = Column(Integer, ForeignKey("Master_Doctor_Header.DoctorId", ondelete="CASCADE"), primary_key=True)
    ConsultationFee     = Column(Numeric(10, 2), nullable=False)
    FollowUpFee         = Column(Numeric(10, 2), nullable=True)
    EmergencyFee        = Column(Numeric(10, 2), nullable=True)
    TeleConsultationFee = Column(Numeric(10, 2), nullable=True)
    OpDuration          = Column(Integer, nullable=False)
    MaxPatients         = Column(Integer, nullable=True)
    AllowOnlineBooking  = Column(Boolean, nullable=False, default=False)

    doctor = relationship("Doctor", back_populates="consultation_detail")

class DoctorScheduleDetail(Base):
    __tablename__ = "Master_DoctorSchedule_Detail"

    DoctorId            = Column(Integer, ForeignKey("Master_Doctor_Header.DoctorId", ondelete="CASCADE"), primary_key=True)
    AvailableDays       = Column(String(100), nullable=False)
    FromTime            = Column(Time, nullable=False)
    ToTime              = Column(Time, nullable=False)
    BreakFrom           = Column(Time, nullable=True)
    BreakTo             = Column(Time, nullable=True)
    SlotDuration        = Column(Integer, nullable=False)
    AvailableEmergency  = Column(Boolean, nullable=False, default=False)
    AvailableTele       = Column(Boolean, nullable=False, default=False)

    doctor = relationship("Doctor", back_populates="schedule_detail")

class DoctorDocumentDetail(Base):
    __tablename__ = "Master_DoctorDocument_Detail"

    DoctorId                = Column(Integer, ForeignKey("Master_Doctor_Header.DoctorId", ondelete="CASCADE"), primary_key=True)
    DoctorPhoto             = Column(String(500), nullable=True)
    SignatureImage          = Column(String(500), nullable=True)
    DigitalSignature        = Column(String(500), nullable=True)
    RegistrationCertificate = Column(String(500), nullable=True)

    doctor = relationship("Doctor", back_populates="document_detail")
