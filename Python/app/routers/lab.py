"""Laboratory / Investigations API.

Backed by hospital.SpLabOrder, hospital.SpLabOrderDerive and hospital.SpLabQc.
The test catalogue lives in admin.Master_LabTest; orders, results and QC logs
live in the hospital schema. Lab and Radiology share these tables, separated by
the Category column, mirroring the frontend's shared InvestigationContext.
"""
import json
import logging
import re
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.lab import (
    OrderCreate, TestStatusUpdate, TestResultUpdate, VerifyIn, AckIn, QcCreate,
)
from app.routers.services import create_service_order_internal
from app.routers._service_clearance import blocked_order_numbers
from app.schemas.services import ServiceOrderCreate, ServiceOrderItemCreate, OrderTypeEnum, SourceModuleEnum

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/lab", tags=["Laboratory"])

_ORDER_CALL = (
    "CALL hospital.SpLabOrder(:p_Opt, :p_OrderId, :p_OrderTestId, :p_Category, :p_VisitType, "
    ":p_Uhid, :p_PatientName, :p_OrderedBy, :p_Priority, :p_ClinicalNotes, :p_Status, "
    ":p_ResultValue, :p_ResultFile, :p_IsAbnormal, :p_IsCritical, :p_Tests, "
    ":p_FromDate, :p_ToDate, :p_User)"
)

_QC_CALL = (
    "CALL hospital.SpLabQc(:p_Opt, :p_Category, :p_QcDate, :p_MachineName, :p_TestName, "
    ":p_ExpectedValue, :p_ActualValue, :p_Remarks, :p_User)"
)


def _order_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt": opt, "p_OrderId": None, "p_OrderTestId": None, "p_Category": None,
        "p_VisitType": None, "p_Uhid": None, "p_PatientName": None, "p_OrderedBy": None,
        "p_Priority": None, "p_ClinicalNotes": None, "p_Status": None, "p_ResultValue": None,
        "p_ResultFile": None, "p_IsAbnormal": None, "p_IsCritical": None, "p_Tests": None,
        "p_FromDate": None, "p_ToDate": None, "p_User": None,
    }
    params.update({f"p_{k}": v for k, v in kw.items()})
    return db.execute(text(_ORDER_CALL), params)


def _qc_sp(db: Session, opt: str, **kw):
    params = {
        "p_Opt": opt, "p_Category": None, "p_QcDate": None, "p_MachineName": None,
        "p_TestName": None, "p_ExpectedValue": None, "p_ActualValue": None,
        "p_Remarks": None, "p_User": None,
    }
    params.update({f"p_{k}": v for k, v in kw.items()})
    return db.execute(text(_QC_CALL), params)


# ── Result interpretation ────────────────────────────────────
def parse_range(normal_range: Optional[str]) -> Optional[Tuple[float, float]]:
    """Parse a master NormalRange string into (low, high).

    Handles the formats actually used by the test master, e.g. "12.0 - 15.5",
    "70-100", "< 200", "> 5". Returns None when the range is absent or is
    free text that cannot be interpreted numerically.
    """
    if not normal_range:
        return None
    s = normal_range.strip()
    m = re.match(r"^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$", s)
    if m:
        return float(m.group(1)), float(m.group(2))
    m = re.match(r"^<=?\s*(-?\d+(?:\.\d+)?)$", s)
    if m:
        return float("-inf"), float(m.group(1))
    m = re.match(r"^>=?\s*(-?\d+(?:\.\d+)?)$", s)
    if m:
        return float(m.group(1)), float("inf")
    return None


def interpret(result_value: Optional[str], normal_range: Optional[str],
              critical_alert: bool) -> Tuple[int, int]:
    """Return (isAbnormal, isCritical) for a result.

    A result is abnormal when it falls outside the test's own reference range;
    it is critical when it is abnormal AND the test master flags it as a
    critical-value test. This replaces the frontend's hardcoded
    "numeric value <7 or >18 is critical" rule, which ignored the test.
    """
    if result_value is None or str(result_value).strip() == "":
        return 0, 0
    try:
        value = float(str(result_value).strip())
    except ValueError:
        return 0, 0  # qualitative results ("Negative", "Normal") aren't flagged
    rng = parse_range(normal_range)
    if not rng:
        return 0, 0
    low, high = rng
    abnormal = value < low or value > high
    return (1 if abnormal else 0, 1 if (abnormal and critical_alert) else 0)


