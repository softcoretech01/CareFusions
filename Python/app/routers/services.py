from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..schemas import services as service_schema
import datetime

router = APIRouter(
    prefix="/services",
    tags=["Service Orders"]
)

@router.post("/orders", response_model=service_schema.ServiceOrder)
def create_service_order(order: service_schema.ServiceOrderCreate, db: Session = Depends(get_db)):
    """
    Create a new Service Order and its items.
    """
    try:
        order_id = create_service_order_internal(db, order)
        db.commit()
        return get_service_order(order_id, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create service order: {str(e)}")

def create_service_order_internal(db: Session, order: service_schema.ServiceOrderCreate) -> int:
    """
    Internal helper to create a Service Order and items without committing.
    """
    try:
        # Create Order
        insert_order_query = text("""
            INSERT INTO hospital.Service_Order (
                OrderNo, UHID, EncounterId, AdmissionId, DoctorId, DepartmentId, 
                OrderType, SourceModule, OrderStatus, PROStatus, PaymentStatus, 
                FinancialStatus, ServiceStatus, AuthorizationStatus
            ) VALUES (
                :OrderNo, :UHID, :EncounterId, :AdmissionId, :DoctorId, :DepartmentId, 
                :OrderType, :SourceModule, :OrderStatus, :PROStatus, :PaymentStatus, 
                :FinancialStatus, :ServiceStatus, :AuthorizationStatus
            )
        """)
        
        # Prepare parameters for the order
        order_params = order.dict(exclude={'Items'})
        
        db.execute(
            insert_order_query,
            order_params
        )
        order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        
        # Create Items
        insert_item_query = text("""
            INSERT INTO hospital.Service_OrderItem (
                ServiceOrderId, ItemType, ItemId, ItemName, Quantity, UOM,
                MasterPrice, OriginalPrice, PROPrice, AuthorizedDiscount,
                GrossAmount, NetAmount, InsuranceCoveredAmount, PatientResponsibility,
                PROStatus, PaymentStatus, FinancialStatus, ServiceStatus, AuthorizationStatus
            ) VALUES (
                :ServiceOrderId, :ItemType, :ItemId, :ItemName, :Quantity, :UOM,
                :MasterPrice, :OriginalPrice, :PROPrice, :AuthorizedDiscount,
                :GrossAmount, :NetAmount, :InsuranceCoveredAmount, :PatientResponsibility,
                :PROStatus, :PaymentStatus, :FinancialStatus, :ServiceStatus, :AuthorizationStatus
            )
        """)
        
        for item in order.Items:
            item_params = item.dict()
            item_params['ServiceOrderId'] = order_id
            db.execute(insert_item_query, item_params)
            
        return order_id
    except Exception as e:
        raise e

@router.get("/orders/{order_id}", response_model=service_schema.ServiceOrder)
def get_service_order(order_id: int, db: Session = Depends(get_db)):
    """
    Get a specific Service Order by ID.
    """
    order_query = text("SELECT * FROM hospital.Service_Order WHERE ServiceOrderId = :order_id AND IsDeleted = 0")
    order_row = db.execute(order_query, {"order_id": order_id}).fetchone()
    
    if not order_row:
        raise HTTPException(status_code=404, detail="Service Order not found")
        
    items_query = text("SELECT * FROM hospital.Service_OrderItem WHERE ServiceOrderId = :order_id AND IsDeleted = 0")
    items_rows = db.execute(items_query, {"order_id": order_id}).fetchall()
    
    # Map raw rows to dicts
    order_dict = dict(order_row._mapping)
    order_dict['Items'] = [dict(item._mapping) for item in items_rows]
    
    # Add empty releases for now since we haven't fetched them
    for item in order_dict['Items']:
        item['Releases'] = []
        
    return order_dict

@router.get("/orders", response_model=List[service_schema.ServiceOrder])
def list_service_orders(db: Session = Depends(get_db)):
    """
    List all active Service Orders.
    """
    orders_query = text("SELECT * FROM hospital.Service_Order WHERE IsDeleted = 0 ORDER BY CreatedAt DESC LIMIT 50")
    orders_rows = db.execute(orders_query).fetchall()
    
    result_list = []
    for order_row in orders_rows:
        order_dict = dict(order_row._mapping)
        order_dict['Items'] = [] # Don't fetch all items for listing to save query time unless needed
        result_list.append(order_dict)
        
    return result_list
