from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MedicineCreate(BaseModel):
    medicineCode:   str
    genericName:    str
    category:       str
    # Second level of the same tree items use, from Master_SubCategory.
    subCategory:    Optional[str] = None
    strength:       str
    dosageForm:     str
    unit:           str

    batchTracking:  bool = True
    expiryRequired: bool = True
    controlledDrug: bool = False
    reorderLevel:   str = '10'
    barcode:        Optional[str] = None

    purchasePrice:  str
    sellingPrice:   str
    gst:            str

    status:         str = 'Active'
    remarks:        Optional[str] = None
    createdBy:      Optional[str] = "System"


class MedicineUpdate(MedicineCreate):
    modifiedBy:     Optional[str] = "System"


class MedicineResponse(BaseModel):
    id:             int
    medicineCode:   str
    genericName:    str
    category:       str
    subCategory:    Optional[str] = None
    strength:       str
    dosageForm:     str
    unit:           str

    batchTracking:  bool
    expiryRequired: bool
    controlledDrug: bool
    reorderLevel:   str
    barcode:        Optional[str] = None

    purchasePrice:  str
    sellingPrice:   str
    gst:            str

    status:         str
    remarks:        Optional[str] = None

    createdBy:      Optional[str] = None
    createdDate:    Optional[datetime] = None
    modifiedBy:     Optional[str] = None
    modifiedDate:   Optional[datetime] = None


class MedicineCategoryResponse(BaseModel):
    id:             int
    categoryName:   str
