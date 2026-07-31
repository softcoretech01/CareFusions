import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.hospital import HospitalCreate, HospitalUpdate, HospitalResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/hospitals", tags=["Hospital Master"])

SP_NAME = "SpMasterHospital"

# ── Helper: build the CALL statement ─────────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    """Execute SpMasterHospital with the given p_Opt and field values."""
    params = {
        "p_Opt":            opt,
        "p_HospitalId":     kwargs.get("hospital_id"),
        "p_HospitalCode":   kwargs.get("code"),
        "p_HospitalName":   kwargs.get("name"),
        "p_LegalName":      kwargs.get("legal_name"),
        "p_RegistrationNo": kwargs.get("registration_no"),
        "p_GstVatNo":       kwargs.get("gst_vat_no"),
        "p_PanTinNo":       kwargs.get("pan_tin_no"),
        "p_ContactNumber":  kwargs.get("contact_number"),
        "p_AlternateNumber":kwargs.get("alternate_number"),
        "p_Email":          kwargs.get("email"),
        "p_Website":        kwargs.get("website"),
        "p_Address1":       kwargs.get("address1"),
        "p_Address2":       kwargs.get("address2"),
        "p_Country":        kwargs.get("country"),
        "p_State":          kwargs.get("state"),
        "p_City":           kwargs.get("city"),
        "p_PostalCode":     kwargs.get("postal_code"),
        "p_Currency":       kwargs.get("currency"),
        "p_FinancialYear":  kwargs.get("financial_year"),
        "p_TimeZone":       kwargs.get("time_zone"),
        "p_Status":         kwargs.get("status"),
        "p_Remarks":        kwargs.get("remarks"),
        "p_Search":         kwargs.get("search"),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_HospitalId, :p_HospitalCode, :p_HospitalName,
            :p_LegalName, :p_RegistrationNo, :p_GstVatNo, :p_PanTinNo,
            :p_ContactNumber, :p_AlternateNumber, :p_Email, :p_Website,
            :p_Address1, :p_Address2, :p_Country, :p_State, :p_City,
            :p_PostalCode, :p_Currency, :p_FinancialYear, :p_TimeZone,
            :p_Status, :p_Remarks, :p_Search
        )
    """)
    return db.execute(sql, params)


# ── Helper: map DB row → HospitalResponse ────────────────────
def _map_row(row) -> dict:
    return {
        "id":              row.HospitalId,
        "code":            row.HospitalCode,
        "name":            row.HospitalName,
        "legalName":       row.LegalName,
        "registrationNo":  row.RegistrationNo,
        "gstVatNo":        row.GstVatNo,
        "panTinNo":        row.PanTinNo,
        "contactNumber":   row.ContactNumber,
        "alternateNumber": row.AlternateNumber,
        "email":           row.Email,
        "website":         row.Website,
        "address1":        row.Address1,
        "address2":        row.Address2,
        "country":         row.Country,
        "state":           row.State,
        "city":            row.City,
        "postalCode":      row.PostalCode,
        "currency":        row.Currency,
        "financialYear":   row.FinancialYear,
        "timeZone":        row.TimeZone,
        "status":          row.Status,
        "remarks":         row.Remarks,
        "createdDate":     row.CreatedDate,
        "modifiedDate":    row.ModifiedDate,
    }


# ── GET /hospitals ─────────────────────────────────────────
@router.get("/", response_model=List[HospitalResponse])
def get_hospitals(search: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch all hospitals. Optionally filter by search keyword."""
    try:
        result = _call_sp(db, "GET", search=search)
        rows = result.fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /hospitals] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch hospitals")


# ── GET /hospitals/options ─────────────────────────────────
@router.get("/options", response_model=dict)
def get_hospital_options():
    """Fetch configuration options for the hospital master form."""
    from app.schemas.hospital import CurrencyEnum, StatusEnum, FinancialYearEnum, TimeZoneEnum
    return {
        "currencies": [c.value for c in CurrencyEnum],
        "financialYears": [f.value for f in FinancialYearEnum],
        "timeZones": [t.value for t in TimeZoneEnum],
        "statuses": [s.value for s in StatusEnum]
    }


# ── GET /hospitals/{id} ────────────────────────────────────
@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital_by_id(hospital_id: int, db: Session = Depends(get_db)):
    """Fetch a single hospital by ID."""
    try:
        result = _call_sp(db, "GETBYID", hospital_id=hospital_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Hospital with ID {hospital_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /hospitals/{hospital_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch hospital")


# ── POST /hospitals ────────────────────────────────────────
@router.post("/", response_model=HospitalResponse, status_code=status.HTTP_201_CREATED)
def create_hospital(payload: HospitalCreate, db: Session = Depends(get_db)):
    """Create a new hospital record."""
    try:
        result = _call_sp(
            db, "INSERT",
            code=payload.code,
            name=payload.name,
            legal_name=payload.legalName,
            registration_no=payload.registrationNo,
            gst_vat_no=payload.gstVatNo,
            pan_tin_no=payload.panTinNo,
            contact_number=payload.contactNumber,
            alternate_number=payload.alternateNumber,
            email=payload.email,
            website=payload.website,
            address1=payload.address1,
            address2=payload.address2,
            country=payload.country,
            state=payload.state,
            city=payload.city,
            postal_code=payload.postalCode,
            currency=payload.currency.value,
            financial_year=payload.financialYear.value,
            time_zone=payload.timeZone.value,
            status=payload.status.value,
            remarks=payload.remarks,
        )
        row = result.fetchone()
        new_id = row.HospitalId
        db.commit()

        # Fetch and return the created record
        fetch = _call_sp(db, "GETBYID", hospital_id=new_id)
        created = fetch.fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /hospitals] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create hospital: {str(e)}")


# ── PUT /hospitals/{id} ────────────────────────────────────
@router.put("/{hospital_id}", response_model=HospitalResponse)
def update_hospital(hospital_id: int, payload: HospitalUpdate, db: Session = Depends(get_db)):
    """Update an existing hospital record."""
    try:
        _call_sp(
            db, "UPDATE",
            hospital_id=hospital_id,
            name=payload.name,
            legal_name=payload.legalName,
            registration_no=payload.registrationNo,
            gst_vat_no=payload.gstVatNo,
            pan_tin_no=payload.panTinNo,
            contact_number=payload.contactNumber,
            alternate_number=payload.alternateNumber,
            email=payload.email,
            website=payload.website,
            address1=payload.address1,
            address2=payload.address2,
            country=payload.country,
            state=payload.state,
            city=payload.city,
            postal_code=payload.postalCode,
            currency=payload.currency.value,
            financial_year=payload.financialYear.value,
            time_zone=payload.timeZone.value,
            status=payload.status.value,
            remarks=payload.remarks,
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", hospital_id=hospital_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Hospital with ID {hospital_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /hospitals/{hospital_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update hospital: {str(e)}")


# ── DELETE /hospitals/{id} ─────────────────────────────────
@router.delete("/{hospital_id}", status_code=status.HTTP_200_OK)
def delete_hospital(hospital_id: int, db: Session = Depends(get_db)):
    """Soft delete a hospital (sets IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", hospital_id=hospital_id)
        db.commit()
        return {"message": f"Hospital {hospital_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /hospitals/{hospital_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete hospital: {str(e)}")
