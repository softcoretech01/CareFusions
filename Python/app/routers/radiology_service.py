import logging
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.radiology_service import (
    RadiologyServiceCreate,
    RadiologyServiceUpdate,
    RadiologyServiceResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/radiology-services", tags=["Radiology Service Master"])

SP_NAME = "SpMasterRadiologyService"


# ── Helper: call SpMasterRadiologyService ─────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    """Execute SpMasterRadiologyService with the given p_Opt and field values."""
    params = {
        "p_Opt":                  opt,
        "p_RadiologyServiceId":   kwargs.get("radiology_service_id"),
        "p_ServiceName":          kwargs.get("service_name"),
        "p_Department":            kwargs.get("department"),
        "p_Description":          kwargs.get("description"),
        "p_ServiceCategory":      kwargs.get("service_category"),
        "p_EstimatedDuration":    kwargs.get("estimated_duration"),
        "p_ReportTat":            kwargs.get("report_tat"),
        "p_RequiresAppointment":  kwargs.get("requires_appointment"),
        "p_RequiresContrast":     kwargs.get("requires_contrast"),
        "p_RequiresFasting":      kwargs.get("requires_fasting"),
        "p_ServicePrice":         kwargs.get("service_price"),
        "p_Gst":                  kwargs.get("gst"),
        "p_ReportTemplate":       kwargs.get("report_template"),
        "p_RequiresApproval":     kwargs.get("requires_approval"),
        "p_CriticalFindingAlert": kwargs.get("critical_finding_alert"),
        "p_Status":               kwargs.get("status"),
        "p_Remarks":              kwargs.get("remarks"),
        "p_CreatedBy":            kwargs.get("created_by"),
        "p_UpdatedBy":            kwargs.get("updated_by"),
        "p_Search":               kwargs.get("search"),
        "p_DepartmentFilter":     kwargs.get("department_filter"),
        "p_CategoryFilter":       kwargs.get("category_filter"),
        "p_StatusFilter":         kwargs.get("status_filter"),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_RadiologyServiceId, :p_ServiceName, :p_Department,
            :p_Description, :p_ServiceCategory, :p_EstimatedDuration, :p_ReportTat,
            :p_RequiresAppointment, :p_RequiresContrast, :p_RequiresFasting,
            :p_ServicePrice, :p_Gst,
            :p_ReportTemplate, :p_RequiresApproval, :p_CriticalFindingAlert,
            :p_Status, :p_Remarks,
            :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_DepartmentFilter, :p_CategoryFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


# ── Helper: format a Decimal for the frontend ────────────────
def _money(value) -> Optional[str]:
    if value is None:
        return None
    return f"{Decimal(value):.2f}"


def _num(value) -> Optional[str]:
    """Trim trailing zeros from a DECIMAL so 18.00 -> '18'."""
    if value is None:
        return None
    d = Decimal(value).normalize()
    return format(d, "f")


# ── Helper: map DB row → RadiologyServiceResponse dict ───────
def _map_row(row) -> dict:
    return {
        "id":                   row.RadiologyServiceId,
        "serviceCode":          row.ServiceCode,
        "serviceName":          row.ServiceName,
        "department":           row.Department,
        "description":          row.Description,
        "serviceCategory":      row.ServiceCategory,
        "estimatedDuration":    str(row.EstimatedDuration),
        "reportTat":            str(row.ReportTat),
        "requiresAppointment":  bool(row.RequiresAppointment),
        "requiresContrast":     bool(row.RequiresContrast),
        "requiresFasting":      bool(row.RequiresFasting),
        "servicePrice":         _money(row.ServicePrice),
        "gst":                  _num(row.Gst),
        "reportTemplate":       row.ReportTemplate,
        "requiresApproval":     bool(row.RequiresApproval),
        "criticalFindingAlert": bool(row.CriticalFindingAlert),
        "status":               row.Status,
        "remarks":              row.Remarks,
        "createdBy":            row.CreatedBy,
        "createdDate":          row.CreatedDate,
        "updatedBy":            row.UpdatedBy,
        "updatedDate":          row.UpdatedDate,
    }


# ── Helper: turn a duplicate error into a 409 ────────────────
def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    # SP-level uniqueness (non-deleted names) raises this custom signal.
    if "DUPLICATE_SERVICE_NAME" in msg or "UQ_RadiologyService_Name" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Service Name must be unique")
    # DB-level unique key (e.g. ServiceCode collision) -> 1062.
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_RadiologyService_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Service Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A radiology service with these details already exists")


# ── GET /radiology-services/ ──────────────────────────────────
@router.get("/", response_model=List[RadiologyServiceResponse])
def get_radiology_services(
    search: Optional[str] = None,
    department: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all radiology services with optional search and department/category/status filters."""
    try:
        result = _call_sp(
            db, "GET",
            search=search,
            department_filter=department,
            category_filter=category,
            status_filter=status_filter,
        )
        rows = result.fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /radiology-services] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch radiology services")


# ── GET /radiology-services/next-code ─────────────────────────
# NOTE: declared BEFORE /{radiology_service_id} so "next-code" is not
# swallowed as a path parameter.
@router.get("/next-code")
def get_next_service_code(db: Session = Depends(get_db)):
    """Preview the ServiceCode the next insert would generate (provisional)."""
    try:
        result = _call_sp(db, "NEXTCODE")
        row = result.fetchone()
        return {"serviceCode": row.ServiceCode if row else "RAD-001"}
    except Exception as e:
        logger.error(f"[GET /radiology-services/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next service code")


# ── GET /radiology-services/{id} ──────────────────────────────
@router.get("/{radiology_service_id}", response_model=RadiologyServiceResponse)
def get_radiology_service_by_id(radiology_service_id: int, db: Session = Depends(get_db)):
    """Fetch a single radiology service by ID."""
    try:
        result = _call_sp(db, "GETBYID", radiology_service_id=radiology_service_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Radiology Service with ID {radiology_service_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /radiology-services/{radiology_service_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch radiology service")


# ── POST /radiology-services/ ─────────────────────────────────
@router.post("/", response_model=RadiologyServiceResponse, status_code=status.HTTP_201_CREATED)
def create_radiology_service(payload: RadiologyServiceCreate, db: Session = Depends(get_db)):
    """Create a new radiology service. ServiceCode is auto-generated (RAD-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            service_name=payload.serviceName,
            department=payload.department,
            description=payload.description,
            service_category=payload.serviceCategory.value,
            estimated_duration=payload.estimatedDuration,
            report_tat=payload.reportTat,
            requires_appointment=int(payload.requiresAppointment),
            requires_contrast=int(payload.requiresContrast),
            requires_fasting=int(payload.requiresFasting),
            service_price=payload.servicePrice,
            gst=payload.gst,
            report_template=payload.reportTemplate,
            requires_approval=int(payload.requiresApproval),
            critical_finding_alert=int(payload.criticalFindingAlert),
            status=payload.status.value,
            remarks=payload.remarks,
            created_by=payload.createdBy or "Admin",
        )
        row = result.fetchone()
        new_id = row.RadiologyServiceId
        db.commit()

        fetch = _call_sp(db, "GETBYID", radiology_service_id=new_id)
        created = fetch.fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /radiology-services] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create radiology service")


# ── PUT /radiology-services/{id} ──────────────────────────────
@router.put("/{radiology_service_id}", response_model=RadiologyServiceResponse)
def update_radiology_service(
    radiology_service_id: int,
    payload: RadiologyServiceUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing radiology service. ServiceCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            radiology_service_id=radiology_service_id,
            service_name=payload.serviceName,
            department=payload.department,
            description=payload.description,
            service_category=payload.serviceCategory.value,
            estimated_duration=payload.estimatedDuration,
            report_tat=payload.reportTat,
            requires_appointment=int(payload.requiresAppointment),
            requires_contrast=int(payload.requiresContrast),
            requires_fasting=int(payload.requiresFasting),
            service_price=payload.servicePrice,
            gst=payload.gst,
            report_template=payload.reportTemplate,
            requires_approval=int(payload.requiresApproval),
            critical_finding_alert=int(payload.criticalFindingAlert),
            status=payload.status.value,
            remarks=payload.remarks,
            updated_by=payload.updatedBy or "Admin",
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", radiology_service_id=radiology_service_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Radiology Service with ID {radiology_service_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /radiology-services/{radiology_service_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update radiology service")


# ── PATCH /radiology-services/{id}/toggle-status ──────────────
@router.patch("/{radiology_service_id}/toggle-status", response_model=RadiologyServiceResponse)
def toggle_radiology_service_status(radiology_service_id: int, db: Session = Depends(get_db)):
    """Toggle radiology service status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", radiology_service_id=radiology_service_id, updated_by="Admin")
        db.commit()

        fetch = _call_sp(db, "GETBYID", radiology_service_id=radiology_service_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Radiology Service with ID {radiology_service_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /radiology-services/{radiology_service_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle radiology service status")


# ── DELETE /radiology-services/{id} ───────────────────────────
@router.delete("/{radiology_service_id}", status_code=status.HTTP_200_OK)
def delete_radiology_service(radiology_service_id: int, db: Session = Depends(get_db)):
    """Soft delete a radiology service (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", radiology_service_id=radiology_service_id, updated_by="Admin")
        db.commit()
        return {"message": f"Radiology Service {radiology_service_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /radiology-services/{radiology_service_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete radiology service")
