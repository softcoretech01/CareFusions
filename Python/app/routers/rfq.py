import logging
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.rfq import RFQCreate, RFQUpdate, RFQResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rfqs", tags=["Procurement - Request For Quotation"])

SP_NAME = "inventory.SpManageRequestForQuotation"

def _map_row(row) -> dict:
    return {
        "id":               row.RfqId,
        "rfqNo":            row.RfqNo,
        "rfqDate":          row.RfqDate,
        "prNumber":         row.PrNumber,
        "department":       row.Department,
        "requiredDate":     row.RequiredDate,
        "dueDate":          row.DueDate,
        "deliveryLocation": row.DeliveryLocation,
        "terms":            row.Terms,
        "vendorCount":      row.VendorCount,
        "status":           row.Status,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "updatedBy":        row.UpdatedBy,
        "updatedDate":      row.UpdatedDate,
        "isActive":         bool(row.IsActive),
        "items":            json.loads(row.Items) if hasattr(row, 'Items') and row.Items else [],
        "vendors":          json.loads(row.Vendors) if hasattr(row, 'Vendors') and row.Vendors else [],
    }

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_rfq(rfq: RFQCreate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in rfq.items]) if rfq.items else None
        vendors_json = json.dumps(rfq.vendors) if rfq.vendors else None
        
        query = text(f"""
            CALL {SP_NAME}(
                'CREATE', 0, :rfqNo, :rfqDate, :prNumber, :department, 
                :requiredDate, :dueDate, :deliveryLocation, :terms, 
                :vendorCount, :status, :createdBy, :itemsJson, :vendorsJson
            )
        """)
        
        result = db.execute(query, {
            "rfqNo": rfq.rfqNo,
            "rfqDate": rfq.rfqDate,
            "prNumber": rfq.prNumber,
            "department": rfq.department,
            "requiredDate": rfq.requiredDate,
            "dueDate": rfq.dueDate,
            "deliveryLocation": rfq.deliveryLocation,
            "terms": rfq.terms,
            "vendorCount": rfq.vendorCount,
            "status": rfq.status,
            "createdBy": rfq.createdBy,
            "itemsJson": items_json,
            "vendorsJson": vendors_json
        }).fetchone()
        
        db.commit()
        return {"id": result.RfqId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating RFQ: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{rfq_id}", response_model=dict)
def update_rfq(rfq_id: int, rfq: RFQUpdate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in rfq.items]) if rfq.items else None
        vendors_json = json.dumps(rfq.vendors) if rfq.vendors else None

        query = text(f"""
            CALL {SP_NAME}(
                'UPDATE', :rfqId, :rfqNo, :rfqDate, :prNumber, :department, 
                :requiredDate, :dueDate, :deliveryLocation, :terms, 
                :vendorCount, :status, :createdBy, :itemsJson, :vendorsJson
            )
        """)
        
        result = db.execute(query, {
            "rfqId": rfq_id,
            "rfqNo": rfq.rfqNo,
            "rfqDate": rfq.rfqDate,
            "prNumber": rfq.prNumber,
            "department": rfq.department,
            "requiredDate": rfq.requiredDate,
            "dueDate": rfq.dueDate,
            "deliveryLocation": rfq.deliveryLocation,
            "terms": rfq.terms,
            "vendorCount": rfq.vendorCount,
            "status": rfq.status,
            "createdBy": rfq.createdBy,
            "itemsJson": items_json,
            "vendorsJson": vendors_json
        }).fetchone()
        
        db.commit()
        return {"id": result.RfqId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating RFQ: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[RFQResponse])
def get_all_rfqs(db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('GET_ALL', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL)")
        results = db.execute(query).fetchall()
        return [_map_row(r) for r in results]
    except Exception as e:
        logger.error(f"Error fetching RFQs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{rfq_id}", response_model=RFQResponse)
def get_rfq_by_id(rfq_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('GET_BY_ID', :rfqId, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL)")
        result = db.execute(query, {"rfqId": rfq_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="RFQ not found")
        return _map_row(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching RFQ {rfq_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{rfq_id}")
def delete_rfq(rfq_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('DELETE', :rfqId, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL)")
        result = db.execute(query, {"rfqId": rfq_id}).fetchone()
        db.commit()
        return {"id": result.RfqId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting RFQ {rfq_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
