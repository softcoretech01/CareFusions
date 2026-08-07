import logging
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.vendor_quotation import VendorQuotationCreate, VendorQuotationUpdate, VendorQuotationResponse, QuotationApprove

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vendor-quotations", tags=["Procurement - Vendor Quotation"])

SP_NAME = "inventory.SpManageVendorQuotation"

def _map_row(row) -> dict:
    return {
        "id":               row.QuotationId,
        "quotationNo":      row.QuotationNo,
        "rfqNo":            row.RfqNo,
        "vendorId":         row.VendorId,
        "vendorName":       row.VendorName,
        "quotationDate":    row.QuotationDate,
        "validityDate":     row.ValidityDate,
        "paymentTerms":     row.PaymentTerms,
        "deliveryDays":     row.DeliveryDays,
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
def create_vendor_quotation(quotation: VendorQuotationCreate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in quotation.items]) if quotation.items else None
        
        query = text(f"""
            CALL {SP_NAME}(
                'CREATE', 0, :quotationNo, :rfqNo, :vendorId, :vendorName, 
                :quotationDate, :validityDate, :paymentTerms, :deliveryDays, 
                :totalAmount, :status, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "quotationNo": quotation.quotationNo,
            "rfqNo": quotation.rfqNo,
            "vendorId": quotation.vendorId,
            "vendorName": quotation.vendorName,
            "quotationDate": quotation.quotationDate,
            "validityDate": quotation.validityDate,
            "paymentTerms": quotation.paymentTerms,
            "deliveryDays": quotation.deliveryDays,
            "totalAmount": quotation.totalAmount,
            "status": quotation.status,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.QuotationId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating Vendor Quotation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/approve", response_model=dict)
def approve_vendor_quotation(approval: QuotationApprove, db: Session = Depends(get_db)):
    try:
        query = text("""
            CALL inventory.SpApproveVendorQuotation(
                :rfqNo, :approvedQuotationNo, 'Admin'
            )
        """)
        
        result = db.execute(query, {
            "rfqNo": approval.rfqNo,
            "approvedQuotationNo": approval.approvedQuotationNo
        }).fetchone()
        
        db.commit()
        return {"message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving Vendor Quotation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{quotation_id}", response_model=dict)
def update_vendor_quotation(quotation_id: int, quotation: VendorQuotationUpdate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in quotation.items]) if quotation.items else None

        query = text(f"""
            CALL {SP_NAME}(
                'UPDATE', :quotationId, :quotationNo, :rfqNo, :vendorId, :vendorName, 
                :quotationDate, :validityDate, :paymentTerms, :deliveryDays, 
                :totalAmount, :status, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "quotationId": quotation_id,
            "quotationNo": quotation.quotationNo,
            "rfqNo": quotation.rfqNo,
            "vendorId": quotation.vendorId,
            "vendorName": quotation.vendorName,
            "quotationDate": quotation.quotationDate,
            "validityDate": quotation.validityDate,
            "paymentTerms": quotation.paymentTerms,
            "deliveryDays": quotation.deliveryDays,
            "totalAmount": quotation.totalAmount,
            "status": quotation.status,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.QuotationId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating Vendor Quotation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[VendorQuotationResponse])
def get_all_vendor_quotations(db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                q.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemName', i.ItemName,
                        'category', i.Category,
                        'qty', i.Qty,
                        'quotedRate', i.QuotedRate,
                        'discountPercentage', i.DiscountPercentage,
                        'gstPercentage', i.GstPercentage,
                        'finalAmount', i.FinalAmount,
                        'remarks', i.Remarks
                    )
                ) FROM `inventory`.`VendorQuotationItem` i WHERE i.QuotationId = q.QuotationId) AS Items
            FROM `inventory`.`VendorQuotation` q
            ORDER BY q.QuotationId DESC;
        """)
        results = db.execute(query).fetchall()
        return [_map_row(r) for r in results]
    except Exception as e:
        logger.error(f"Error fetching Vendor Quotations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{quotation_id}", response_model=VendorQuotationResponse)
def get_vendor_quotation_by_id(quotation_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                q.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemName', i.ItemName,
                        'category', i.Category,
                        'qty', i.Qty,
                        'quotedRate', i.QuotedRate,
                        'discountPercentage', i.DiscountPercentage,
                        'gstPercentage', i.GstPercentage,
                        'finalAmount', i.FinalAmount,
                        'remarks', i.Remarks
                    )
                ) FROM `inventory`.`VendorQuotationItem` i WHERE i.QuotationId = q.QuotationId) AS Items
            FROM `inventory`.`VendorQuotation` q
            WHERE q.QuotationId = :quotationId
        """)
        result = db.execute(query, {"quotationId": quotation_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Vendor Quotation not found")
        return _map_row(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Vendor Quotation {quotation_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{quotation_id}")
def delete_vendor_quotation(quotation_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('DELETE', :quotationId, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL)")
        result = db.execute(query, {"quotationId": quotation_id}).fetchone()
        db.commit()
        return {"id": result.QuotationId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting Vendor Quotation {quotation_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
