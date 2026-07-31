import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.tpa import TpaCreate, TpaUpdate, TpaResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tpas", tags=["TPA Master"])

SP_NAME = "SpMasterTpa"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_TpaId":               kwargs.get("tpa_id"),
        "p_TpaName":             kwargs.get("tpa_name"),
        "p_InsuranceProvider":   kwargs.get("insurance_provider"),
        "p_RegistrationNumber":  kwargs.get("registration_number"),
        "p_Description":         kwargs.get("description"),
        "p_ContactPerson":       kwargs.get("contact_person"),
        "p_PhoneNumber":         kwargs.get("phone_number"),
        "p_AlternatePhone":      kwargs.get("alternate_phone"),
        "p_Email":               kwargs.get("email"),
        "p_Website":             kwargs.get("website"),
        "p_AddressLine1":        kwargs.get("address_line1"),
        "p_AddressLine2":        kwargs.get("address_line2"),
        "p_Country":             kwargs.get("country"),
        "p_State":               kwargs.get("state"),
        "p_City":                kwargs.get("city"),
        "p_PostalCode":          kwargs.get("postal_code"),
        "p_ClaimProcessingTime": kwargs.get("claim_processing_time"),
        "p_CashlessApproval":    kwargs.get("cashless_approval"),
        "p_OnlineClaimPortal":   kwargs.get("online_claim_portal"),
        "p_Status":              kwargs.get("status"),
        "p_Remarks":             kwargs.get("remarks"),
        "p_CreatedBy":           kwargs.get("created_by"),
        "p_UpdatedBy":           kwargs.get("updated_by"),
        "p_Search":              kwargs.get("search"),
        "p_ProviderFilter":      kwargs.get("provider_filter"),
        "p_StatusFilter":        kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_TpaId, :p_TpaName, :p_InsuranceProvider, :p_RegistrationNumber,
            :p_Description, :p_ContactPerson, :p_PhoneNumber, :p_AlternatePhone,
            :p_Email, :p_Website, :p_AddressLine1, :p_AddressLine2, :p_Country,
            :p_State, :p_City, :p_PostalCode, :p_ClaimProcessingTime, :p_CashlessApproval,
            :p_OnlineClaimPortal, :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_ProviderFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                  row.TpaId,
        "tpaCode":             row.TpaCode,
        "tpaName":             row.TpaName,
        "insuranceProvider":   row.InsuranceProvider,
        "registrationNumber":  row.RegistrationNumber,
        "description":         row.Description,
        "contactPerson":       row.ContactPerson,
        "phoneNumber":         row.PhoneNumber,
        "alternatePhone":      row.AlternatePhone,
        "email":               row.Email,
        "website":             row.Website,
        "addressLine1":        row.AddressLine1,
        "addressLine2":        row.AddressLine2,
        "country":             row.Country,
        "state":               row.State,
        "city":                row.City,
        "postalCode":          row.PostalCode,
        "claimProcessingTime": row.ClaimProcessingTime,
        "cashlessApproval":    bool(row.CashlessApproval),
        "onlineClaimPortal":   row.OnlineClaimPortal,
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "updatedBy":           row.UpdatedBy,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_TPA_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="TPA Name cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Tpa_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="TPA Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A TPA with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        tpa_name=payload.tpaName,
        insurance_provider=payload.insuranceProvider,
        registration_number=payload.registrationNumber,
        description=payload.description,
        contact_person=payload.contactPerson,
        phone_number=payload.phoneNumber,
        alternate_phone=payload.alternatePhone,
        email=payload.email,
        website=payload.website,
        address_line1=payload.addressLine1,
        address_line2=payload.addressLine2,
        country=payload.country,
        state=payload.state,
        city=payload.city,
        postal_code=payload.postalCode,
        claim_processing_time=payload.claimProcessingTime,
        cashless_approval=int(payload.cashlessApproval),
        online_claim_portal=payload.onlineClaimPortal,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /tpas/ ────────────────────────────────────────────────
@router.get("/", response_model=List[TpaResponse])
def get_tpas(
    search: Optional[str] = None,
    provider: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all TPAs with optional search and provider/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, provider_filter=provider, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /tpas] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch TPAs")


# ── GET /tpas/next-code ───────────────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_tpa_code(db: Session = Depends(get_db)):
    """Preview the TpaCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"tpaCode": row.TpaCode if row else "TPA-001"}
    except Exception as e:
        logger.error(f"[GET /tpas/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next TPA code")


# ── GET /tpas/{id} ────────────────────────────────────────────
@router.get("/{tpa_id}", response_model=TpaResponse)
def get_tpa_by_id(tpa_id: int, db: Session = Depends(get_db)):
    """Fetch a single TPA by ID."""
    try:
        row = _call_sp(db, "GETBYID", tpa_id=tpa_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"TPA with ID {tpa_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /tpas/{tpa_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch TPA")


# ── POST /tpas/ ───────────────────────────────────────────────
@router.post("/", response_model=TpaResponse, status_code=status.HTTP_201_CREATED)
def create_tpa(payload: TpaCreate, db: Session = Depends(get_db)):
    """Create a TPA. TpaCode is auto-generated (TPA-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().TpaId
        db.commit()

        created = _call_sp(db, "GETBYID", tpa_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /tpas] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create TPA")


# ── PUT /tpas/{id} ────────────────────────────────────────────
@router.put("/{tpa_id}", response_model=TpaResponse)
def update_tpa(tpa_id: int, payload: TpaUpdate, db: Session = Depends(get_db)):
    """Update an existing TPA. TpaCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            tpa_id=tpa_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", tpa_id=tpa_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"TPA with ID {tpa_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /tpas/{tpa_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update TPA")


# ── PATCH /tpas/{id}/toggle-status ────────────────────────────
@router.patch("/{tpa_id}/toggle-status", response_model=TpaResponse)
def toggle_tpa_status(tpa_id: int, db: Session = Depends(get_db)):
    """Toggle TPA status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", tpa_id=tpa_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", tpa_id=tpa_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"TPA with ID {tpa_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /tpas/{tpa_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle TPA status")


# ── DELETE /tpas/{id} ─────────────────────────────────────────
@router.delete("/{tpa_id}", status_code=status.HTTP_200_OK)
def delete_tpa(tpa_id: int, db: Session = Depends(get_db)):
    """Soft delete a TPA (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", tpa_id=tpa_id, updated_by="Admin")
        db.commit()
        return {"message": f"TPA {tpa_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /tpas/{tpa_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete TPA")
