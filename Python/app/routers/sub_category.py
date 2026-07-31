import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.sub_category import SubCategoryCreate, SubCategoryUpdate, SubCategoryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sub-categories", tags=["Sub-Category Master"])

SP_NAME = "SpMasterSubCategory"


def _call_sp(db: Session, opt: str, **kwargs):
    params = {
        "p_Opt":             opt,
        "p_SubCategoryId":   kwargs.get("sub_category_id"),
        "p_Category":        kwargs.get("category"),
        "p_SubCategoryName": kwargs.get("sub_category_name"),
        "p_Description":     kwargs.get("description"),
        "p_Status":          kwargs.get("status"),
        "p_CreatedBy":       kwargs.get("created_by"),
        "p_UpdatedBy":       kwargs.get("updated_by"),
        "p_Search":          kwargs.get("search"),
        "p_CategoryFilter":  kwargs.get("category_filter"),
        "p_StatusFilter":    kwargs.get("status_filter"),
    }
    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_SubCategoryId, :p_Category, :p_SubCategoryName, :p_Description,
            :p_Status, :p_CreatedBy, :p_UpdatedBy, :p_Search, :p_CategoryFilter, :p_StatusFilter
        )
    """)
    return db.execute(sql, params)


def _map_row(row) -> dict:
    return {
        "id":              row.SubCategoryId,
        "subCategoryCode": row.SubCategoryCode,
        "category":        row.Category,
        "subCategoryName": row.SubCategoryName,
        "description":     row.Description,
        "status":          row.Status,
        "createdBy":       row.CreatedBy,
        "createdDate":     row.CreatedDate,
        "updatedBy":       row.UpdatedBy,
        "updatedDate":     row.UpdatedDate,
    }


def _raise_if_duplicate(exc: Exception):
    msg = str(exc)
    if "DUPLICATE_SUBCATEGORY" in msg:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="This sub-category already exists under the selected category")
    if "1062" in msg or "Duplicate entry" in msg:
        if "UQ_SubCategory_Code" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Sub-Category Code must be unique")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="A sub-category with these details already exists")


def _payload_kwargs(payload) -> dict:
    return dict(
        category=payload.category,
        sub_category_name=payload.subCategoryName,
        description=payload.description,
        status=payload.status.value,
    )


# ── GET /sub-categories/ ──────────────────────────────────────
@router.get("/", response_model=List[SubCategoryResponse])
def get_sub_categories(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch all sub-categories with optional search and category/status filters."""
    try:
        result = _call_sp(db, "GET", search=search, category_filter=category, status_filter=status_filter)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /sub-categories] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch sub-categories")


# ── GET /sub-categories/next-code ─────────────────────────────
# NOTE: declared BEFORE /{id} so "next-code" is not swallowed as an ID.
@router.get("/next-code")
def get_next_sub_category_code(db: Session = Depends(get_db)):
    """Preview the SubCategoryCode the next insert would generate (provisional)."""
    try:
        row = _call_sp(db, "NEXTCODE").fetchone()
        return {"subCategoryCode": row.SubCategoryCode if row else "SUB-001"}
    except Exception as e:
        logger.error(f"[GET /sub-categories/next-code] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate next sub-category code")


# ── GET /sub-categories/{id} ──────────────────────────────────
@router.get("/{sub_category_id}", response_model=SubCategoryResponse)
def get_sub_category_by_id(sub_category_id: int, db: Session = Depends(get_db)):
    """Fetch a single sub-category by ID."""
    try:
        row = _call_sp(db, "GETBYID", sub_category_id=sub_category_id).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Sub-Category with ID {sub_category_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /sub-categories/{sub_category_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch sub-category")


# ── POST /sub-categories/ ─────────────────────────────────────
@router.post("/", response_model=SubCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_sub_category(payload: SubCategoryCreate, db: Session = Depends(get_db)):
    """Create a sub-category. SubCategoryCode is auto-generated (SUB-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            created_by=payload.createdBy or "Admin",
            **_payload_kwargs(payload),
        )
        new_id = result.fetchone().SubCategoryId
        db.commit()

        created = _call_sp(db, "GETBYID", sub_category_id=new_id).fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /sub-categories] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create sub-category")


# ── PUT /sub-categories/{id} ──────────────────────────────────
@router.put("/{sub_category_id}", response_model=SubCategoryResponse)
def update_sub_category(sub_category_id: int, payload: SubCategoryUpdate, db: Session = Depends(get_db)):
    """Update an existing sub-category. SubCategoryCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            sub_category_id=sub_category_id,
            updated_by=payload.updatedBy or "Admin",
            **_payload_kwargs(payload),
        )
        db.commit()

        updated = _call_sp(db, "GETBYID", sub_category_id=sub_category_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Sub-Category with ID {sub_category_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /sub-categories/{sub_category_id}] Error: {e}")
        _raise_if_duplicate(e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update sub-category")


# ── PATCH /sub-categories/{id}/toggle-status ──────────────────
@router.patch("/{sub_category_id}/toggle-status", response_model=SubCategoryResponse)
def toggle_sub_category_status(sub_category_id: int, db: Session = Depends(get_db)):
    """Toggle sub-category status between Active and Inactive."""
    try:
        _call_sp(db, "TOGGLESTATUS", sub_category_id=sub_category_id, updated_by="Admin")
        db.commit()

        updated = _call_sp(db, "GETBYID", sub_category_id=sub_category_id).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Sub-Category with ID {sub_category_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /sub-categories/{sub_category_id}/toggle-status] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to toggle sub-category status")


# ── DELETE /sub-categories/{id} ───────────────────────────────
@router.delete("/{sub_category_id}", status_code=status.HTTP_200_OK)
def delete_sub_category(sub_category_id: int, db: Session = Depends(get_db)):
    """Soft delete a sub-category (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", sub_category_id=sub_category_id, updated_by="Admin")
        db.commit()
        return {"message": f"Sub-Category {sub_category_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /sub-categories/{sub_category_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to delete sub-category")
