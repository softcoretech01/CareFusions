import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/categories", tags=["Category Master"])

SP_NAME = "SpMasterCategory"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":          opt,
        "p_CategoryId":   kwargs.get("category_id"),
        "p_CategoryName":   kwargs.get("category_name"),
        "p_InventoryType":  kwargs.get("inventory_type"),
        "p_Description":    kwargs.get("description"),
        "p_StockRequired":  kwargs.get("stock_required"),
        "p_BatchTracking":  kwargs.get("batch_tracking"),
        "p_ExpiryTracking": kwargs.get("expiry_tracking"),
        "p_BarcodeRequired":kwargs.get("barcode_required"),
        "p_Remarks":        kwargs.get("remarks"),
        "p_Status":       kwargs.get("status"),
        "p_CreatedBy":    kwargs.get("created_by"),
        "p_UpdatedBy":    kwargs.get("updated_by"),
        "p_Search":       kwargs.get("search"),
        "p_StatusFilter": kwargs.get("status_filter"),
        # Added to the SP after this router was written.
        "p_InventoryTypeFilter": kwargs.get("inventory_type_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_CategoryId, :p_CategoryName, :p_InventoryType, :p_Description,
            :p_StockRequired, :p_BatchTracking, :p_ExpiryTracking, :p_BarcodeRequired,
            :p_Remarks, :p_Status, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter,
            :p_InventoryTypeFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":           row.CategoryId,
        "categoryCode": row.CategoryCode,
        "categoryName":    row.CategoryName,
        "inventoryType":   row.InventoryType,
        "description":     row.Description,
        "stockRequired":   bool(row.StockRequired),
        "batchTracking":   bool(row.BatchTracking),
        "expiryTracking":  bool(row.ExpiryTracking),
        "barcodeRequired": bool(row.BarcodeRequired),
        "remarks":         row.Remarks,
        "status":       row.Status,
        "createdBy":    row.CreatedBy,
        "createdDate":  row.CreatedDate,
        "updatedBy":    row.UpdatedBy,
        "updatedDate":  row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_CATEGORY_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Category Name cannot be duplicated")
    if "EXPIRY_NEEDS_BATCH" in msg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Expiry tracking requires batch tracking — "
                                   "an expiry date has no batch to attach to otherwise")
    if "TRACKING_NEEDS_STOCK" in msg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Batch and expiry tracking only apply to categories "
                                   "that are stocked")
    if "INVALID_INVENTORY_TYPE" in msg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Inventory Type is required and must be one of "
                                   "MEDICINE, MEDICAL_ITEM or NON_MEDICAL")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Category_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Category Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A category with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        category_name=payload.categoryName,
        inventory_type=payload.inventoryType,
        description=payload.description,
        stock_required=1 if payload.stockRequired else 0,
        batch_tracking=1 if payload.batchTracking else 0,
        expiry_tracking=1 if payload.expiryTracking else 0,
        barcode_required=1 if payload.barcodeRequired else 0,
        remarks=payload.remarks,
        status=payload.status.value,
    )


# ── GET /categories/ ──────────────────────────────────────────
@router.get("/", response_model=List[CategoryResponse])
def get_categories(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    inventory_type: Optional[str] = Query(None, alias="inventoryType"),
    db: Session = Depends(get_db)
):
    """Fetch categories, optionally narrowed to one inventory type.

    The type filter is applied inside the stored procedure, not here, so a
    caller cannot widen it by editing the request (spec: the backend enforces
    the Type -> Category rule, never the frontend alone).
    """
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter,
                          inventory_type_filter=inventory_type)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /categories] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch categories")


# ── GET /categories/next-code ─────────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_category_code(db: Session = Depends(get_db)):
    """Preview the CategoryCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"categoryCode": row.CategoryCode if row else "CAT-001"}
    except Exception as e:
        logger.error(f"[GET /categories/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next category code")


# ── GET /categories/{id} ──────────────────────────────────────
@router.get("/{category_id}", response_model=CategoryResponse)
def get_category_by_id(category_id: int, db: Session = Depends(get_db)):
    """Fetch a single category by ID."""
    try:
        row = _call_sp(db, "GETBYID", category_id=category_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Category with ID {category_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /categories/{category_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch category")


# ── POST /categories/ ─────────────────────────────────────────
@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    """Create a category. CategoryCode is auto-generated (CAT-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().CategoryId
        db.commit()

        created = _call_sp(db, "GETBYID", category_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /categories] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create category")


# ── PUT /categories/{id} ──────────────────────────────────────
@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    """Update an existing category. CategoryCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            category_id=category_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", category_id=category_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Category with ID {category_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /categories/{category_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update category")


# ── PATCH /categories/{id}/toggle-status ──────────────────────
@router.patch("/{category_id}/toggle-status", response_model=CategoryResponse)
def toggle_category_status(category_id: int, db: Session = Depends(get_db)):
    """Toggle category status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", category_id=category_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", category_id=category_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Category with ID {category_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /categories/{category_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle category status")


# ── DELETE /categories/{id} ───────────────────────────────────
@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Soft delete a category (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", category_id=category_id, updated_by="Admin")
        db.commit()
        return {"message": f"Category {category_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /categories/{category_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete category")
