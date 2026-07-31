from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PatientCategoryCreate(BaseModel):
    categoryCode:        str
    categoryName:        str
    description:         Optional[str] = None
    billingType:         str
    defaultDiscount:     Optional[float] = 0.0
    creditLimit:         Optional[float] = 0.0
    approvalRequired:    Optional[bool] = False
    insuranceApplicable: Optional[bool] = False
    corporateApplicable: Optional[bool] = False

    status:              str = 'Active'
    remarks:             Optional[str] = None
    createdBy:           Optional[str] = "System"


class PatientCategoryUpdate(PatientCategoryCreate):
    modifiedBy:          Optional[str] = "System"


class PatientCategoryResponse(BaseModel):
    id:                  int
    categoryCode:        str
    categoryName:        str
    description:         Optional[str] = None
    billingType:         str
    defaultDiscount:     Optional[str] = '0'  # Returning as string for frontend compatibility
    creditLimit:         Optional[str] = '0'
    approvalRequired:    bool
    insuranceApplicable: bool
    corporateApplicable: bool

    status:              str
    remarks:             Optional[str] = None

    createdBy:           Optional[str] = None
    createdDate:         Optional[datetime] = None
    modifiedBy:          Optional[str] = None
    modifiedDate:        Optional[datetime] = None
