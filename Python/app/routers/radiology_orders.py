from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from app.database import get_db
from app.schemas.radiology import RadiologyOrderResponse, RadiologyTestUpdate, RadiologyOrderCreate
import uuid
from app.core import workflow_gate as gate
from app.core.rbac import Actor, require_roles
from app.routers.services import create_service_order_internal
from app.routers._service_clearance import blocked_order_numbers
from app.routers import _order_dedupe as dedupe
from app.schemas.services import ServiceOrderCreate, ServiceOrderItemCreate, OrderTypeEnum, SourceModuleEnum

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
        
        # Mark scans the PRO desk has not cleared with is_blocked. Completed work is exempt —
        # a finished scan and its report belong on the worklist whatever the billing state.
        blocked = blocked_order_numbers(db, "RADIOLOGY")
        if blocked:
            for o in orders_dict.values():
                o["is_blocked"] = o["order_number"] in blocked and str(o.get("status") or "").lower() != "completed"
        else:
            for o in orders_dict.values():
                o["is_blocked"] = False

        return list(orders_dict.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=Dict[str, Any])
def create_radiology_order(order_data: RadiologyOrderCreate, db: Session = Depends(get_db)):
    try:
        # Same rule as the lab: a scan already on today's order for this patient
        # is not raised again. Re-submitting the visit's list (which is what a
        # second "Update EMR" click does) had been creating a duplicate scan,
        # a duplicate service order and a duplicate PRO review row every time.
        def get_display_name(t):
            b_part = t.body_part or t.bodyPart or ""
            return f"{t.testName} - {b_part}" if b_part and b_part.lower() not in t.testName.lower() else t.testName

        fresh, repeats = dedupe.split_new_tests(
            db, order_table="Rad_Order", test_table="Rad_OrderTest",
            uhid=order_data.uhid, tests=order_data.tests,
            name_of=get_display_name)

        if not fresh:
            existing = dedupe.existing_order_for(
                db, order_table="Rad_Order", test_table="Rad_OrderTest",
                uhid=order_data.uhid,
                test_names=[t.testName for t in order_data.tests])
            return {
                "order_id": existing.OrderId if existing else None,
                "order_number": existing.OrderNumber if existing else None,
                "duplicate": True,
                "skipped_tests": [get_display_name(t) for t in repeats],
                "message": "These scans are already on today's order for this patient.",
            }

        order_number = f"RAD-{str(uuid.uuid4())[:8].upper()}"
        
        ordered_by = order_data.ordered_by
        if (not ordered_by or ordered_by.strip() in ("Doctor", "doctor")) and order_data.uhid:
            adm_doc = db.execute(
                text("SELECT AdmittingDoctor FROM hospital.IPD_Admission WHERE Uhid = :uhid AND Status = 'Admitted' AND IsDeleted = 0 ORDER BY AdmissionId DESC LIMIT 1"),
                {"uhid": order_data.uhid}
            ).scalar()
            if adm_doc and adm_doc.strip():
                ordered_by = adm_doc.strip()

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
            "ordered_by": ordered_by
        })
        
        order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        
        service_items = []
        for test in fresh:
            t_id = test.testId if test.testId is not None else test.test_id
            t_code = test.testCode or test.test_code or test.testName
            b_part = test.body_part or test.bodyPart or ""
            display_name = get_display_name(test)
            
            test_query = text("""
                INSERT INTO hospital.Rad_OrderTest (OrderId, TestCode, TestName, BodyPart, Status)
                VALUES (:order_id, :test_code, :test_name, :body_part, 'Pending')
            """)
            db.execute(test_query, {
                "order_id": order_id,
                "test_code": t_code,
                "test_name": display_name,
                "body_part": b_part
            })
            
            # Fetch master price if available
            master_price = 0.0
            if t_id or test.testName:
                master_row = db.execute(
                    text("SELECT ServicePrice FROM admin.Master_RadiologyService WHERE (RadiologyServiceId = :tid OR ServiceName = :tname) AND IsDeleted = 0 LIMIT 1"),
                    {"tid": t_id, "tname": test.testName}
                ).fetchone()
                if master_row and master_row.ServicePrice:
                    master_price = float(master_row.ServicePrice)

            service_items.append(
                ServiceOrderItemCreate(
                    ItemType="RADIOLOGY",
                    ItemId=str(t_id) if t_id is not None else test.testName,
                    ItemName=display_name,
                    MasterPrice=master_price,
                    OriginalPrice=master_price, # Original defaults to master
                )
            )

        source_mod = SourceModuleEnum.OPD
        admission_id = None
        if order_data.visit_type == "IP": 
            source_mod = SourceModuleEnum.IPD
            adm_row = db.execute(
                text("SELECT AdmissionId FROM hospital.IPD_Admission WHERE Uhid = :uhid AND Status = 'Admitted' AND IsDeleted = 0 ORDER BY AdmissionId DESC LIMIT 1"),
                {"uhid": order_data.uhid}
            ).fetchone()
            if adm_row:
                admission_id = adm_row.AdmissionId
                
        elif order_data.visit_type == "ER": source_mod = SourceModuleEnum.EMERGENCY
            
        svc_order = ServiceOrderCreate(
            OrderNo=order_number,
            UHID=order_data.uhid,
            AdmissionId=admission_id,
            OrderType=OrderTypeEnum.RADIOLOGY,
            SourceModule=source_mod,
            Items=service_items
        )
        create_service_order_internal(db, svc_order, order_data.order_group_no)
            
        db.commit()
        return {"order_id": order_id, "order_number": order_number,
                "duplicate": False,
                "skipped_tests": [get_display_name(t) for t in repeats],
                "message": "Order created successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}/tests/{test_id}")
