from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import date

INVENTORY_TYPES = {"MEDICINE", "MEDICAL_ITEM", "NON_MEDICAL"}

class PRItemBase(BaseModel):
    id: Optional[str] = None # Frontend dummy id
    itemId: int
    # Which master owns itemId. Optional on input: when omitted the line
    # inherits the requisition's header type, which is the normal case since a
    # PR is single-type.
    itemType: Optional[str] = None
    itemCode: Optional[str] = None
    itemName: Optional[str] = None
    category: Optional[str] = None
    subCategory: Optional[str] = None
    availableStock: Optional[int] = 0
    requestedQty: int = Field(..., gt=0)
    uom: Optional[str] = None
    estimatedPrice: Optional[float] = 0.0
    estimatedAmount: Optional[float] = 0.0
    store: str = Field(..., max_length=100)
    remarks: Optional[str] = None

class PurchaseRequisitionBase(BaseModel):
    prNo: str = Field(..., max_length=50)
    requisitionDate: date
    department: str = Field(..., max_length=100)
    # A requisition covers exactly ONE inventory type; the category varies per
    # line within it. Optional for backward compatibility with PRs raised
    # before the unified catalog.
    inventoryType: Optional[str] = Field(None, max_length=20)
    requestedBy: str = Field(..., max_length=100)
    priority: Optional[str] = Field("Normal", max_length=20)
    requiredDate: date
    purpose: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = Field(None, max_length=500)
    totalItems: Optional[int] = 0
    estimatedCost: Optional[float] = 0.0
    approvalStatus: Optional[str] = Field("Draft", max_length=50)
    currentStage: Optional[str] = Field("Draft", max_length=50)
    createdBy: Optional[str] = Field("Admin", max_length=100)

class _TypeConsistency(BaseModel):
    """Shared rule: every line must belong to the requisition's own type.

    Enforced here as well as in the UI because the API must never accept a
    mixed-type requisition, whatever the client does.
    """

    @model_validator(mode="after")
    def one_type_per_pr(self):
        header = getattr(self, "inventoryType", None)
        if header and header not in INVENTORY_TYPES:
            raise ValueError(
                f"inventoryType must be one of: {', '.join(sorted(INVENTORY_TYPES))}")
        for line in getattr(self, "items", []) or []:
            if line.itemType is None:
                line.itemType = header
            elif line.itemType not in INVENTORY_TYPES:
                raise ValueError(
                    f"itemType must be one of: {', '.join(sorted(INVENTORY_TYPES))}")
            elif header and line.itemType != header:
                raise ValueError(
                    f"'{line.itemName or line.itemId}' is a {line.itemType} but this "
                    f"requisition is for {header}. A requisition may contain many "
                    f"categories, but only one inventory type.")
        return self


class PurchaseRequisitionCreate(PurchaseRequisitionBase, _TypeConsistency):
    items: List[PRItemBase] = Field(..., min_items=1)

class PurchaseRequisitionUpdate(PurchaseRequisitionBase, _TypeConsistency):
    id: int
    items: List[PRItemBase] = Field(..., min_items=1)

class PRItemResponse(PRItemBase):
    PrItemId: int
    PrId: int

class PurchaseRequisitionResponse(PurchaseRequisitionBase):
    id: int
    items: List[PRItemBase] = []
