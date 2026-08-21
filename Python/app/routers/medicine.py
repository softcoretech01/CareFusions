from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.medicine import (
    MedicineCreate,
    MedicineUpdate,
    MedicineResponse,
    MedicineCategoryResponse,
)

router = APIRouter(prefix="/medicines", tags=["Medicine Master"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterMedicine"


def safe_value(val):
    if val == "" or val is None:
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":             row.MedicineId,
        "medicineCode":   row.MedicineCode,
        "genericName":    row.GenericName,
        "brandName":      row.BrandName,
        "category":       row.Category,
        "manufacturer":   row.Manufacturer,
        "strength":       row.Strength,
        "dosageForm":     row.DosageForm,
        "unit":           row.Unit,
        "batchTracking":  bool(row.BatchTracking),
        "expiryRequired": bool(row.ExpiryRequired),
        "controlledDrug": bool(row.ControlledDrug),
        "reorderLevel":   str(row.ReorderLevel) if row.ReorderLevel is not None else "0",
        "barcode":        row.Barcode,
        "purchasePrice":  str(row.PurchasePrice),
        "sellingPrice":   str(row.SellingPrice),
        "gst":            str(row.Gst),
        "status":         row.Status,
        "remarks":        row.Remarks,
        "createdBy":      row.CreatedBy,
        "createdDate":    row.CreatedDate,
        "modifiedBy":     row.ModifiedBy,
        "modifiedDate":   row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, medicine_id: int = 0, **kwargs):
    params = {
        "p_Opt":            opt,
        "p_MedicineId":     medicine_id,
        "p_MedicineCode":   safe_value(kwargs.get("medicine_code")),
        "p_GenericName":    safe_value(kwargs.get("generic_name")),
        "p_Category":       safe_value(kwargs.get("category")),
        "p_Manufacturer":   safe_value(kwargs.get("manufacturer")),
        "p_Strength":       safe_value(kwargs.get("strength")),
        "p_DosageForm":     safe_value(kwargs.get("dosage_form")),
        "p_Unit":           safe_value(kwargs.get("unit")),
        "p_BatchTracking":  1 if kwargs.get("batch_tracking") else 0,
        "p_ExpiryRequired": 1 if kwargs.get("expiry_required") else 0,
        "p_ControlledDrug": 1 if kwargs.get("controlled_drug") else 0,
        "p_ReorderLevel":   int(kwargs.get("reorder_level") or 0),
        "p_Barcode":        safe_value(kwargs.get("barcode")),
        "p_PurchasePrice":  float(kwargs.get("purchase_price") or 0),
        "p_SellingPrice":   float(kwargs.get("selling_price") or 0),
        "p_Gst":            float(kwargs.get("gst") or 0),
        "p_Status":         safe_value(kwargs.get("status")),
        "p_Remarks":        safe_value(kwargs.get("remarks")),
        "p_CreatedBy":      safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":     safe_value(kwargs.get("modified_by")),
        "p_Search":         safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_MedicineId,
            :p_MedicineCode, :p_GenericName, :p_Category,
            :p_Manufacturer, :p_Strength, :p_DosageForm, :p_Unit,
            :p_BatchTracking, :p_ExpiryRequired, :p_ControlledDrug, :p_ReorderLevel, :p_Barcode,
            :p_PurchasePrice, :p_SellingPrice, :p_Gst,
            :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET MEDICINE CATEGORIES (Lookup) ────────────────────────────────────────
@router.get("/categories", response_model=List[MedicineCategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    try:
        result = db.execute(text(
            "SELECT CategoryId, CategoryName FROM Master_MedicineCategory ORDER BY CategoryName ASC"
        ))
        return [{"id": row.CategoryId, "categoryName": row.CategoryName} for row in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /medicines/categories] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[MedicineResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /medicines] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_by_id(medicine_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", medicine_id=medicine_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Medicine not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /medicines/{medicine_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create(medicine: MedicineCreate, db: Session = Depends(get_db)):
    try:
        d = medicine.model_dump()
        result = _call_sp(db, "INSERT",
            medicine_code=d["medicineCode"],
            generic_name=d["genericName"],
            brand_name=d["brandName"],
            category=d["category"],
            manufacturer=d["manufacturer"],
            strength=d["strength"],
            dosage_form=d["dosageForm"],
            unit=d["unit"],
            batch_tracking=d["batchTracking"],
            expiry_required=d["expiryRequired"],
            controlled_drug=d["controlledDrug"],
            reorder_level=d["reorderLevel"],
            barcode=d["barcode"],
            purchase_price=d["purchasePrice"],
            selling_price=d["sellingPrice"],
            gst=d["gst"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.MedicineId
        db.commit()

        fetch = _call_sp(db, "GETBYID", medicine_id=new_id)
        return _map_row(fetch.fetchone())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /medicines] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Medicine Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{medicine_id}", response_model=MedicineResponse)
def update(medicine_id: int, medicine: MedicineUpdate, db: Session = Depends(get_db)):
    try:
        d = medicine.model_dump()
        _call_sp(db, "UPDATE",
            medicine_id=medicine_id,
            medicine_code=d["medicineCode"],
            generic_name=d["genericName"],
            brand_name=d["brandName"],
            category=d["category"],
            manufacturer=d["manufacturer"],
            strength=d["strength"],
            dosage_form=d["dosageForm"],
            unit=d["unit"],
            batch_tracking=d["batchTracking"],
            expiry_required=d["expiryRequired"],
            controlled_drug=d["controlledDrug"],
            reorder_level=d["reorderLevel"],
            barcode=d["barcode"],
            purchase_price=d["purchasePrice"],
            selling_price=d["sellingPrice"],
            gst=d["gst"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", medicine_id=medicine_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Medicine not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /medicines/{medicine_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Medicine Code already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(medicine_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", medicine_id=medicine_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Medicine not found")
        _call_sp(db, "DELETE", medicine_id=medicine_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /medicines/{medicine_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
