"""Unified catalog API.

One endpoint over the two owning masters, so procurement can requisition a
medicine, a medical item or a non-medical item through the same screen while
each product keeps living in the master that owns it:

    MEDICINE      -> admin.Master_Medicine
    MEDICAL_ITEM  -> admin.Master_Item
    NON_MEDICAL   -> admin.Master_Item

A catalog row is identified by the PAIR (itemType, itemId) - never by itemId
alone, because MedicineId 3 and ItemId 3 are different products.

The union lives in the inventory.Vw_CatalogItem view rather than in this
module, so the stock procedures and this API cannot drift apart. Availability
and rates are read from inventory.Inventory_Stock, which is the single stock
source of truth.

Every filter is applied in SQL. The frontend narrowing its dropdowns is a
convenience; this is the enforcement.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalog", tags=["Catalog"])

ITEM_TYPES = ("MEDICINE", "MEDICAL_ITEM", "NON_MEDICAL")

# Availability is summed per (type, item) and narrowed to one store when asked.
# LEFT JOIN so a product with no stock yet still appears - a PR exists exactly
# to buy the things that are not on the shelf.
_BASE_SQL = """
    SELECT c.ItemType, c.ItemId, c.ItemCode, c.ItemName, c.Category, c.SubCategory,
           c.Uom, c.GstPercentage, c.ReorderLevel, c.MinStock, c.MaxStock,
           c.BatchRequired, c.ExpiryRequired, c.ControlledDrug,
           c.StandardRate, c.LastPurchaseRate, c.Barcode, c.Status,
           COALESCE(s.Qty, 0)  AS AvailableStock,
           COALESCE(s.Lots, 0) AS BatchCount,
           s.ValRate           AS ValuationRate
      FROM inventory.Vw_CatalogItem c
      LEFT JOIN (
            SELECT ItemType, ItemId,
                   SUM(Quantity) AS Qty,
                   COUNT(*)      AS Lots,
                   CASE WHEN SUM(Quantity) > 0
                        THEN SUM(Quantity * ValuationRate) / SUM(Quantity) END AS ValRate
              FROM inventory.Inventory_Stock
             WHERE (:store_id IS NULL OR StoreId = :store_id)
             GROUP BY ItemType, ItemId
      ) s ON s.ItemType = c.ItemType AND s.ItemId = c.ItemId
     WHERE c.IsDeleted = 0
       AND (:active_only = 0 OR c.Status = 'Active')
       AND (:item_type IS NULL OR c.ItemType = :item_type)
       AND (:category  IS NULL OR c.Category = :category)
       AND (:search    IS NULL
            OR c.ItemName LIKE :like
            OR c.ItemCode LIKE :like
            OR c.Category LIKE :like
            OR c.Barcode  LIKE :like)
     ORDER BY c.ItemName
     LIMIT :limit
"""


def _map(row) -> dict:
    """One shape for all three types, whichever master the row came from."""
    rate = row.LastPurchaseRate if row.LastPurchaseRate is not None else row.StandardRate
    return {
        # (itemType, itemId) is the key a PR/PO/GRN line stores.
        "itemType": row.ItemType,
        "itemId": row.ItemId,
        "itemCode": row.ItemCode,
        "itemName": row.ItemName,
        "category": row.Category or "",
        "subCategory": row.SubCategory or "",
        "uom": row.Uom or "",
        "gstPercentage": float(row.GstPercentage) if row.GstPercentage is not None else 0.0,
        "reorderLevel": row.ReorderLevel,
        "minStock": row.MinStock,
        "maxStock": row.MaxStock,
        "batchRequired": bool(row.BatchRequired),
        "expiryRequired": bool(row.ExpiryRequired),
        "controlledDrug": bool(row.ControlledDrug),
        # Real numbers only: availability is the live ledger balance and the
        # rate is the last price actually paid, falling back to the standard
        # rate. Never a placeholder.
        "availableStock": float(row.AvailableStock or 0),
        "batchCount": int(row.BatchCount or 0),
        "rate": float(rate) if rate is not None else 0.0,
        "valuationRate": float(row.ValuationRate) if row.ValuationRate is not None else None,
        "barcode": row.Barcode,
        "status": row.Status,
    }


@router.get("/")
def get_catalog(
    type: Optional[str] = Query(None, description="MEDICINE | MEDICAL_ITEM | NON_MEDICAL"),
    category: Optional[str] = None,
    store_id: Optional[int] = Query(None, alias="storeId",
                                    description="Availability from this store only"),
    search: Optional[str] = None,
    active_only: bool = Query(True, alias="activeOnly"),
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    """Catalog rows for one inventory type, optionally one category."""
    if type is not None and type not in ITEM_TYPES:
        raise HTTPException(status_code=400,
                            detail=f"type must be one of {', '.join(ITEM_TYPES)}")
    try:
        rows = db.execute(text(_BASE_SQL), {
            "item_type": type,
            "category": category or None,
            "store_id": store_id,
            "search": search or None,
            "like": f"%{search}%" if search else None,
            "active_only": 1 if active_only else 0,
            "limit": limit,
        }).fetchall()
        return [_map(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /catalog] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch catalog")


@router.get("/categories")
def get_catalog_categories(
    type: str = Query(..., description="MEDICINE | MEDICAL_ITEM | NON_MEDICAL"),
    db: Session = Depends(get_db),
):
    """Categories that actually have products of this type, for the
    Type -> Category -> Item cascade. Empty categories are excluded so a buyer
    is not offered a category with nothing behind it."""
    if type not in ITEM_TYPES:
        raise HTTPException(status_code=400,
                            detail=f"type must be one of {', '.join(ITEM_TYPES)}")
    try:
        rows = db.execute(text("""
            SELECT c.Category, COUNT(*) AS ItemCount
              FROM inventory.Vw_CatalogItem c
             WHERE c.IsDeleted = 0 AND c.Status = 'Active'
               AND c.ItemType = :t AND c.Category IS NOT NULL AND c.Category <> ''
             GROUP BY c.Category
             ORDER BY c.Category
        """), {"t": type}).fetchall()
        return [{"category": r.Category, "itemCount": int(r.ItemCount)} for r in rows]
    except Exception as e:
        logger.error(f"[GET /catalog/categories] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch catalog categories")


@router.get("/{item_type}/{item_id}")
def get_catalog_item(item_type: str, item_id: int,
                     store_id: Optional[int] = Query(None, alias="storeId"),
                     db: Session = Depends(get_db)):
    """A single catalog row. The type/id pair is validated against the owning
    master, so a medicine id can never be resolved as an item."""
    if item_type not in ITEM_TYPES:
        raise HTTPException(status_code=400,
                            detail=f"type must be one of {', '.join(ITEM_TYPES)}")
    try:
        rows = db.execute(text(_BASE_SQL.replace("ORDER BY c.ItemName", "AND c.ItemId = :item_id ORDER BY c.ItemName")), {
            "item_type": item_type, "category": None, "store_id": store_id,
            "search": None, "like": None, "active_only": 0, "limit": 1,
            "item_id": item_id,
        }).fetchall()
        if not rows:
            raise HTTPException(status_code=404,
                                detail=f"No {item_type} with id {item_id}")
        return _map(rows[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /catalog/{item_type}/{item_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch catalog item")