# ── Row mappers ──────────────────────────────────────────────
def _iso(v):
    return v.isoformat() if v else None


def _map_test(r) -> dict:
    return {
        "id": str(r.OrderTestId),
        "testId": r.TestId,
        "testCode": r.TestCode or "",
        "name": r.TestName,
        "bodyPart": getattr(r, 'BodyPart', ""),
        "status": r.Status,
        "resultValue": r.ResultValue or "",
        "resultFile": r.ResultFile or "",
        "resultSummary": getattr(r, 'ResultSummary', ""),
        "normalRange": r.NormalRange or "",
        "unit": r.Unit or "",
        "isAbnormal": bool(r.IsAbnormal),
        "isCritical": bool(r.IsCritical),
        "collectedAt": _iso(r.CollectedAt),
        "acceptedAt": _iso(r.AcceptedAt),
        "completedAt": _iso(r.CompletedAt),
        "verifiedAt": _iso(r.VerifiedAt),
        "verifiedBy": r.VerifiedBy or "",
        "acknowledgedAt": _iso(r.AcknowledgedAt),
        "acknowledgedBy": r.AcknowledgedBy or "",
    }


def _map_order(h, tests) -> dict:
    return {
        "id": h.OrderNumber,
        "orderId": h.OrderId,
        "category": h.Category,
        "type": h.VisitType,
        "patientId": h.Uhid,
        "patientName": h.PatientName,
        "orderedBy": h.OrderedBy or "",
        "orderedAt": _iso(h.OrderedAt),
        "priority": h.Priority,
        "clinicalNotes": h.ClinicalNotes or "",
        "status": h.Status,
        "tests": tests,
    }