def update_radiology_test(
    order_id: int,
    test_id: str,
    test_data: RadiologyTestUpdate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("RADIOLOGY")),
):
    """Record a radiology result. Refused unless the study has been released.

    The gate here used to be an inline query checked as
    ``if svc_status and svc_status != 'RELEASED'``. When the join matched
    nothing -- which is the case for 15 of the 16 radiology orders in this
    database, because they have no Service_Order behind them at all -- the
    result was None, the condition was false, and the scan was reported with no
    PRO approval, no advance bill and no payment.

    ``gate.assert_rad_test_executable`` is fail-closed: an order it cannot
    resolve to a service order is refused, and a status column saying RELEASED
    is not enough on its own -- there has to be a live Service_Release row, so a
    release revoked when a payment was reversed actually stops the work.
    """
    try:
        order_test_id_int = int(test_id.replace("TEST-", "")) if isinstance(test_id, str) and test_id.startswith("TEST-") else int(test_id)

        gate.assert_rad_test_executable(
            db, order_test_id_int, action="record this radiology result")

        result = _call_sp(
            db, "UPDATE_RESULT",
            order_id=order_id,
            order_test_id=order_test_id_int,
            result_value=test_data.result_value,
            result_file=test_data.result_file,
            is_critical=1 if test_data.is_critical else 0,
            user_id="Admin",
        ).fetchone()
        
        # Phase 9: Write back completion state to Service_Order backbone
        db.execute(text("""
            UPDATE hospital.Service_OrderItem soi
            JOIN hospital.Service_Order so ON soi.ServiceOrderId = so.ServiceOrderId
            JOIN hospital.Rad_Order h ON so.OrderNo = h.OrderNumber
            JOIN hospital.Rad_OrderTest t ON t.OrderId = h.OrderId 
                AND (soi.ItemName = t.TestName OR soi.ItemId = t.TestId)
            SET soi.ServiceStatus = 'COMPLETED', soi.UpdatedAt = NOW()
            WHERE t.OrderTestId = :test_id
        """), {"test_id": order_test_id_int})
        
        # Check if all items in the parent order are now completed
        # Same shape as the lab query, and the same parent_id bug: MAX(...) under
        # a WHERE that keeps only NOT-completed items returns NULL exactly when
        # the last item completes, so the order was never marked COMPLETED.
        check_all_completed = text("""
            SELECT so.ServiceOrderId AS parent_id,
                   (SELECT COUNT(*) FROM hospital.Service_OrderItem x
                     WHERE x.ServiceOrderId = so.ServiceOrderId
                       AND x.IsDeleted = 0
                       AND x.ServiceStatus <> 'COMPLETED') AS pending_count
            FROM hospital.Rad_OrderTest t
            JOIN hospital.Rad_Order h  ON h.OrderId = t.OrderId
            JOIN hospital.Service_Order so ON so.OrderNo = h.OrderNumber
            WHERE t.OrderTestId = :test_id AND so.IsDeleted = 0
            LIMIT 1
        """)
        pending_res = db.execute(check_all_completed, {"test_id": order_test_id_int}).fetchone()
        
        if pending_res and pending_res.pending_count == 0 and pending_res.parent_id:
            db.execute(text("""
                UPDATE hospital.Service_Order 
                SET ServiceStatus = 'COMPLETED', OrderStatus = 'COMPLETED', UpdatedAt = NOW()
                WHERE ServiceOrderId = :parent_id
            """), {"parent_id": pending_res.parent_id})
        
        try:
            if test_data.result_summary is not None:
                db.execute(text("UPDATE hospital.Rad_OrderTest SET ResultSummary = :rs WHERE OrderTestId = :id"), 
                           {"rs": test_data.result_summary, "id": order_test_id_int})
        except Exception as ex:
            pass
        
        db.commit()
        
        return {"message": "Test updated successfully"}
    except HTTPException:
        # gate.ServiceNotReleased subclasses HTTPException. Without this branch
        # the blanket handler below turned a 403 "not released" refusal into an
        # opaque 500, so the technician was told the server had broken rather
        # than that the study was not cleared.
        db.rollback()
        raise
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
