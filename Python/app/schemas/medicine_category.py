from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MedicineCategoryCreate(BaseModel):
    categoryCode:   str
    categoryName:   str
    description:    Optional[str] = None
    status:         str = 'Active'
    remarks:        Optional[str] = None
    createdBy:      Optional[str] = "System"


class MedicineCategoryUpdate(MedicineCategoryCreate):
    modifiedBy:     Optional[str] = "System"


class MedicineCategoryResponse(BaseModel):
    id:             int
    categoryCode:   Optional[str] = None
    categoryName:   str
    description:    Optional[str] = None
    status:         Optional[str] = None
    remarks:        Optional[str] = None

    createdBy:      Optional[str] = None
    createdDate:    Optional[datetime] = None
    modifiedBy:     Optional[str] = None
    modifiedDate:   Optional[datetime] = None
