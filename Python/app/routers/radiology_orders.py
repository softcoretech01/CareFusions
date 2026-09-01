from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from app.database import get_db
from app.schemas.radiology import RadiologyOrderResponse, RadiologyTestUpdate, RadiologyOrderCreate
import uuid

router = APIRouter(
    prefix="/radiology/orders",
    tags=["Radiology Orders"]
)

@router.get("/migrate")
def migrate_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("ALTER TABLE hospital.Rad_OrderTest ADD COLUMN ResultSummary TEXT"))
        db.commit()
    except Exception:
        db.rollback()
    return {"status": "Migration attempted"}


# SpRadOrders takes 17 positional parameters. Every call site used to spell out
# its own run of NULLs, so when p_BodyPart was added at position 12 the counts
# silently went stale and SELECT_ALL started failing with "expected 17, got 16".
# Naming the parameters here means the next signature change is a one-line edit
# instead of counting commas at three call sites.
SP_RAD_PARAMS = [
    "action", "order_id", "order_test_id", "order_number", "visit_type",
    "uhid", "patient_name", "ordered_by", "test_id", "test_code", "test_name",
    "body_part", "result_value", "result_file", "is_critical", "status",
    "user_id",
]

SP_RAD_CALL = text(
    "CALL hospital.SpRadOrders(" + ", ".join(f":{n}" for n in SP_RAD_PARAMS) + ")"
)


def _col(row, name):
    """Read a column the SP may or may not return; missing means None.

    Rad_Order has no Age/Gender/MobileNumber columns at all, and SELECT_ALL
    currently omits AcknowledgedAt/AcknowledgedBy even though Rad_OrderTest
    stores them. Reading them positionally turned that mismatch into a 500.
    """
    return row._mapping.get(name)


def _call_sp(db: Session, action: str, **kwargs):
    """Invoke SpRadOrders with every parameter bound, defaulting to NULL."""
    unknown = set(kwargs) - set(SP_RAD_PARAMS)
    if unknown:
        raise ValueError(f"unknown SpRadOrders parameter(s): {sorted(unknown)}")
    params = {name: None for name in SP_RAD_PARAMS}
    params["action"] = action
    params.update(kwargs)
    return db.execute(SP_RAD_CALL, params)


@router.get("", response_model=List[RadiologyOrderResponse])
def get_radiology_orders(db: Session = Depends(get_db)):
    try:
        result = _call_sp(db, "SELECT_ALL").fetchall()
        
        # Fetch ResultSummary directly
        summary_rows = []
        try:
            summary_rows = db.execute(text("SELECT OrderTestId, ResultSummary FROM hospital.Rad_OrderTest")).fetchall()
        except Exception:
            pass
        summary_map = {r.OrderTestId: getattr(r, 'ResultSummary', None) for r in summary_rows}

        orders_dict = {}
        for row in result:
            order_id = row.OrderId
            if order_id not in orders_dict:
                orders_dict[order_id] = {
                    "order_id": order_id,
                    "order_number": row.OrderNumber,
                    "category": row.Category,
                    "visit_type": row.VisitType,
                    "uhid": row.Uhid,
                    "patient_name": row.PatientName,
                    "ordered_by": row.OrderedBy,
                    "ordered_at": row.OrderedAt,
                    "status": row.OrderStatus,
                    "age": str(_col(row, "Age")) if _col(row, "Age") is not None else None,
                    "gender": _col(row, "Gender"),
                    "mobile_number": _col(row, "MobileNumber"),
                    "tests": []
                }
            
            if row.OrderTestId:
                orders_dict[order_id]["tests"].append({
                    "order_test_id": row.OrderTestId,
                    "test_id": row.TestId,
                    "test_code": row.TestCode,
                    "test_name": row.TestName,
                    "body_part": _col(row, "BodyPart"),
                    "status": row.TestStatus,
                    "result_value": row.ResultValue,
                    "result_file": row.ResultFile,
                    "result_summary": summary_map.get(row.OrderTestId),
                    "is_critical": bool(row.IsCritical),
                    "completed_at": row.CompletedAt,
                    "verified_at": row.VerifiedAt,
                    "verified_by": row.VerifiedBy,
                    "acknowledged_at": _col(row, "AcknowledgedAt"),
                    "acknowledged_by": _col(row, "AcknowledgedBy")
                })
        
        return list(orders_dict.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=Dict[str, Any])
def create_radiology_order(order_data: RadiologyOrderCreate, db: Session = Depends(get_db)):
    try:
        order_number = f"RAD-{str(uuid.uuid4())[:8].upper()}"
        
        query = text("""
            INSERT INTO hospital.Rad_Order (OrderNumber, Category, VisitType, Uhid, PatientName, OrderedBy, CreatedBy)
            VALUES (:order_number, :category, :visit_type, :uhid, :patient_name, :ordered_by, 'Admin')
        """)
        
        db.execute(query, {
            "order_number": order_number,
            "category": order_data.category,
            "visit_type": order_data.visit_type,
            "uhid": order_data.uhid,
            "patient_name": order_data.patient_name,
            "ordered_by": order_data.ordered_by
        })
        
        order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        
        for test in order_data.tests:
            test_query = text("""
                INSERT INTO hospital.Rad_OrderTest (OrderId, TestCode, TestName, BodyPart, Status)
                VALUES (:order_id, :test_code, :test_name, :body_part, 'Pending')
            """)
            db.execute(test_query, {
                "order_id": order_id,
                "test_code": test.testCode or test.testName,
                "test_name": test.testName,
                "body_part": test.body_part
            })
            
        db.commit()
        return {"order_id": order_id, "order_number": order_number, "message": "Order created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/tests/{test_id}")
def update_radiology_test(order_id: int, test_id: str, test_data: RadiologyTestUpdate, db: Session = Depends(get_db)):
    try:
        # Note: the test_id from frontend is mapped to order_test_id in the DB.
        # But wait, frontend test.id is usually a string like "TEST-001" or the order_test_id.
        # We will assume test_id passed here is order_test_id.
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)
        
        result = _call_sp(
            db, "UPDATE_RESULT",
            order_id=order_id,
            order_test_id=order_test_id_int,
            result_value=test_data.result_value,
            result_file=test_data.result_file,
            is_critical=1 if test_data.is_critical else 0,
            user_id="Admin",
        ).fetchone()
        
        try:
            if test_data.result_summary is not None:
                db.execute(text("UPDATE hospital.Rad_OrderTest SET ResultSummary = :rs WHERE OrderTestId = :id"), 
                           {"rs": test_data.result_summary, "id": order_test_id_int})
        except Exception as ex:
            pass
        
        db.commit()
        
        return {"message": "Test updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tests/{test_id}/acknowledge")
def acknowledge_radiology_alert(test_id: str, db: Session = Depends(get_db)):
    try:
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)
        
        _call_sp(
            db, "ACKNOWLEDGE_ALERT",
            order_test_id=order_test_id_int,
            user_id="Admin",
        )
        db.commit()
        
        return {"message": "Alert acknowledged successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
