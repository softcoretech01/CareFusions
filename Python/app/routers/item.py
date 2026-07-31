import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/items", tags=["Item Master"])

SP_NAME = "SpMasterItem"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":             opt,
        "p_ItemId":          kwargs.get("item_id"),
        "p_ItemName":        kwargs.get("item_name"),
        "p_Category":        kwargs.get("category"),
        "p_SubCategory":     kwargs.get("sub_category"),
        "p_Department":      kwargs.get("department"),
        "p_Brand":           kwargs.get("brand"),
        "p_Manufacturer":    kwargs.get("manufacturer"),
        "p_Vendor":          kwargs.get("vendor"),
        "p_Uom":             kwargs.get("uom"),
        "p_HsnCode":         kwargs.get("hsn_code"),
        "p_GstPercentage":   kwargs.get("gst_percentage"),
        "p_ReorderLevel":    kwargs.get("reorder_level"),
        "p_MinStock":        kwargs.get("min_stock"),
        "p_MaxStock":        kwargs.get("max_stock"),
        "p_ShelfLife":       kwargs.get("shelf_life"),
        "p_BatchRequired":   kwargs.get("batch_required"),
        "p_ExpiryRequired":  kwargs.get("expiry_required"),
        "p_Barcode":         kwargs.get("barcode"),
        "p_ItemDescription": kwargs.get("item_description"),
        "p_Status":          kwargs.get("status"),
        "p_CreatedBy":       kwargs.get("created_by"),
        "p_UpdatedBy":       kwargs.get("updated_by"),
        "p_Search":          kwargs.get("search"),
        "p_CategoryFilter":  kwargs.get("category_filter"),
        "p_StatusFilter":    kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ItemId, :p_ItemName, :p_Category, :p_SubCategory, :p_Department,
            :p_Brand, :p_Manufacturer, :p_Vendor, :p_Uom, :p_HsnCode, :p_GstPercentage,
            :p_ReorderLevel, :p_MinStock, :p_MaxStock, :p_ShelfLife, :p_BatchRequired,
            :p_ExpiryRequired, :p_Barcode, :p_ItemDescription, :p_Status,
            :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_CategoryFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":              row.ItemId,
        "itemCode":        row.ItemCode,
        "itemName":        row.ItemName,
        "category":        row.Category,
        "subCategory":     row.SubCategory,
        "department":      row.Department,
        "brand":           row.Brand,
        "manufacturer":    row.Manufacturer,
        "vendor":          row.Vendor,
        "uom":             row.Uom,
        "hsnCode":         row.HsnCode,
        "gstPercentage":   row.GstPercentage,
        "reorderLevel":    row.ReorderLevel,
        "minStock":        row.MinStock,
        "maxStock":        row.MaxStock,
        "shelfLife":       row.ShelfLife,
        "batchRequired":   bool(row.BatchRequired),
        "expiryRequired":  bool(row.ExpiryRequired),
        "barcode":         row.Barcode,
        "itemDescription": row.ItemDescription,
        "status":          row.Status,
        "createdBy":       row.CreatedBy,
        "createdDate":     row.CreatedDate,
        "updatedBy":       row.UpdatedBy,
        "updatedDate":     row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_ITEM_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Item Name must be unique")
    if "DUPLICATE_BARCODE" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Barcode is already assigned to another item")
    if "1062" in msg or "Duplicate entry" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An item with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        item_name=payload.itemName,
        category=payload.category,
        sub_category=payload.subCategory,
        department=payload.department,
        brand=payload.brand,
        manufacturer=payload.manufacturer,
        vendor=payload.vendor,
        uom=payload.uom,
        hsn_code=payload.hsnCode,
        gst_percentage=payload.gstPercentage,
        reorder_level=payload.reorderLevel,
        min_stock=payload.minStock,
        max_stock=payload.maxStock,
        shelf_life=payload.shelfLife,
        batch_required=int(payload.batchRequired),
        expiry_required=int(payload.expiryRequired),
        barcode=payload.barcode,
        item_description=payload.itemDescription,
        status=payload.status.value,
    )


# ── GET /items/ ───────────────────────────────────────────────
@router.get("/", response_model=List[ItemResponse])
def get_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all items with optional search and category/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, category_filter=category, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /items] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch items")


# ── GET /items/next-code ──────────────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_item_code(db: Session = Depends(get_db)):
    """Preview the ItemCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"itemCode": row.ItemCode if row else "ITM-001"}
    except Exception as e:
        logger.error(f"[GET /items/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next item code")


# ── GET /items/{id} ───────────────────────────────────────────
@router.get("/{item_id}", response_model=ItemResponse)
def get_item_by_id(item_id: int, db: Session = Depends(get_db)):
    """Fetch a single item by ID."""
    try:
        row = _call_sp(db, "GETBYID", item_id=item_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Item with ID {item_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /items/{item_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch item")


# ── POST /items/ ──────────────────────────────────────────────
@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    """Create an item. ItemCode is auto-generated (ITM-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().ItemId
        db.commit()

        created = _call_sp(db, "GETBYID", item_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /items] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create item")


# ── PUT /items/{id} ───────────────────────────────────────────
@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db)):
    """Update an existing item. ItemCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            item_id=item_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", item_id=item_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Item with ID {item_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /items/{item_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update item")


# ── PATCH /items/{id}/toggle-status ───────────────────────────
@router.patch("/{item_id}/toggle-status", response_model=ItemResponse)
def toggle_item_status(item_id: int, db: Session = Depends(get_db)):
    """Toggle item status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", item_id=item_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", item_id=item_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Item with ID {item_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /items/{item_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle item status")


# ── DELETE /items/{id} ────────────────────────────────────────
@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """Soft delete an item (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", item_id=item_id, updated_by="Admin")
        db.commit()
        return {"message": f"Item {item_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /items/{item_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete item")