# ══════════════════════════ TEST CATALOGUE ══════════════════════════
@router.get("/tests")
def list_catalogue(db: Session = Depends(get_db)):
    """Active tests from the master, for the order picker."""
    try:
        rows = db.execute(text(
            "SELECT TestId, TestCode, TestName, TestCategory, Department, SampleType, "
            "NormalRange, Unit, TurnaroundTime, TestPrice, CriticalValueAlert "
            "FROM admin.Master_LabTest WHERE IsDeleted = 0 AND Status = 'Active' ORDER BY TestName"
        )).fetchall()
        return [{
            "testId": r.TestId, "testCode": r.TestCode, "testName": r.TestName,
            "category": r.TestCategory, "department": r.Department, "sampleType": r.SampleType,
            "normalRange": r.NormalRange or "", "unit": r.Unit or "",
            "turnaroundTime": r.TurnaroundTime or "",
            "price": float(r.TestPrice or 0), "criticalValueAlert": bool(r.CriticalValueAlert),
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /lab/tests] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch test catalogue")


# ══════════════════════════ ORDERS ══════════════════════════
@router.get("/orders")
def list_orders(category: Optional[str] = None,
                uhid: Optional[str] = None,
                from_date: Optional[str] = Query(None, alias="from"),
                to_date: Optional[str] = Query(None, alias="to"),
                db: Session = Depends(get_db)):
    try:
        flt = {"Category": category, "Uhid": uhid, "FromDate": from_date, "ToDate": to_date}
        headers = _order_sp(db, "LIST", **flt).fetchall()
        lines = _order_sp(db, "LISTTESTS", **flt).fetchall()
        by_order: dict = {}
        for t in lines:
            by_order.setdefault(t.OrderId, []).append(_map_test(t))
        orders = [_map_order(h, by_order.get(h.OrderId, [])) for h in headers]

        # Hold back tests the PRO desk has not cleared. Completed work is exempt —
        # a finished test and its result belong on the worklist whatever the
        # billing state, and pulling them would lose results.
        blocked = blocked_order_numbers(db, "LAB")
        if blocked:
            orders = [
                o for o in orders
                if o["id"] not in blocked or str(o.get("status") or "").lower() == "completed"
            ]
        return orders
    except Exception as e:
        logger.error(f"[GET /lab/orders] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch orders")


@router.get("/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    try:
        h = _order_sp(db, "GETBYID", OrderId=order_id).fetchone()
        if not h:
            raise HTTPException(status_code=404, detail="Order not found")
        tests = [_map_test(t) for t in _order_sp(db, "TESTS", OrderId=order_id).fetchall()]
        
        # Merge ResultSummary since SP might not return it
        try:
            summary_rows = db.execute(text("SELECT OrderTestId, ResultSummary FROM hospital.Lab_OrderTest WHERE OrderId = :oid"), {"oid": order_id}).fetchall()
            summary_map = {str(r.OrderTestId): r.ResultSummary for r in summary_rows}
            for t in tests:
                if t["id"] in summary_map and summary_map[t["id"]]:
                    t["resultSummary"] = summary_map[t["id"]]
        except Exception:
            pass

        return _map_order(h, tests)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /lab/orders/{order_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch order")


@router.post("/orders", status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    tests_json = json.dumps([{
        "testId": t.testId, "testCode": t.testCode, "testName": t.testName,
        "bodyPart": t.bodyPart, "normalRange": t.normalRange, "unit": t.unit,
    } for t in payload.tests])
    ordered_by = payload.orderedBy
    if (not ordered_by or ordered_by.strip() in ("Doctor", "doctor")) and payload.uhid:
        adm_doc = db.execute(
            text("SELECT AdmittingDoctor FROM hospital.IPD_Admission WHERE Uhid = :uhid AND Status = 'Admitted' AND IsDeleted = 0 ORDER BY AdmissionId DESC LIMIT 1"),
            {"uhid": payload.uhid}
        ).scalar()
        if adm_doc and adm_doc.strip():
            ordered_by = adm_doc.strip()

    try:
        row = _order_sp(db, "CREATE",
                        Category=payload.category.value, VisitType=payload.visitType.value,
                        Uhid=payload.uhid, PatientName=payload.patientName,
                        OrderedBy=ordered_by, Priority=payload.priority.value,
                        ClinicalNotes=payload.clinicalNotes, Tests=tests_json,
                        User=payload.user or "Admin").fetchone()
        
        # Phase 3: Doctor Order Integration
        # Create corresponding Central Service Order
        service_items = []
        for t in payload.tests:
            # Fetch master price if available
            master_price = 0.0
            if t.testId or t.testName:
                master_row = db.execute(
                    text("SELECT TestPrice FROM admin.Master_LabTest WHERE (TestId = :tid OR TestName = :tname) AND IsDeleted = 0 LIMIT 1"),
                    {"tid": t.testId, "tname": t.testName}
                ).fetchone()
                if master_row and master_row.TestPrice:
                    master_price = float(master_row.TestPrice)
            
            service_items.append(
                ServiceOrderItemCreate(
                    ItemType="LAB",
                    ItemId=str(t.testId) if t.testId else t.testName,
                    ItemName=t.testName,
                    MasterPrice=master_price,
                    OriginalPrice=master_price, # Original defaults to master
                )
            )
            
        source_mod = SourceModuleEnum.OPD
        admission_id = None
        if payload.visitType.value == "IP": 
            source_mod = SourceModuleEnum.IPD
            # Try to fetch active AdmissionId for this UHID
            adm_row = db.execute(
                text("SELECT AdmissionId FROM hospital.IPD_Admission WHERE Uhid = :uhid AND Status = 'Admitted' AND IsDeleted = 0 ORDER BY AdmissionId DESC LIMIT 1"),
                {"uhid": payload.uhid}
            ).fetchone()
            if adm_row:
                admission_id = adm_row.AdmissionId
                
        elif payload.visitType.value == "ER": source_mod = SourceModuleEnum.EMERGENCY
        
        order_type = OrderTypeEnum.LAB
        if payload.category.value == "Radiology": order_type = OrderTypeEnum.RADIOLOGY
            
        svc_order = ServiceOrderCreate(
            OrderNo=row.OrderNumber,
            UHID=payload.uhid,
            AdmissionId=admission_id,
            OrderType=order_type,
            SourceModule=source_mod,
            Items=service_items
        )
        create_service_order_internal(db, svc_order)
        
        db.commit()
        return {"orderId": row.OrderId, "id": row.OrderNumber}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /lab/orders] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.patch("/orders/tests/{order_test_id}/status")
def set_test_status(order_test_id: int, payload: TestStatusUpdate, db: Session = Depends(get_db)):
    try:
        _order_sp(db, "SETSTATUS", OrderTestId=order_test_id,
                  Status=payload.status.value, User=payload.user or "Admin")
        db.commit()
        return {"orderTestId": order_test_id, "status": payload.status.value}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /lab/orders/tests/{order_test_id}/status] {e}")
        raise HTTPException(status_code=500, detail="Failed to update test status")


@router.put("/orders/tests/{order_test_id}/result")
def set_test_result(order_test_id: int, payload: TestResultUpdate, db: Session = Depends(get_db)):
    """Save a result. Abnormal/critical flags are derived from the test's own
    reference range and the master's critical-value flag."""
    try:
        row = db.execute(text(
            # Ordered tests carry neither TestId nor NormalRange today - orders
            # are written with TestName only - so match the master by id when it
            # is there and by name otherwise, and take the range from the master
            # unless the order row overrides it (age/sex-specific ranges).
            # Without this the join misses, CriticalValueAlert reads 0, and no
            # result is ever flagged.
            "SELECT COALESCE(NULLIF(t.NormalRange, ''), m.NormalRange) AS NormalRange, "
            "       COALESCE(m.CriticalValueAlert, 0) AS CriticalValueAlert "
            "FROM hospital.Lab_OrderTest t "
            "LEFT JOIN admin.Master_LabTest m "
            "       ON (m.TestId = t.TestId OR (t.TestId IS NULL AND m.TestName = t.TestName)) "
            "      AND COALESCE(m.IsDeleted, 0) = 0 "
            "WHERE t.OrderTestId = :i LIMIT 1"
        ), {"i": order_test_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Ordered test not found")

        is_abnormal, is_critical = interpret(
            payload.resultValue, row.NormalRange, bool(row.CriticalValueAlert)
        )
        
        # Phase 8: Enforce Service Release
        release_query = text("""
            SELECT soi.ServiceStatus
            FROM hospital.Lab_Order h
            JOIN hospital.Service_Order so ON so.OrderNo = h.OrderNumber
            JOIN hospital.Lab_OrderTest t ON t.OrderId = h.OrderId
            JOIN hospital.Service_OrderItem soi ON soi.ServiceOrderId = so.ServiceOrderId 
                AND (soi.ItemName = t.TestName OR soi.ItemId = t.TestId)
            WHERE t.OrderTestId = :test_id
            LIMIT 1
        """)
        svc_status = db.execute(release_query, {"test_id": order_test_id}).scalar()
        if svc_status and svc_status != 'RELEASED':
            raise HTTPException(status_code=400, detail="This test cannot be executed because it has not passed financial clearance and Service Release.")
        
        _order_sp(db, "SETRESULT", OrderTestId=order_test_id,
                  ResultValue=payload.resultValue, ResultFile=payload.resultFile,
                  IsAbnormal=is_abnormal, IsCritical=is_critical,
                  User=payload.user or "Admin")
        
        # Phase 9: Write back completion state to Service_Order backbone
        db.execute(text("""
            UPDATE hospital.Service_OrderItem soi
            JOIN hospital.Service_Order so ON soi.ServiceOrderId = so.ServiceOrderId
            JOIN hospital.Lab_Order h ON so.OrderNo = h.OrderNumber
            JOIN hospital.Lab_OrderTest t ON t.OrderId = h.OrderId 
                AND (soi.ItemName = t.TestName OR soi.ItemId = t.TestId)
            SET soi.ServiceStatus = 'COMPLETED', soi.UpdatedAt = NOW()
            WHERE t.OrderTestId = :test_id
        """), {"test_id": order_test_id})
        
        # Check if all items in the parent order are now completed
        check_all_completed = text("""
            SELECT COUNT(*) as pending_count, MAX(so.ServiceOrderId) as parent_id
            FROM hospital.Service_OrderItem soi
            JOIN hospital.Lab_Order h ON so.OrderNo = h.OrderNumber
            JOIN hospital.Service_Order so ON so.OrderNo = h.OrderNumber
            JOIN hospital.Lab_OrderTest t ON t.OrderId = h.OrderId
            WHERE t.OrderTestId = :test_id AND soi.ServiceOrderId = so.ServiceOrderId
            AND soi.ServiceStatus != 'COMPLETED' AND soi.IsDeleted = 0
        """)
        pending_res = db.execute(check_all_completed, {"test_id": order_test_id}).fetchone()
        
        if pending_res and pending_res.pending_count == 0 and pending_res.parent_id:
            db.execute(text("""
                UPDATE hospital.Service_Order 
                SET ServiceStatus = 'COMPLETED', OrderStatus = 'COMPLETED', UpdatedAt = NOW()
                WHERE ServiceOrderId = :parent_id
            """), {"parent_id": pending_res.parent_id})
        
        try:
            if payload.resultSummary is not None:
                db.execute(text("UPDATE hospital.Lab_OrderTest SET ResultSummary = :rs WHERE OrderTestId = :id"), 
                           {"rs": payload.resultSummary, "id": order_test_id})
        except Exception as ex:
            logger.error(f"Failed to save result summary: {ex}")
            
        db.commit()
        return {"orderTestId": order_test_id, "isAbnormal": bool(is_abnormal),
                "isCritical": bool(is_critical)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /lab/orders/tests/{order_test_id}/result] {e}")
        raise HTTPException(status_code=500, detail="Failed to save result")


@router.post("/orders/tests/{order_test_id}/verify")
def verify_test(order_test_id: int, payload: VerifyIn, db: Session = Depends(get_db)):
    try:
        _order_sp(db, "VERIFY", OrderTestId=order_test_id, User=payload.verifiedBy)
        db.commit()
        return {"orderTestId": order_test_id, "status": "Verified"}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /lab/orders/tests/{order_test_id}/verify] {e}")
        raise HTTPException(status_code=500, detail="Failed to verify test")


@router.post("/orders/tests/{order_test_id}/acknowledge")
def acknowledge_alert(order_test_id: int, payload: AckIn, db: Session = Depends(get_db)):
    try:
        _order_sp(db, "ACK", OrderTestId=order_test_id, User=payload.acknowledgedBy or "Admin")
        db.commit()
        return {"orderTestId": order_test_id, "acknowledged": True}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /lab/orders/tests/{order_test_id}/acknowledge] {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


@router.delete("/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    try:
        _order_sp(db, "DELETE", OrderId=order_id)
        db.commit()
        return {"message": "Order deleted"}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /lab/orders/{order_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete order")


# ══════════════════════════ QUALITY CONTROL ══════════════════════════
@router.get("/qc")
def list_qc(category: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        rows = _qc_sp(db, "LIST", Category=category).fetchall()
        return [{
            "id": r.QcNumber, "qcId": r.QcId, "category": r.Category,
            "date": r.QcDate.isoformat() if r.QcDate else "",
            "machineName": r.MachineName, "testName": r.TestName,
            "expectedValue": str(r.ExpectedValue), "actualValue": str(r.ActualValue),
            "deviation": f"+{r.Deviation}" if r.Deviation > 0 else str(r.Deviation),
            "status": r.Status, "remarks": r.Remarks or "", "runBy": r.RunBy or "",
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /lab/qc] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch QC logs")


@router.post("/qc", status_code=201)
def create_qc(payload: QcCreate, db: Session = Depends(get_db)):
    try:
        row = _qc_sp(db, "INSERT", Category=payload.category.value, QcDate=payload.qcDate,
                     MachineName=payload.machineName, TestName=payload.testName,
                     ExpectedValue=payload.expectedValue, ActualValue=payload.actualValue,
                     Remarks=payload.remarks, User=payload.user or "Admin").fetchone()
        db.commit()
        return {"id": row.QcNumber, "qcId": row.QcId, "status": row.Status,
                "deviation": str(row.Deviation)}
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /lab/qc] {e}")
        raise HTTPException(status_code=500, detail="Failed to save QC log")
