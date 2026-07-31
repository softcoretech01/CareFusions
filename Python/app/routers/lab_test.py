from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.lab_test import (
    LabTestCreate,
    LabTestUpdate,
    LabTestResponse,
    LookupResponse,
)

router = APIRouter(prefix="/tests", tags=["Laboratory Test Master"])
logger = logging.getLogger(__name__)

SP_NAME = "SpMasterLabTest"


def safe_value(val):
    if val == "" or val is None:
        return None
    return val


def _map_row(row) -> dict:
    return {
        "id":                 row.TestId,
        "testCode":           row.TestCode,
        "testName":           row.TestName,
        "testCategory":       row.TestCategory,
        "department":         row.Department,
        "sampleType":         row.SampleType,
        "description":        row.Description,
        "normalRange":        row.NormalRange,
        "unit":               row.Unit,
        "testMethod":         row.TestMethod,
        "turnaroundTime":     row.TurnaroundTime,
        "testPrice":          float(row.TestPrice) if row.TestPrice is not None else 0.0,
        "gst":                float(row.Gst) if row.Gst is not None else 0.0,
        "reportTemplate":     row.ReportTemplate,
        "requiresApproval":   bool(row.RequiresApproval),
        "criticalValueAlert": bool(row.CriticalValueAlert),
        "status":             row.Status,
        "remarks":            row.Remarks,
        "createdBy":          row.CreatedBy,
        "createdDate":        row.CreatedDate,
        "modifiedBy":         row.ModifiedBy,
        "modifiedDate":       row.ModifiedDate,
    }


def _call_sp(db: Session, opt: str, test_id: int = 0, **kwargs):
    params = {
        "p_Opt":                opt,
        "p_TestId":             test_id,
        "p_TestCode":           safe_value(kwargs.get("test_code")),
        "p_TestName":           safe_value(kwargs.get("test_name")),
        "p_TestCategory":       safe_value(kwargs.get("test_category")),
        "p_Department":         safe_value(kwargs.get("department")),
        "p_SampleType":         safe_value(kwargs.get("sample_type")),
        "p_Description":        safe_value(kwargs.get("description")),
        "p_NormalRange":        safe_value(kwargs.get("normal_range")),
        "p_Unit":               safe_value(kwargs.get("unit")),
        "p_TestMethod":         safe_value(kwargs.get("test_method")),
        "p_TurnaroundTime":     safe_value(kwargs.get("turnaround_time")),
        "p_TestPrice":          safe_value(kwargs.get("test_price")),
        "p_Gst":                safe_value(kwargs.get("gst")),
        "p_ReportTemplate":     safe_value(kwargs.get("report_template")),
        "p_RequiresApproval":   1 if kwargs.get("requires_approval") else 0,
        "p_CriticalValueAlert": 1 if kwargs.get("critical_value_alert") else 0,
        "p_Status":             safe_value(kwargs.get("status")),
        "p_Remarks":            safe_value(kwargs.get("remarks")),
        "p_CreatedBy":          safe_value(kwargs.get("created_by")),
        "p_ModifiedBy":         safe_value(kwargs.get("modified_by")),
        "p_Search":             safe_value(kwargs.get("search")),
    }

    sql = text(f"""
        CALL {SP_NAME}(
            :p_Opt, :p_TestId,
            :p_TestCode, :p_TestName, :p_TestCategory, :p_Department, :p_SampleType,
            :p_Description, :p_NormalRange, :p_Unit, :p_TestMethod, :p_TurnaroundTime,
            :p_TestPrice, :p_Gst, :p_ReportTemplate, :p_RequiresApproval, :p_CriticalValueAlert,
            :p_Status, :p_Remarks,
            :p_CreatedBy, :p_ModifiedBy, :p_Search
        )
    """)
    return db.execute(sql, params)


# ─── LOOKUPS ──────────────────────────────────────────────────────────────────
@router.get("/categories", response_model=List[LookupResponse])
def get_categories(db: Session = Depends(get_db)):
    sql = text("SELECT CategoryId AS id, CategoryName AS name FROM Master_LabTestCategory")
    result = db.execute(sql)
    return [dict(r._mapping) for r in result]


