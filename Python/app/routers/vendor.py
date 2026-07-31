import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vendors", tags=["Vendor Master"])

SP_NAME = "SpMasterVendor"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":               opt,
        "p_VendorId":          kwargs.get("vendor_id"),
        "p_VendorName":        kwargs.get("vendor_name"),
        "p_ContactPerson":     kwargs.get("contact_person"),
        "p_MobileNumber":      kwargs.get("mobile_number"),
        "p_Email":             kwargs.get("email"),
        "p_GstNumber":         kwargs.get("gst_number"),
        "p_PanNumber":         kwargs.get("pan_number"),
        "p_DrugLicenseNumber": kwargs.get("drug_license_number"),
        "p_Address":           kwargs.get("address"),
        "p_City":              kwargs.get("city"),
        "p_State":             kwargs.get("state"),
        "p_Country":           kwargs.get("country"),
        "p_PinCode":           kwargs.get("pin_code"),
        "p_PaymentTerms":      kwargs.get("payment_terms"),
        "p_CreditDays":        kwargs.get("credit_days"),
        "p_Status":            kwargs.get("status"),
        "p_CreatedBy":         kwargs.get("created_by"),
        "p_UpdatedBy":         kwargs.get("updated_by"),
        "p_Search":            kwargs.get("search"),
        "p_StatusFilter":      kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_VendorId, :p_VendorName, :p_ContactPerson, :p_MobileNumber,
            :p_Email, :p_GstNumber, :p_PanNumber, :p_DrugLicenseNumber, :p_Address,
            :p_City, :p_State, :p_Country, :p_PinCode, :p_PaymentTerms, :p_CreditDays,
            :p_Status, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                row.VendorId,
        "vendorCode":        row.VendorCode,
        "vendorName":        row.VendorName,
        "contactPerson":     row.ContactPerson,
        "mobileNumber":      row.MobileNumber,
        "email":             row.Email,
        "gstNumber":         row.GstNumber,
        "panNumber":         row.PanNumber,
        "drugLicenseNumber": row.DrugLicenseNumber,
        "address":           row.Address,
        "city":              row.City,
        "state":             row.State,
        "country":           row.Country,
        "pinCode":           row.PinCode,
        "paymentTerms":      row.PaymentTerms,
        "creditDays":        row.CreditDays,
        "status":            row.Status,
        "createdBy":         row.CreatedBy,
        "createdDate":       row.CreatedDate,
        "updatedBy":         row.UpdatedBy,
        "updatedDate":       row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_VENDOR_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Vendor Name cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Vendor_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Vendor Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A vendor with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        vendor_name=payload.vendorName,
        contact_person=payload.contactPerson,
        mobile_number=payload.mobileNumber,
        email=payload.email,
        gst_number=payload.gstNumber,
        pan_number=payload.panNumber,
        drug_license_number=payload.drugLicenseNumber,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        pin_code=payload.pinCode,
        payment_terms=payload.paymentTerms,
        credit_days=payload.creditDays,
        status=payload.status.value,
    )


# ── GET /vendors/ ─────────────────────────────────────────────
@router.get("/", response_model=List[VendorResponse])
def get_vendors(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all vendors with optional search and status filter."""
    try:
        result = _call_sp(db, "GET", search=search, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /vendors] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch vendors")


# ── GET /vendors/next-code ────────────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_vendor_code(db: Session = Depends(get_db)):
    """Preview the VendorCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"vendorCode": row.VendorCode if row else "VEN-001"}
    except Exception as e:
        logger.error(f"[GET /vendors/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next vendor code")


# ── GET /vendors/{id} ─────────────────────────────────────────
@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor_by_id(vendor_id: int, db: Session = Depends(get_db)):
    """Fetch a single vendor by ID."""
    try:
        row = _call_sp(db, "GETBYID", vendor_id=vendor_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Vendor with ID {vendor_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /vendors/{vendor_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch vendor")


# ── POST /vendors/ ────────────────────────────────────────────
@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    """Create a vendor. VendorCode is auto-generated (VEN-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().VendorId
        db.commit()

        created = _call_sp(db, "GETBYID", vendor_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /vendors] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create vendor")


# ── PUT /vendors/{id} ─────────────────────────────────────────
@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(vendor_id: int, payload: VendorUpdate, db: Session = Depends(get_db)):
    """Update an existing vendor. VendorCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            vendor_id=vendor_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", vendor_id=vendor_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Vendor with ID {vendor_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /vendors/{vendor_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update vendor")


# ── PATCH /vendors/{id}/toggle-status ─────────────────────────
@router.patch("/{vendor_id}/toggle-status", response_model=VendorResponse)
def toggle_vendor_status(vendor_id: int, db: Session = Depends(get_db)):
    """Toggle vendor status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", vendor_id=vendor_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", vendor_id=vendor_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Vendor with ID {vendor_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /vendors/{vendor_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle vendor status")


# ── DELETE /vendors/{id} ──────────────────────────────────────
@router.delete("/{vendor_id}", status_code=status.HTTP_200_OK)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    """Soft delete a vendor (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", vendor_id=vendor_id, updated_by="Admin")
        db.commit()
        return {"message": f"Vendor {vendor_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /vendors/{vendor_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete vendor")
