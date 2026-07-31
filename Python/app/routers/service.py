import logging
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/services", tags=["Service Master"])

SP_NAME = "SpMasterService"


# ── Helper: call SpMasterService ──────────────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                    opt,
        "p_ServiceId":              kwargs.get("service_id"),
        "p_ServiceName":            kwargs.get("service_name"),
        "p_ServiceCategory":        kwargs.get("service_category"),
        "p_Department":             kwargs.get("department"),
        "p_Description":            kwargs.get("description"),
        "p_StandardPrice":          kwargs.get("standard_price"),
        "p_CostPrice":              kwargs.get("cost_price"),
        "p_TaxApplicable":          kwargs.get("tax_applicable"),
        "p_Tax":                    kwargs.get("tax"),
        "p_AllowDiscount":          kwargs.get("allow_discount"),
        "p_RequiresDoctorApproval": kwargs.get("requires_doctor_approval"),
        "p_AvailableForOp":         kwargs.get("available_for_op"),
        "p_AvailableForIp":         kwargs.get("available_for_ip"),
        "p_AvailableForEmergency":  kwargs.get("available_for_emergency"),
        "p_Status":                 kwargs.get("status"),
        "p_Remarks":                kwargs.get("remarks"),
        "p_CreatedBy":              kwargs.get("created_by"),
        "p_UpdatedBy":              kwargs.get("updated_by"),
        "p_Search":                 kwargs.get("search"),
        "p_DepartmentFilter":       kwargs.get("department_filter"),
        "p_CategoryFilter":         kwargs.get("category_filter"),
        "p_StatusFilter":           kwargs.get("status_filter"),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_ServiceId, :p_ServiceName, :p_ServiceCategory, :p_Department,
            :p_Description, :p_StandardPrice, :p_CostPrice, :p_TaxApplicable, :p_Tax,
            :p_AllowDiscount, :p_RequiresDoctorApproval, :p_AvailableForOp,
            :p_AvailableForIp, :p_AvailableForEmergency,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_DepartmentFilter, :p_CategoryFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _money(value) -> Optional[str]:
    if value is None:
        return None
    return f"{Decimal(value):.2f}"


def _map_row(row) -> dict:
    return {
        "id":                     row.ServiceId,
        "serviceCode":            row.ServiceCode,
        "serviceName":            row.ServiceName,
        "serviceCategory":        row.ServiceCategory,
        "department":             row.Department,
        "description":            row.Description,
        "standardPrice":          _money(row.StandardPrice),
        "costPrice":              _money(row.CostPrice),
        "taxApplicable":          bool(row.TaxApplicable),
        "tax":                    row.Tax,
        "allowDiscount":          bool(row.AllowDiscount),
        "requiresDoctorApproval": bool(row.RequiresDoctorApproval),
        "availableForOp":         bool(row.AvailableForOp),
        "availableForIp":         bool(row.AvailableForIp),
        "availableForEmergency":  bool(row.AvailableForEmergency),
        "status":                 row.Status,
        "remarks":                row.Remarks,
        "createdBy":              row.CreatedBy,
        "createdDate":            row.CreatedDate,
        "updatedBy":              row.UpdatedBy,
        "updatedDate":            row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_SERVICE_NAME" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Service Name cannot be duplicated")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Service_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Service Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A service with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        service_name=payload.serviceName,
        service_category=payload.serviceCategory,
        department=payload.department,
        description=payload.description,
        standard_price=payload.standardPrice,
        cost_price=payload.costPrice,
        tax_applicable=int(payload.taxApplicable),
        tax=payload.tax.value if payload.tax else None,
        allow_discount=int(payload.allowDiscount),
        requires_doctor_approval=int(payload.requiresDoctorApproval),
        available_for_op=int(payload.availableForOp),
        available_for_ip=int(payload.availableForIp),
        available_for_emergency=int(payload.availableForEmergency),
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /services/ ────────────────────────────────────────────
@router.get("/", response_model=List[ServiceResponse])
def get_services(
    search: Optional[str] = None,
    department: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all services with optional search and department/category/status filters."""
    try:
        result = _call_sp(
            db, "GET",
            search=search,
            department_filter=department,
            category_filter=category,
            status_filter=status_filter,
        )
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /services] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch services")


# ── GET /services/next-code ───────────────────────────────────
# NOTE: declared BEFORE /{service_id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_service_code(db: Session = Depends(get_db)):
    """Preview the ServiceCode the next insert would generate (provisional)."""
    try:
        result = _call_sp(db, "NEXTCODE")
        row = result.fetchone()
        return {"serviceCode": row.ServiceCode if row else "SRV-001"}
    except Exception as e:
        logger.error(f"[GET /services/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next service code")


# ── GET /services/{id} ────────────────────────────────────────
@router.get("/{service_id}", response_model=ServiceResponse)
def get_service_by_id(service_id: int, db: Session = Depends(get_db)):
    """Fetch a single service by ID."""
    try:
        result = _call_sp(db, "GETBYID", service_id=service_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Service with ID {service_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /services/{service_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch service")


# ── POST /services/ ───────────────────────────────────────────
@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(payload: ServiceCreate, db: Session = Depends(get_db)):
    """Create a new service. ServiceCode is auto-generated (SRV-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().ServiceId
        db.commit()

        created = _call_sp(db, "GETBYID", service_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /services] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create service")


# ── PUT /services/{id} ────────────────────────────────────────
@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(service_id: int, payload: ServiceUpdate, db: Session = Depends(get_db)):
    """Update an existing service. ServiceCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            service_id=service_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", service_id=service_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Service with ID {service_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /services/{service_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update service")


# ── PATCH /services/{id}/toggle-status ────────────────────────
@router.patch("/{service_id}/toggle-status", response_model=ServiceResponse)
def toggle_service_status(service_id: int, db: Session = Depends(get_db)):
    """Toggle service status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", service_id=service_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", service_id=service_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Service with ID {service_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /services/{service_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle service status")


# ── DELETE /services/{id} ─────────────────────────────────────
@router.delete("/{service_id}", status_code=status.HTTP_200_OK)
def delete_service(service_id: int, db: Session = Depends(get_db)):
    """Soft delete a service (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", service_id=service_id, updated_by="Admin")
        db.commit()
        return {"message": f"Service {service_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /services/{service_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete service")
