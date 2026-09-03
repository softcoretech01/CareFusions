"""Service orders: the backbone every clinical service hangs off.

Two responsibilities:

* Creating orders. Workflow status is set HERE, never by the caller. The old
  endpoint took PROStatus / PaymentStatus / FinancialStatus / ServiceStatus /
  AuthorizationStatus straight out of the request body, so one POST could
  create an order that was already APPROVED, PAID, CLEARED and RELEASED at a
  price of zero -- skipping PRO, billing and payment entirely.
* Releasing items. ``POST /services/items/{id}/release`` is the only way an
  item becomes RELEASED by hand, and it runs the full
  ``can_release_service`` check first.
"""
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.rbac import Actor, require_roles
from ..core import workflow_gate as gate
from ..database import get_db
from ..schemas import services as service_schema

router = APIRouter(
    prefix="/services",
    tags=["Service Orders"]
)


# ══════════════════════════════════════════════════════════════════════════
# Creation
# ══════════════════════════════════════════════════════════════════════════

def create_service_order_internal(db: Session, order: service_schema.ServiceOrderCreate,
                                  order_group_no: Optional[str] = None) -> int:
    """Create a Service Order and its items without committing.

    Called by the Lab and Radiology order endpoints inside their own
    transaction, so a lab order and its service order are created together or
    not at all.

    ``order_group_no`` ties the orders raised by ONE clinical ordering event
    together. A doctor who ticks two lab tests and a scan and presses "Update
    EMR" once has made one decision, but it arrives here as two calls -- one
    Lab_Order, one Rad_Order -- and so becomes two service orders. Giving both
    the same group number lets the PRO desk review them as the single order they
    are, instead of three rows appearing for one click. It defaults to the
    order's own number, which makes an ungrouped order a group of one.

    Any workflow status on the passed-in object is ignored. A new order is
    always PENDING / UNPAID / NOT_CLEARED / NOT_RELEASED, and every amount
    except the master price starts at zero -- pricing is the PRO's decision, not
    the caller's.
    """
    db.execute(text("""
        INSERT INTO hospital.Service_Order (
            OrderNo, OrderGroupNo, UHID, EncounterId, AdmissionId, DoctorId, DepartmentId,
            OrderType, SourceModule, OrderStatus, PROStatus, PaymentStatus,
            FinancialStatus, ServiceStatus, AuthorizationStatus
        ) VALUES (
            :OrderNo, :OrderGroupNo, :UHID, :EncounterId, :AdmissionId, :DoctorId, :DepartmentId,
            :OrderType, :SourceModule, 'ACTIVE', 'PENDING', 'UNPAID',
            'NOT_CLEARED', 'NOT_RELEASED', 'NOT_REQUIRED'
        )
    """), {
        "OrderNo": order.OrderNo,
        "OrderGroupNo": (order_group_no or order.OrderNo)[:60],
        "UHID": order.UHID,
        "EncounterId": order.EncounterId,
        "AdmissionId": order.AdmissionId,
        "DoctorId": order.DoctorId,
        "DepartmentId": order.DepartmentId,
        "OrderType": order.OrderType.value if hasattr(order.OrderType, "value") else order.OrderType,
        "SourceModule": order.SourceModule.value if hasattr(order.SourceModule, "value") else order.SourceModule,
    })
    order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

    for item in order.Items:
        master_price = gate.money(item.MasterPrice)
        db.execute(text("""
            INSERT INTO hospital.Service_OrderItem (
                ServiceOrderId, ItemType, ItemId, ItemName, Quantity, UOM,
                MasterPrice, OriginalPrice, PROPrice, AuthorizedDiscount,
                GrossAmount, NetAmount, InsuranceCoveredAmount, PatientResponsibility,
                PROStatus, PaymentStatus, FinancialStatus, ServiceStatus, AuthorizationStatus
            ) VALUES (
                :ServiceOrderId, :ItemType, :ItemId, :ItemName, :Quantity, :UOM,
                :MasterPrice, :MasterPrice, 0.00, 0.00,
                0.00, 0.00, 0.00, 0.00,
                'PENDING', 'UNPAID', 'NOT_CLEARED', 'NOT_RELEASED', 'NOT_REQUIRED'
            )
        """), {
            "ServiceOrderId": order_id,
            "ItemType": item.ItemType,
            "ItemId": str(item.ItemId),
            "ItemName": item.ItemName,
            "Quantity": max(1, int(item.Quantity or 1)),
            "UOM": item.UOM,
            "MasterPrice": master_price,
        })

    return order_id


class ServiceOrderCreateRequest(BaseModel):
    """What a caller may actually specify when raising a service order.

    Deliberately excludes every workflow status. Those are the backend's to set.
    """
    OrderNo: str
    UHID: str
    EncounterId: Optional[int] = None
    AdmissionId: Optional[int] = None
    DoctorId: Optional[int] = None
    DepartmentId: Optional[int] = None
    OrderType: service_schema.OrderTypeEnum
    SourceModule: service_schema.SourceModuleEnum
    Items: List[service_schema.ServiceOrderItemCreate] = Field(min_length=1)


