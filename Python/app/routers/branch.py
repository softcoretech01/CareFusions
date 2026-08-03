import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/branches", tags=["Branch Master"])

SP_NAME = "SpMasterBranch"


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

# ── Helper: call SpMasterBranch ───────────────────────────────
def _call_sp(db: Session, opt: str, **kwargs):
    """Execute SpMasterBranch with the given p_Opt and field values."""
    params = {
        "p_Opt":                opt,
        "p_BranchId":           kwargs.get("branch_id"),
        "p_BranchName":         kwargs.get("name"),
        "p_HospitalId":         kwargs.get("hospital_id"),
        "p_BranchType":         kwargs.get("branch_type"),
        "p_Address1":           kwargs.get("address1"),
        "p_Address2":           kwargs.get("address2"),
        "p_Country":            kwargs.get("country"),
        "p_State":              kwargs.get("state"),
        "p_City":               kwargs.get("city"),
        "p_PostalCode":         kwargs.get("postal_code"),
        "p_ContactNumber":      kwargs.get("contact_number"),
        "p_Email":              kwargs.get("email"),
        "p_BranchManager":      kwargs.get("branch_manager"),
        "p_WorkingHours":       kwargs.get("working_hours"),
        "p_EmergencyAvailable": kwargs.get("emergency_available"),
        "p_NumberOfFloors":     kwargs.get("number_of_floors"),
        "p_NumberOfBeds":       kwargs.get("number_of_beds"),
        "p_Status":             kwargs.get("status"),
        "p_Remarks":            kwargs.get("remarks"),
        "p_Search":             kwargs.get("search"),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_BranchId, :p_BranchName, :p_HospitalId,
            :p_BranchType, :p_Address1, :p_Address2,
            :p_Country, :p_State, :p_City, :p_PostalCode,
            :p_ContactNumber, :p_Email, :p_BranchManager,
            :p_WorkingHours, :p_EmergencyAvailable,
            :p_NumberOfFloors, :p_NumberOfBeds,
            :p_Status, :p_Remarks, :p_Search
        )
    """)
    return db.execute(sql, params)


# ── Helper: map DB row → BranchResponse dict ─────────────────
def _map_row(row) -> dict:
    return {
        "id":                 row.BranchId,
        "code":               row.BranchCode,
        "name":               row.BranchName,
        "hospitalId":         row.HospitalId,
        "hospital":           row.HospitalName,
        "branchType":         row.BranchType,
        "address1":           row.Address1,
        "address2":           row.Address2,
        "country":            row.Country,
        "state":              row.State,
        "city":               row.City,
        "postalCode":         row.PostalCode,
        "contactNumber":      row.ContactNumber,
        "email":              row.Email,
        "branchManager":      row.BranchManager,
        "workingHours":       row.WorkingHours,
        "emergencyAvailable": row.EmergencyAvailable,
        "numberOfFloors":     row.NumberOfFloors,
        "numberOfBeds":       row.NumberOfBeds,
        "status":             row.Status,
        "remarks":            row.Remarks,
        "createdDate":        row.CreatedDate,
        "modifiedDate":       row.ModifiedDate,
    }


# ── GET /branches/ ────────────────────────────────────────────
@router.get("/", response_model=List[BranchResponse])
def get_branches(search: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch all branches. Optionally filter by search keyword."""
    try:
        result = _call_sp(db, "GET", search=search)
        rows = result.fetchall()
        return [_map_row(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /branches] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch branches")


# ── GET /branches/{id} ────────────────────────────────────────
@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch_by_id(branch_id: int, db: Session = Depends(get_db)):
    """Fetch a single branch by ID."""
    try:
        result = _call_sp(db, "GETBYID", branch_id=branch_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Branch with ID {branch_id} not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /branches/{branch_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch branch")


# ── POST /branches/ ───────────────────────────────────────────
@router.post("/", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(payload: BranchCreate, db: Session = Depends(get_db)):
    """Create a new branch. BranchCode is auto-generated (BR-001 format)."""
    try:
        result = _call_sp(
            db, "INSERT",
            name=payload.name,
            hospital_id=payload.hospitalId,
            branch_type=payload.branchType,
            address1=payload.address1,
            address2=payload.address2,
            country=payload.country,
            state=payload.state,
            city=payload.city,
            postal_code=payload.postalCode,
            contact_number=payload.contactNumber,
            email=payload.email,
            branch_manager=payload.branchManager,
            working_hours=payload.workingHours,
            emergency_available=payload.emergencyAvailable.value,
            number_of_floors=payload.numberOfFloors,
            number_of_beds=payload.numberOfBeds,
            status=payload.status.value,
            remarks=payload.remarks,
        )
        row = result.fetchone()
        new_id = row.BranchId
        db.commit()

        # Fetch and return the created record (with JOIN for HospitalName)
        fetch = _call_sp(db, "GETBYID", branch_id=new_id)
        created = fetch.fetchone()
        return _map_row(created)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /branches] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create branch: {str(e)}")


# ── PUT /branches/{id} ────────────────────────────────────────
@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(branch_id: int, payload: BranchUpdate, db: Session = Depends(get_db)):
    """Update an existing branch. BranchCode is immutable."""
    try:
        _call_sp(
            db, "UPDATE",
            branch_id=branch_id,
            name=payload.name,
            hospital_id=payload.hospitalId,
            branch_type=payload.branchType,
            address1=payload.address1,
            address2=payload.address2,
            country=payload.country,
            state=payload.state,
            city=payload.city,
            postal_code=payload.postalCode,
            contact_number=payload.contactNumber,
            email=payload.email,
            branch_manager=payload.branchManager,
            working_hours=payload.workingHours,
            emergency_available=payload.emergencyAvailable.value,
            number_of_floors=payload.numberOfFloors,
            number_of_beds=payload.numberOfBeds,
            status=payload.status.value,
            remarks=payload.remarks,
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", branch_id=branch_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Branch with ID {branch_id} not found")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /branches/{branch_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update branch: {str(e)}")


# ── DELETE /branches/{id} ─────────────────────────────────────
@router.delete("/{branch_id}", status_code=status.HTTP_200_OK)
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    """Soft delete a branch (IsDeleted=1, Status='Inactive')."""
    try:
        _call_sp(db, "DELETE", branch_id=branch_id)
        db.commit()
        return {"message": f"Branch {branch_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /branches/{branch_id}] Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete branch: {str(e)}")
