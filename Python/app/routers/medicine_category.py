from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.medicine_category import (
    MedicineCategoryCreate,
    MedicineCategoryUpdate,
    MedicineCategoryResponse,
)

router = APIRouter(prefix="/medicine-categories", tags=["Medicine Category Master"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterMedicineCategory"


def safe_value(val):
    if val == "" or val is None:
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":             row.CategoryId,
        "categoryCode":   row.CategoryCode,
        "categoryName":   row.CategoryName,
        "description":    row.Description,
        "status":         row.Status,
        "remarks":        row.Remarks,
        "createdBy":      row.CreatedBy,
        "createdDate":    row.CreatedDate,
        "modifiedBy":     row.ModifiedBy,
        "modifiedDate":   row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, category_id: int = 0, **kwargs):
    params = {
        "p_Opt":            opt,
        "p_CategoryId":     category_id,
        "p_CategoryCode":   safe_value(kwargs.get("category_code")),
        "p_CategoryName":   safe_value(kwargs.get("category_name")),
        "p_Description":    safe_value(kwargs.get("description")),
        "p_Status":         safe_value(kwargs.get("status")),
        "p_Remarks":        safe_value(kwargs.get("remarks")),
        "p_CreatedBy":      safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":     safe_value(kwargs.get("modified_by")),
        "p_Search":         safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_CategoryId,
            :p_CategoryCode, :p_CategoryName, :p_Description,
            :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[MedicineCategoryResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /medicine-categories] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{category_id}", response_model=MedicineCategoryResponse)
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
        logger.error(f"[GET /medicine-categories/{category_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=MedicineCategoryResponse, status_code=status.HTTP_201_CREATED)
def create(category: MedicineCategoryCreate, db: Session = Depends(get_db)):
    try:
        d = category.model_dump()
        result = _call_sp(db, "INSERT",
            category_code=d["categoryCode"],
            category_name=d["categoryName"],
            description=d["description"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.CategoryId
        db.commit()

        fetch = _call_sp(db, "GETBYID", category_id=new_id)
        return _map_row(fetch.fetchone())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /medicine-categories] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Category Code or Name already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{category_id}", response_model=MedicineCategoryResponse)
def update(category_id: int, category: MedicineCategoryUpdate, db: Session = Depends(get_db)):
    try:
        d = category.model_dump()
        _call_sp(db, "UPDATE",
            category_id=category_id,
            category_code=d["categoryCode"],
            category_name=d["categoryName"],
            description=d["description"],
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
        logger.error(f"[PUT /medicine-categories/{category_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Category Code or Name already exists.")
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
        logger.error(f"[DELETE /medicine-categories/{category_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
