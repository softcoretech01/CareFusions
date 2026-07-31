import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.manufacturer import ManufacturerCreate, ManufacturerUpdate, ManufacturerResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/manufacturers", tags=["Manufacturer Master"])

SP_NAME = "SpMasterManufacturer"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":              opt,
        "p_ManufacturerId":   kwargs.get("manufacturer_id"),
        "p_ManufacturerName": kwargs.get("manufacturer_name"),
        "p_ContactDetails":   kwargs.get("contact_details"),
        "p_Address":          kwargs.get("address"),
        "p_Country":          kwargs.get("country"),
        "p_Status":           kwargs.get("status"),
        "p_CreatedBy":        kwargs.get("created_by"),
        "p_UpdatedBy":        kwargs.get("updated_by"),
        "p_Search":           kwargs.get("search"),
        "p_StatusFilter":     kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ManufacturerId, :p_ManufacturerName, :p_ContactDetails,
            :p_Address, :p_Country, :p_Status, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":               row.ManufacturerId,
        "manufacturerCode": row.ManufacturerCode,
        "manufacturerName": row.ManufacturerName,
        "contactDetails":   row.ContactDetails,
        "address":          row.Address,
        "country":          row.Country,
        "status":           row.Status,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "updatedBy":        row.UpdatedBy,
        "updatedDate":      row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_MANUFACTURER_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Manufacturer Name cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Manufacturer_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Manufacturer Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A manufacturer with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        manufacturer_name=payload.manufacturerName,
        contact_details=payload.contactDetails,
        address=payload.address,
        country=payload.country,
        status=payload.status.value,
    )


# ── GET /manufacturers/ ───────────────────────────────────────
@router.get("/", response_model=List[ManufacturerResponse])
def get_manufacturers(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all manufacturers with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /manufacturers] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch manufacturers")


# ── GET /manufacturers/next-code ──────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_manufacturer_code(db: Session = Depends(get_db)):
    """Preview the ManufacturerCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"manufacturerCode": row.ManufacturerCode if row else "MFG-001"}
    except Exception as e:
        logger.error(f"[GET /manufacturers/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next manufacturer code")


# ── GET /manufacturers/{id} ───────────────────────────────────
@router.get("/{manufacturer_id}", response_model=ManufacturerResponse)
def get_manufacturer_by_id(manufacturer_id: int, db: Session = Depends(get_db)):
    """Fetch a single manufacturer by ID."""
    try:
        row = _call_sp(db, "GETBYID", manufacturer_id=manufacturer_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Manufacturer with ID {manufacturer_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /manufacturers/{manufacturer_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch manufacturer")


# ── POST /manufacturers/ ──────────────────────────────────────
@router.post("/", response_model=ManufacturerResponse, status_code=status.HTTP_201_CREATED)
def create_manufacturer(payload: ManufacturerCreate, db: Session = Depends(get_db)):
    """Create a manufacturer. ManufacturerCode is auto-generated (MFG-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().ManufacturerId
        db.commit()

        created = _call_sp(db, "GETBYID", manufacturer_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /manufacturers] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create manufacturer")


# ── PUT /manufacturers/{id} ───────────────────────────────────
@router.put("/{manufacturer_id}", response_model=ManufacturerResponse)
def update_manufacturer(manufacturer_id: int, payload: ManufacturerUpdate, db: Session = Depends(get_db)):
    """Update an existing manufacturer. ManufacturerCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            manufacturer_id=manufacturer_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", manufacturer_id=manufacturer_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Manufacturer with ID {manufacturer_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /manufacturers/{manufacturer_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update manufacturer")


# ── PATCH /manufacturers/{id}/toggle-status ───────────────────
@router.patch("/{manufacturer_id}/toggle-status", response_model=ManufacturerResponse)
def toggle_manufacturer_status(manufacturer_id: int, db: Session = Depends(get_db)):
    """Toggle manufacturer status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", manufacturer_id=manufacturer_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", manufacturer_id=manufacturer_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Manufacturer with ID {manufacturer_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /manufacturers/{manufacturer_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle manufacturer status")


# ── DELETE /manufacturers/{id} ────────────────────────────────
@router.delete("/{manufacturer_id}", status_code=status.HTTP_200_OK)
def delete_manufacturer(manufacturer_id: int, db: Session = Depends(get_db)):
    """Soft delete a manufacturer (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", manufacturer_id=manufacturer_id, updated_by="Admin")
        db.commit()
        return {"message": f"Manufacturer {manufacturer_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /manufacturers/{manufacturer_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete manufacturer")
