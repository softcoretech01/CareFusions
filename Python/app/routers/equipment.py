import logging
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/equipment", tags=["Equipment Master"])

SP_NAME = "SpMasterEquipment"


# ── Helper: call SpMasterEquipment ────────────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_EquipmentId":         kwargs.get("equipment_id"),
        "p_EquipmentName":       kwargs.get("equipment_name"),
        "p_Manufacturer":        kwargs.get("manufacturer"),
        "p_Model":               kwargs.get("model"),
        "p_SerialNumber":        kwargs.get("serial_number"),
        "p_PurchaseDate":        kwargs.get("purchase_date"),
        "p_WarrantyExpiryDate":  kwargs.get("warranty_expiry_date"),
        "p_Supplier":            kwargs.get("supplier"),
        "p_PurchaseCost":        kwargs.get("purchase_cost"),
        "p_CalibrationSchedule": kwargs.get("calibration_schedule"),
        "p_NextMaintenanceDate": kwargs.get("next_maintenance_date"),
        "p_MaintenanceVendor":   kwargs.get("maintenance_vendor"),
        "p_LastServiceDate":     kwargs.get("last_service_date"),
        "p_Hospital":            kwargs.get("hospital"),
        "p_Branch":              kwargs.get("branch"),
        "p_Department":          kwargs.get("department"),
        "p_RoomNumber":          kwargs.get("room_number"),
        "p_Status":              kwargs.get("status"),
        "p_Remarks":             kwargs.get("remarks"),
        "p_CreatedBy":           kwargs.get("created_by"),
        "p_UpdatedBy":           kwargs.get("updated_by"),
        "p_Search":              kwargs.get("search"),
        "p_ManufacturerFilter":  kwargs.get("manufacturer_filter"),
        "p_StatusFilter":        kwargs.get("status_filter"),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_EquipmentId, :p_EquipmentName, :p_Manufacturer, :p_Model,
            :p_SerialNumber, :p_PurchaseDate, :p_WarrantyExpiryDate, :p_Supplier,
            :p_PurchaseCost, :p_CalibrationSchedule, :p_NextMaintenanceDate,
            :p_MaintenanceVendor, :p_LastServiceDate, :p_Hospital, :p_Branch,
            :p_Department, :p_RoomNumber, :p_Status, :p_Remarks,
            :p_CreatedBy, :p_UpdatedBy,
            :p_Search, :p_ManufacturerFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


# ── Helpers: formatting ──────────────────────────────────────
def _money(value) -> Optional[str]:
    if value is None:
        return None
    return f"{Decimal(value):.2f}"


def _iso(value) -> Optional[str]:
    """Format a date/datetime as 'YYYY-MM-DD' (or None)."""
    if value is None:
        return None
    return value.isoformat()[:10]


def _map_row(row) -> dict:
    return {
        "id":                  row.EquipmentId,
        "equipmentCode":       row.EquipmentCode,
        "equipmentName":       row.EquipmentName,
        "manufacturer":        row.Manufacturer,
        "model":               row.Model,
        "serialNumber":        row.SerialNumber,
        "purchaseDate":        _iso(row.PurchaseDate),
        "warrantyExpiryDate":  _iso(row.WarrantyExpiryDate),
        "supplier":            row.Supplier,
        "purchaseCost":        _money(row.PurchaseCost),
        "calibrationSchedule": row.CalibrationSchedule,
        "nextMaintenanceDate": _iso(row.NextMaintenanceDate),
        "maintenanceVendor":   row.MaintenanceVendor,
        "lastServiceDate":     _iso(row.LastServiceDate),
        "hospital":            row.Hospital,
        "branch":              row.Branch,
        "department":          row.Department,
        "roomNumber":          row.RoomNumber,
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "updatedBy":           row.UpdatedBy,
        "updatedDate":         row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_SERIAL_NUMBER" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Serial Number must be unique")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_Equipment_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Equipment Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="An equipment with these details already exists")


def _payload_kwargs(payload) -> dict:
    """Map a create/update payload → _call_sp kwargs (shared by INSERT/UPDATE)."""
    return dict(
        equipment_name=payload.equipmentName,
        manufacturer=payload.manufacturer,
        model=payload.model,
        serial_number=payload.serialNumber,
        purchase_date=payload.purchaseDate,
        warranty_expiry_date=payload.warrantyExpiryDate,
        supplier=payload.supplier,
        purchase_cost=payload.purchaseCost,
        calibration_schedule=payload.calibrationSchedule.value,
        next_maintenance_date=payload.nextMaintenanceDate,
        maintenance_vendor=payload.maintenanceVendor,
        last_service_date=payload.lastServiceDate,
        hospital=payload.hospital,
        branch=payload.branch,
        department=payload.department,
        room_number=payload.roomNumber,
        status=payload.status.value,
        remarks=payload.remarks,
    )


# ── GET /equipment/ ───────────────────────────────────────────
@router.get("/", response_model=List[EquipmentResponse])
def get_equipment(
    search: Optional[str] = None,
    manufacturer: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all equipment with optional search and manufacturer/status filters."""
    try:
        result = _call_sp(
            db, "GET",
            search=search,
            manufacturer_filter=manufacturer,
            status_filter=status_filter,
        )
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /equipment] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch equipment")


# ── GET /equipment/next-code ──────────────────────────────────
# NOTE: declared BEFORE /{equipment_id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_equipment_code(db: Session = Depends(get_db)):
    """Preview the EquipmentCode the next insert would generate (provisional)."""
    try:
        result = _call_sp(db, "NEXTCODE")
        row = result.fetchone()
        return {"equipmentCode": row.EquipmentCode if row else "EQP-001"}
    except Exception as e:
        logger.error(f"[GET /equipment/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next equipment code")


# ── GET /equipment/{id} ───────────────────────────────────────
@router.get("/{equipment_id}", response_model=EquipmentResponse)
def get_equipment_by_id(equipment_id: int, db: Session = Depends(get_db)):
    """Fetch a single equipment by ID."""
    try:
        result = _call_sp(db, "GETBYID", equipment_id=equipment_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Equipment with ID {equipment_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /equipment/{equipment_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch equipment")


# ── POST /equipment/ ──────────────────────────────────────────
@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(payload: EquipmentCreate, db: Session = Depends(get_db)):
    """Create equipment. EquipmentCode is auto-generated (EQP-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().EquipmentId
        db.commit()

        created = _call_sp(db, "GETBYID", equipment_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /equipment] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create equipment")


# ── PUT /equipment/{id} ───────────────────────────────────────
@router.put("/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(equipment_id: int, payload: EquipmentUpdate, db: Session = Depends(get_db)):
    """Update an existing equipment. EquipmentCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            equipment_id=equipment_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", equipment_id=equipment_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Equipment with ID {equipment_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /equipment/{equipment_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update equipment")


# ── PATCH /equipment/{id}/toggle-status ───────────────────────
@router.patch("/{equipment_id}/toggle-status", response_model=EquipmentResponse)
def toggle_equipment_status(equipment_id: int, db: Session = Depends(get_db)):
    """Toggle equipment status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", equipment_id=equipment_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", equipment_id=equipment_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Equipment with ID {equipment_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /equipment/{equipment_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle equipment status")


# ── DELETE /equipment/{id} ────────────────────────────────────
@router.delete("/{equipment_id}", status_code=status.HTTP_200_OK)
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    """Soft delete an equipment (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", equipment_id=equipment_id, updated_by="Admin")
        db.commit()
        return {"message": f"Equipment {equipment_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /equipment/{equipment_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete equipment")
