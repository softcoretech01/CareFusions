from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class VendorCatalogItemCreate(BaseModel):
    itemId: int
    itemCode: Optional[str] = Field(None, max_length=100)
    itemName: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    contractValidUntil: Optional[str] = None
    catalogPrice: Optional[float] = 0.0
    lastUpdate: Optional[str] = None

class VendorCatalogCreate(BaseModel):
    vendorId: int
    vendorName: Optional[str] = Field(None, max_length=255)
    vendorCode: Optional[str] = Field(None, max_length=100)
    gstNumber: Optional[str] = Field(None, max_length=100)
    contactPerson: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    rating: Optional[float] = 0.0
    activeContracts: Optional[int] = 0
    items: List[VendorCatalogItemCreate] = []

class VendorCatalogUpdate(VendorCatalogCreate):
    pass

class VendorCatalogResponse(VendorCatalogCreate):
    id: int
    createdBy: Optional[str] = None
    createdDate: Optional[datetime] = None
    modifiedBy: Optional[str] = None
    modifiedDate: Optional[datetime] = None
    isActive: Optional[bool] = True
    
    class Config:
        from_attributes = True
