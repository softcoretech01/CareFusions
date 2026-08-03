from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.patient_category import (
    PatientCategoryCreate,
    PatientCategoryUpdate,
    PatientCategoryResponse,
)

router = APIRouter(prefix="/patient-categories", tags=["Patient Category"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterPatientCategory"


def safe_value(val):
    if val == "":
        return None
    return val


# ── GET /next-code ─────────────────────────────────────────
@router.get("/next-code")
def get_next_code(db: Session = Depends(get_db)):
    """Fetch the next auto-generated code from the backend."""
    try:
        result = _call_sp(db, "GETNEXTCODE")
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to generate next code")
        return {"nextCode": row[0]}
    except Exception as e:
        logger.error(f"[GET /next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch next code")


def _map_row(row) -> dict:
    return {
        "id":                  row.PatientCategoryId,
        "categoryCode":        row.CategoryCode,
        "categoryName":        row.CategoryName,
        "description":         row.Description,
        "billingType":         row.BillingType,
        # Cast numeric values to string for frontend compatibility, handle None
        "defaultDiscount":     str(int(row.DefaultDiscount)) if row.DefaultDiscount is not None and row.DefaultDiscount == int(row.DefaultDiscount) else str(row.DefaultDiscount) if row.DefaultDiscount is not None else '0',
        "creditLimit":         str(int(row.CreditLimit)) if row.CreditLimit is not None and row.CreditLimit == int(row.CreditLimit) else str(row.CreditLimit) if row.CreditLimit is not None else '0',
        "approvalRequired":    bool(row.ApprovalRequired),
        "insuranceApplicable": bool(row.InsuranceApplicable),
        "corporateApplicable": bool(row.CorporateApplicable),
        "status":              row.Status,
        "remarks":             row.Remarks,
        "createdBy":           row.CreatedBy,
        "createdDate":         row.CreatedDate,
        "modifiedBy":          row.ModifiedBy,
        "modifiedDate":        row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, category_id: int = 0, **kwargs):
    params = {
        "p_Opt":                 opt,
        "p_PatientCategoryId":   category_id,
        "p_CategoryCode":        safe_value(kwargs.get("category_code")),
        "p_CategoryName":        safe_value(kwargs.get("category_name")),
        "p_Description":         safe_value(kwargs.get("description")),
        "p_BillingType":         safe_value(kwargs.get("billing_type")),
        "p_DefaultDiscount":     kwargs.get("default_discount", 0.0),
        "p_CreditLimit":         kwargs.get("credit_limit", 0.0),
        "p_ApprovalRequired":    int(kwargs.get("approval_required", False)),
        "p_InsuranceApplicable": int(kwargs.get("insurance_applicable", False)),
        "p_CorporateApplicable": int(kwargs.get("corporate_applicable", False)),
        "p_Status":              safe_value(kwargs.get("status")),
        "p_Remarks":             safe_value(kwargs.get("remarks")),
        "p_CreatedBy":           safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":          safe_value(kwargs.get("modified_by")),
        "p_Search":              safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_PatientCategoryId,
            :p_CategoryCode, :p_CategoryName, :p_Description,
            :p_BillingType, :p_DefaultDiscount, :p_CreditLimit,
            :p_ApprovalRequired, :p_InsuranceApplicable, :p_CorporateApplicable,
            :p_Status, :p_Remarks, :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[PatientCategoryResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /patient-categories] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{category_id}", response_model=PatientCategoryResponse)
def get_by_id(category_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", category_id=category_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /patient-categories/{category_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=PatientCategoryResponse, status_code=status.HTTP_201_CREATED)
def create(category: PatientCategoryCreate, db: Session = Depends(get_db)):
    try:
        d = category.model_dump()
        result = _call_sp(db, "INSERT",
            category_code=d["categoryCode"],
            category_name=d["categoryName"],
            description=d["description"],
            billing_type=d["billingType"],
            default_discount=d["defaultDiscount"],
            credit_limit=d["creditLimit"],
            approval_required=d["approvalRequired"],
            insurance_applicable=d["insuranceApplicable"],
            corporate_applicable=d["corporateApplicable"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.PatientCategoryId
        db.commit()

        fetch = _call_sp(db, "GETBYID", category_id=new_id)
        return _map_row(fetch.fetchone())
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /patient-categories] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{category_id}", response_model=PatientCategoryResponse)
def update(category_id: int, category: PatientCategoryUpdate, db: Session = Depends(get_db)):
    try:
        d = category.model_dump()
        _call_sp(db, "UPDATE",
            category_id=category_id,
            category_code=d["categoryCode"],
            category_name=d["categoryName"],
            description=d["description"],
            billing_type=d["billingType"],
            default_discount=d["defaultDiscount"],
            credit_limit=d["creditLimit"],
            approval_required=d["approvalRequired"],
            insurance_applicable=d["insuranceApplicable"],
            corporate_applicable=d["corporateApplicable"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", category_id=category_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Category not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /patient-categories/{category_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(category_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", category_id=category_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Category not found")
        _call_sp(db, "DELETE", category_id=category_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /patient-categories/{category_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
