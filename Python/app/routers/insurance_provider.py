import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.insurance_provider import (
    InsuranceProviderCreate,
    InsuranceProviderUpdate,
    InsuranceProviderResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/insurance-providers", tags=["Insurance Provider Master"])

SP_NAME = "SpMasterInsuranceProvider"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_InsuranceProviderId": kwargs.get("insurance_provider_id"),
        "p_ProviderName":        kwargs.get("provider_name"),
        "p_InsuranceType":       kwargs.get("insurance_type"),
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
        "p_ClaimPortalUrl":      kwargs.get("claim_portal_url"),
        "p_CashlessFacility":    kwargs.get("cashless_facility"),
        "p_PreAuthRequired":     kwargs.get("pre_auth_required"),
        "p_ClaimSettlementDays": kwargs.get("claim_settlement_days"),
        "p_Status":              kwargs.get("status"),
        "p_Remarks":             kwargs.get("remarks"),
        "p_CreatedBy":           kwargs.get("created_by"),
        "p_UpdatedBy":           kwargs.get("updated_by"),
        "p_Search":              kwargs.get("search"),
        "p_TypeFilter":          kwargs.get("type_filter"),
        "p_StatusFilter":        kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_InsuranceProviderId, :p_ProviderName, :p_InsuranceType,
            :p_RegistrationNumber, :p_Description, :p_ContactPerson, :p_PhoneNumber,
            :p_AlternatePhone, :p_Email, :p_Website, :p_AddressLine1, :p_AddressLine2,
            :p_Country, :p_State, :p_City, :p_PostalCode, :p_ClaimPortalUrl,
            :p_CashlessFacility, :p_PreAuthRequired, :p_ClaimSettlementDays,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_TypeFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":                  row.InsuranceProviderId,
        "providerCode":        row.ProviderCode,
        "providerName":        row.ProviderName,
        "insuranceType":       row.InsuranceType,
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
        "claimPortalUrl":      row.ClaimPortalUrl,
        "cashlessFacility":    bool(row.CashlessFacility),
        "preAuthRequired":     bool(row.PreAuthRequired),
        "claimSettlementDays": row.ClaimSettlementDays,
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "updatedBy":           row.UpdatedBy,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_PROVIDER_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Provider Name cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_InsuranceProvider_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Provider Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An insurance provider with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        provider_name=payload.providerName,
        insurance_type=payload.insuranceType.value,
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
        claim_portal_url=payload.claimPortalUrl,
        cashless_facility=int(payload.cashlessFacility),
        pre_auth_required=int(payload.preAuthRequired),
        claim_settlement_days=payload.claimSettlementDays,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /insurance-providers/ ─────────────────────────────────
@router.get("/", response_model=List[InsuranceProviderResponse])
def get_insurance_providers(
    search: Optional[str] = None,
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all insurance providers with optional search and type/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, type_filter=type_filter, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /insurance-providers] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch insurance providers")


# ── GET /insurance-providers/next-code ────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_provider_code(db: Session = Depends(get_db)):
    """Preview the ProviderCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"providerCode": row.ProviderCode if row else "INS-001"}
    except Exception as e:
        logger.error(f"[GET /insurance-providers/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next provider code")


# ── GET /insurance-providers/{id} ─────────────────────────────
@router.get("/{insurance_provider_id}", response_model=InsuranceProviderResponse)
def get_insurance_provider_by_id(insurance_provider_id: int, db: Session = Depends(get_db)):
    """Fetch a single insurance provider by ID."""
    try:
        row = _call_sp(db, "GETBYID", insurance_provider_id=insurance_provider_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Insurance Provider with ID {insurance_provider_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /insurance-providers/{insurance_provider_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch insurance provider")


# ── POST /insurance-providers/ ────────────────────────────────
@router.post("/", response_model=InsuranceProviderResponse, status_code=status.HTTP_201_CREATED)
def create_insurance_provider(payload: InsuranceProviderCreate, db: Session = Depends(get_db)):
    """Create an insurance provider. ProviderCode is auto-generated (INS-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().InsuranceProviderId
        db.commit()

        created = _call_sp(db, "GETBYID", insurance_provider_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /insurance-providers] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create insurance provider")


# ── PUT /insurance-providers/{id} ─────────────────────────────
@router.put("/{insurance_provider_id}", response_model=InsuranceProviderResponse)
def update_insurance_provider(insurance_provider_id: int, payload: InsuranceProviderUpdate, db: Session = Depends(get_db)):
    """Update an existing insurance provider. ProviderCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            insurance_provider_id=insurance_provider_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", insurance_provider_id=insurance_provider_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Insurance Provider with ID {insurance_provider_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /insurance-providers/{insurance_provider_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update insurance provider")


# ── PATCH /insurance-providers/{id}/toggle-status ─────────────
@router.patch("/{insurance_provider_id}/toggle-status", response_model=InsuranceProviderResponse)
def toggle_insurance_provider_status(insurance_provider_id: int, db: Session = Depends(get_db)):
    """Toggle insurance provider status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", insurance_provider_id=insurance_provider_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", insurance_provider_id=insurance_provider_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Insurance Provider with ID {insurance_provider_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /insurance-providers/{insurance_provider_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle insurance provider status")


# ── DELETE /insurance-providers/{id} ──────────────────────────
@router.delete("/{insurance_provider_id}", status_code=status.HTTP_200_OK)
def delete_insurance_provider(insurance_provider_id: int, db: Session = Depends(get_db)):
    """Soft delete an insurance provider (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", insurance_provider_id=insurance_provider_id, updated_by="Admin")
        db.commit()
        return {"message": f"Insurance Provider {insurance_provider_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /insurance-providers/{insurance_provider_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete insurance provider")
