import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.store import StoreCreate, StoreUpdate, StoreResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stores", tags=["Store/Warehouse Master"])

SP_NAME = "SpMasterStore"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":           opt,
        "p_StoreId":       kwargs.get("store_id"),
        "p_StoreName":     kwargs.get("store_name"),
        "p_StoreType":     kwargs.get("store_type"),
        "p_Location":      kwargs.get("location"),
        "p_InCharge":      kwargs.get("in_charge"),
        "p_ContactNumber": kwargs.get("contact_number"),
        "p_Status":        kwargs.get("status"),
        "p_CreatedBy":     kwargs.get("created_by"),
        "p_UpdatedBy":     kwargs.get("updated_by"),
        "p_Search":        kwargs.get("search"),
        "p_TypeFilter":    kwargs.get("type_filter"),
        "p_StatusFilter":  kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_StoreId, :p_StoreName, :p_StoreType, :p_Location, :p_InCharge,
            :p_ContactNumber, :p_Status, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_TypeFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":            row.StoreId,
        "storeCode":     row.StoreCode,
        "storeName":     row.StoreName,
        "storeType":     row.StoreType,
        "location":      row.Location,
        "inCharge":      row.InCharge,
        "contactNumber": row.ContactNumber,
        "status":        row.Status,
        "createdBy":     row.CreatedBy,
        "createdDate":   row.CreatedDate,
        "updatedBy":     row.UpdatedBy,
        "updatedDate":   row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_STORE_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Store Name cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Store_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Store Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A store with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        store_name=payload.storeName,
        store_type=payload.storeType.value,
        location=payload.location,
        in_charge=payload.inCharge,
        contact_number=payload.contactNumber,
        status=payload.status.value,
    )


# ── GET /stores/ ──────────────────────────────────────────────
@router.get("/", response_model=List[StoreResponse])
def get_stores(
    search: Optional[str] = None,
    store_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all stores with optional search and type/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, type_filter=store_type, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /stores] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch stores")


# ── GET /stores/next-code ─────────────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_store_code(db: Session = Depends(get_db)):
    """Preview the StoreCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"storeCode": row.StoreCode if row else "STR-001"}
    except Exception as e:
        logger.error(f"[GET /stores/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next store code")


# ── GET /stores/{id} ──────────────────────────────────────────
@router.get("/{store_id}", response_model=StoreResponse)
def get_store_by_id(store_id: int, db: Session = Depends(get_db)):
    """Fetch a single store by ID."""
    try:
        row = _call_sp(db, "GETBYID", store_id=store_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Store with ID {store_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /stores/{store_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch store")


# ── POST /stores/ ─────────────────────────────────────────────
@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(payload: StoreCreate, db: Session = Depends(get_db)):
    """Create a store. StoreCode is auto-generated (STR-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().StoreId
        db.commit()

        created = _call_sp(db, "GETBYID", store_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /stores] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create store")


# ── PUT /stores/{id} ──────────────────────────────────────────
@router.put("/{store_id}", response_model=StoreResponse)
def update_store(store_id: int, payload: StoreUpdate, db: Session = Depends(get_db)):
    """Update an existing store. StoreCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            store_id=store_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", store_id=store_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Store with ID {store_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /stores/{store_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update store")


# ── PATCH /stores/{id}/toggle-status ──────────────────────────
@router.patch("/{store_id}/toggle-status", response_model=StoreResponse)
def toggle_store_status(store_id: int, db: Session = Depends(get_db)):
    """Toggle store status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", store_id=store_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", store_id=store_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Store with ID {store_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /stores/{store_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle store status")


# ── DELETE /stores/{id} ───────────────────────────────────────
@router.delete("/{store_id}", status_code=status.HTTP_200_OK)
def delete_store(store_id: int, db: Session = Depends(get_db)):
    """Soft delete a store (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", store_id=store_id, updated_by="Admin")
        db.commit()
        return {"message": f"Store {store_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /stores/{store_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete store")