@router.post("/orders", response_model=service_schema.ServiceOrder, status_code=201)
def create_service_order(
    order: ServiceOrderCreateRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("DOCTOR", "PRO", "NURSE", "LAB", "RADIOLOGY", "IPD", "RECEPTION")),
):
    """Create a new Service Order. It starts PENDING and unpriced, always."""
    try:
        payload = service_schema.ServiceOrderCreate(
            **order.model_dump(exclude={"Items"}),
            Items=order.Items,
        )
        order_id = create_service_order_internal(db, payload)
        db.commit()
        return get_service_order(order_id, db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409,
                            detail=f"A service order with number '{order.OrderNo}' already exists.")
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create service order: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════
# Reads
# ══════════════════════════════════════════════════════════════════════════

@router.get("/orders/{order_id}", response_model=service_schema.ServiceOrder)
def get_service_order(order_id: int, db: Session = Depends(get_db)):
    order_row = db.execute(text(
        "SELECT * FROM hospital.Service_Order WHERE ServiceOrderId = :order_id AND IsDeleted = 0"
    ), {"order_id": order_id}).fetchone()

    if not order_row:
        raise HTTPException(status_code=404, detail="Service Order not found")

    items_rows = db.execute(text(
        "SELECT * FROM hospital.Service_OrderItem WHERE ServiceOrderId = :order_id AND IsDeleted = 0"
    ), {"order_id": order_id}).fetchall()

    order_dict = dict(order_row._mapping)
    order_dict['Items'] = [dict(item._mapping) for item in items_rows]

    # Releases were always returned empty, which made the API look like nothing
    # was ever released.
    for item in order_dict['Items']:
        releases = db.execute(text("""
            SELECT ServiceReleaseId, ServiceOrderItemId, ReleaseDate, ReleasedBy,
                   ReleaseStatus, ReleaseReason, IsDeleted, CreatedAt, UpdatedAt
            FROM hospital.Service_Release
            WHERE ServiceOrderItemId = :id
            ORDER BY ServiceReleaseId DESC
        """), {"id": item["ServiceOrderItemId"]}).fetchall()
        item['Releases'] = [dict(r._mapping) for r in releases]

    return order_dict


@router.get("/orders", response_model=List[service_schema.ServiceOrder])
def list_service_orders(limit: int = 50, db: Session = Depends(get_db)):
    orders_rows = db.execute(text(
        "SELECT * FROM hospital.Service_Order WHERE IsDeleted = 0 "
        "ORDER BY CreatedAt DESC LIMIT :limit"
    ), {"limit": max(1, min(limit, 500))}).fetchall()

    result_list = []
    for order_row in orders_rows:
        order_dict = dict(order_row._mapping)
        order_dict['Items'] = []
        result_list.append(order_dict)

    return result_list


# ══════════════════════════════════════════════════════════════════════════
# Service release -- item level
# ══════════════════════════════════════════════════════════════════════════

class ReleaseRequest(BaseModel):
    Reason: Optional[str] = None


class RevokeRequest(BaseModel):
    Reason: str = Field(min_length=1, max_length=500)


@router.get("/items/{item_id}/can-release")
def can_release_service(item_id: int, db: Session = Depends(get_db)):
    """Every precondition for releasing this item, and which ones fail.

    Read-only: it answers the question without acting on it, so a screen can
    explain to a user exactly what is still blocking a service.
    """
    decision = gate.evaluate_release(db, item_id)
    if decision.item is None:
        raise HTTPException(status_code=404, detail="Service order item not found")
    return {
        "ServiceOrderItemId": item_id,
        "canRelease": decision.allowed,
        "blockers": decision.blockers,
        "patientResponsibility": float(decision.patient_responsibility),
        "paid": float(decision.paid),
        "itemName": decision.item.get("ItemName"),
        "serviceStatus": decision.item.get("ServiceStatus"),
    }


@router.post("/items/{item_id}/release")
def release_service_item(
    item_id: int,
    payload: ReleaseRequest = Body(default=ReleaseRequest()),
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING", "PRO")),
):
    """Release ONE item, and only if every gate passes.

    There is no "release the order" operation: releasing a whole order releases
    items that may be rejected, unpaid or cancelled, which is precisely how
    rejected services were reaching the Lab queue.
    """
    try:
        decision = gate.release_item(
            db, item_id=item_id, released_by=actor.username, role=actor.role,
            reason=payload.Reason or "Released after financial clearance",
        )
        if not decision.allowed:
            db.rollback()
            status_code = 404 if decision.item is None else 409
            raise HTTPException(
                status_code=status_code,
                detail="This service cannot be released. " + decision.reason(),
            )
        db.commit()
        return {
            "message": "Service released.",
            "ServiceOrderItemId": item_id,
            "ReleasedBy": actor.username,
        }
    except IntegrityError:
        # ux_service_release_active: a concurrent request released it first.
        db.rollback()
        raise HTTPException(status_code=409,
                            detail="This item already has an active service release.")
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/{order_id}/revoke-release")
def revoke_order_release(
    order_id: int,
    payload: RevokeRequest,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_roles("BILLING", "PRO")),
):
    """Withdraw the releases on an order (payment reversed, order cancelled...).

    Items already in progress or completed keep their status: the work really
    happened, and rewriting that would be a worse record than the inconsistency.
    """
    try:
        exists = db.execute(text(
            "SELECT 1 FROM hospital.Service_Order WHERE ServiceOrderId = :oid AND IsDeleted = 0"
        ), {"oid": order_id}).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Service order not found")

        revoked = gate.revoke_releases_for_order(
            db, order_id, by=actor.username, reason=payload.Reason)
        db.commit()
        return {"message": f"{revoked} service release(s) revoked.",
                "ServiceOrderId": order_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
