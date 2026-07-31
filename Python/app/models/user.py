from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, SmallInteger
from sqlalchemy.sql import func
from app.database import Base


class MasterUser(Base):
    __tablename__ = "Master_User"

    UserId              = Column(Integer,      primary_key=True, index=True, autoincrement=True)
    UserCode            = Column(String(20),   unique=True, nullable=False)   # Auto: USR-001
    Employee            = Column(String(150),  nullable=False)
    # Username/Email uniqueness is enforced in the SP for non-deleted rows only.
    Username            = Column(String(100),  index=True, nullable=False)
    PasswordHash        = Column(String(255),  nullable=False)   # Salted PBKDF2 — never returned
    Role                = Column(String(100),  index=True, nullable=False)
    Department          = Column(String(100),  nullable=True)
    Hospital            = Column(String(150),  nullable=True)
    Branch              = Column(String(150),  nullable=True)
    Email               = Column(String(150),  index=True, nullable=False)
    MobileNumber        = Column(String(20),   nullable=True)
    ForcePasswordChange = Column(SmallInteger, nullable=False, default=1)
    PasswordExpiry      = Column(Integer,      nullable=False, default=90)
    TwoFactorAuth       = Column(SmallInteger, nullable=False, default=0)
    LoginAllowedFrom    = Column(String(5),    nullable=False, default="00:00")
    LoginAllowedTo      = Column(String(5),    nullable=False, default="23:59")
    Status              = Column(Enum("Active", "Inactive"), nullable=False, default="Active")
    Remarks             = Column(Text,         nullable=True)

    # ── Audit ────────────────────────────────────────────────
    CreatedBy           = Column(String(100),  nullable=True)
    CreatedDate         = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedBy           = Column(String(100),  nullable=True)
    UpdatedDate         = Column(DateTime, onupdate=func.now(), nullable=True)
    IsDeleted           = Column(SmallInteger, nullable=False, default=0)
