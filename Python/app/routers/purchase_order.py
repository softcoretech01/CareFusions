import logging
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/purchase-orders", tags=["Procurement - Purchase Order"])

SP_NAME = "inventory.SpManagePurchaseOrder"

def _map_row(row) -> dict:
    return {
        "id":               row.PoId,
        "poNumber":         row.PoNumber,
        "poDate":           row.PoDate,
        "prNo":             row.PrNo,
        "quotationNo":      row.QuotationNo,
        "vendorId":         row.VendorId,
        "vendorName":       row.VendorName,
        "department":       row.Department,
        "billingAddress":   row.BillingAddress,
        "shippingAddress":  row.ShippingAddress,
        "paymentTerms":     row.PaymentTerms,
        "deliveryTerms":    row.DeliveryTerms,
        "expectedDelivery": row.ExpectedDelivery,
        "currency":         row.Currency,
        "totalAmount":      row.TotalAmount,
        "status":           row.Status,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "modifiedBy":       row.ModifiedBy,
        "modifiedDate":     row.ModifiedDate,
        "isActive":         bool(row.IsActive),
        "items":            json.loads(row.Items) if hasattr(row, 'Items') and row.Items else []
    }

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_purchase_order(po: PurchaseOrderCreate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in po.items]) if po.items else None
        
        query = text(f"""
            CALL {SP_NAME}(
                'CREATE', 0, :poNumber, :poDate, :prNo, :quotationNo, :vendorId, :vendorName,
                :department, :billingAddress, :shippingAddress, :paymentTerms, :deliveryTerms,
                :expectedDelivery, :currency, :totalAmount, :status, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "poNumber": po.poNumber,
            "poDate": po.poDate,
            "prNo": po.prNo,
            "quotationNo": po.quotationNo,
            "vendorId": po.vendorId,
            "vendorName": po.vendorName,
            "department": po.department,
            "billingAddress": po.billingAddress,
            "shippingAddress": po.shippingAddress,
            "paymentTerms": po.paymentTerms,
            "deliveryTerms": po.deliveryTerms,
            "expectedDelivery": po.expectedDelivery,
            "currency": po.currency,
            "totalAmount": po.totalAmount,
            "status": po.status,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.PoId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating Purchase Order: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{po_id}", response_model=dict)
def update_purchase_order(po_id: int, po: PurchaseOrderUpdate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in po.items]) if po.items else None

        query = text(f"""
            CALL {SP_NAME}(
                'UPDATE', :poId, :poNumber, :poDate, :prNo, :quotationNo, :vendorId, :vendorName,
                :department, :billingAddress, :shippingAddress, :paymentTerms, :deliveryTerms,
                :expectedDelivery, :currency, :totalAmount, :status, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "poId": po_id,
            "poNumber": po.poNumber,
            "poDate": po.poDate,
            "prNo": po.prNo,
            "quotationNo": po.quotationNo,
            "vendorId": po.vendorId,
            "vendorName": po.vendorName,
            "department": po.department,
            "billingAddress": po.billingAddress,
            "shippingAddress": po.shippingAddress,
            "paymentTerms": po.paymentTerms,
            "deliveryTerms": po.deliveryTerms,
            "expectedDelivery": po.expectedDelivery,
            "currency": po.currency,
            "totalAmount": po.totalAmount,
            "status": po.status,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.PoId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating Purchase Order: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{po_id}/approve", response_model=dict)
def approve_purchase_order(po_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"""
            CALL {SP_NAME}('APPROVE', :poId, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Admin', NULL)
        """)
        result = db.execute(query, {"poId": po_id}).fetchone()
        db.commit()
        return {"id": result.PoId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving Purchase Order: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[PurchaseOrderResponse])
def get_all_purchase_orders(db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                p.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemType', i.ItemType,
                        'itemName', i.ItemName,
                        'category', i.Category,
                        'orderedQty', i.OrderedQty,
                        'uom', i.Uom,
                        'rate', i.Rate,
                        'discount', i.Discount,
                        'gst', i.Gst,
                        'amount', i.Amount
                    )
                ) FROM `inventory`.`PurchaseOrderItem` i WHERE i.PoId = p.PoId) AS Items
            FROM `inventory`.`PurchaseOrder` p
            ORDER BY p.PoId DESC;
        """)
        results = db.execute(query).fetchall()
        return [_map_row(r) for r in results]
    except Exception as e:
        logger.error(f"Error fetching Purchase Orders: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order_by_id(po_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                p.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemType', i.ItemType,
                        'itemName', i.ItemName,
                        'category', i.Category,
                        'orderedQty', i.OrderedQty,
                        'uom', i.Uom,
                        'rate', i.Rate,
                        'discount', i.Discount,
                        'gst', i.Gst,
                        'amount', i.Amount
                    )
                ) FROM `inventory`.`PurchaseOrderItem` i WHERE i.PoId = p.PoId) AS Items
            FROM `inventory`.`PurchaseOrder` p
            WHERE p.PoId = :poId
        """)
        result = db.execute(query, {"poId": po_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
        return _map_row(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Purchase Order {po_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{po_id}")
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('DELETE', :poId, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Admin', NULL)")
        result = db.execute(query, {"poId": po_id}).fetchone()
        db.commit()
        return {"id": result.PoId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting Purchase Order {po_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