@router.get("/sample-types", response_model=List[LookupResponse])
def get_sample_types(db: Session = Depends(get_db)):
    sql = text("SELECT SampleTypeId AS id, SampleTypeName AS name FROM Master_SampleType")
    result = db.execute(sql)
    return [dict(r._mapping) for r in result]


@router.get("/departments", response_model=List[LookupResponse])
def get_departments(db: Session = Depends(get_db)):
    sql = text("SELECT DepartmentId AS id, DepartmentName AS name FROM Master_Department")
    result = db.execute(sql)
    return [dict(r._mapping) for r in result]


# ─── GET ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[LabTestResponse])
def get_all(search: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        opt = "SEARCH" if search else "GET"
        result = _call_sp(db, opt, search=search)
        return [_map_row(r) for r in result.fetchall()]
    except Exception as e:
        logger.error(f"[GET /tests] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── GET BY ID ────────────────────────────────────────────────────────────────
@router.get("/{test_id}", response_model=LabTestResponse)
def get_by_id(test_id: int, db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "GETBYID", test_id=test_id)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Lab Test not found")
        return _map_row(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /tests/{test_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── CREATE ───────────────────────────────────────────────────────────────────
@router.post("/", response_model=LabTestResponse, status_code=status.HTTP_201_CREATED)
def create(test: LabTestCreate, db: Session = Depends(get_db)):
    try:
        d = test.model_dump()
        result = _call_sp(db, "INSERT",
            test_code=d["testCode"],
            test_name=d["testName"],
            test_category=d["testCategory"],
            department=d["department"],
            sample_type=d["sampleType"],
            description=d["description"],
            normal_range=d["normalRange"],
            unit=d["unit"],
            test_method=d["testMethod"],
            turnaround_time=d["turnaroundTime"],
            test_price=d["testPrice"],
            gst=d["gst"],
            report_template=d["reportTemplate"],
            requires_approval=d["requiresApproval"],
            critical_value_alert=d["criticalValueAlert"],
            status=d["status"],
            remarks=d["remarks"],
            created_by=d["createdBy"],
        )
        row = result.fetchone()
        new_id = row.TestId
        db.commit()

        fetch = _call_sp(db, "GETBYID", test_id=new_id)
        return _map_row(fetch.fetchone())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /tests] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Test Code or Name already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UPDATE ───────────────────────────────────────────────────────────────────
@router.put("/{test_id}", response_model=LabTestResponse)
def update(test_id: int, test: LabTestUpdate, db: Session = Depends(get_db)):
    try:
        d = test.model_dump()
        _call_sp(db, "UPDATE",
            test_id=test_id,
            test_code=d["testCode"],
            test_name=d["testName"],
            test_category=d["testCategory"],
            department=d["department"],
            sample_type=d["sampleType"],
            description=d["description"],
            normal_range=d["normalRange"],
            unit=d["unit"],
            test_method=d["testMethod"],
            turnaround_time=d["turnaroundTime"],
            test_price=d["testPrice"],
            gst=d["gst"],
            report_template=d["reportTemplate"],
            requires_approval=d["requiresApproval"],
            critical_value_alert=d["criticalValueAlert"],
            status=d["status"],
            remarks=d["remarks"],
            modified_by=d["modifiedBy"],
        )
        db.commit()

        fetch = _call_sp(db, "GETBYID", test_id=test_id)
        updated = fetch.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Lab Test not found after update")
        return _map_row(updated)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /tests/{test_id}] {e}")
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Test Code or Name already exists.")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DELETE ───────────────────────────────────────────────────────────────────
@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(test_id: int, db: Session = Depends(get_db)):
    try:
        fetch = _call_sp(db, "GETBYID", test_id=test_id)
        if not fetch.fetchone():
            raise HTTPException(status_code=404, detail="Lab Test not found")
        _call_sp(db, "DELETE", test_id=test_id, modified_by="System")
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /tests/{test_id}] {e}")
        raise HTTPException(status_code=500, detail=str(e))
