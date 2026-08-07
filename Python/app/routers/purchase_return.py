import logging
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.purchase_return import PurchaseReturnCreate, PurchaseReturnUpdate, PurchaseReturnResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/purchase-returns", tags=["Procurement - Purchase Return"])

SP_NAME = "inventory.SpManagePurchaseReturn"

def _map_row(row) -> dict:
    return {
        "id":               row.ReturnId,
        "returnNo":         row.ReturnNo,
        "grnNo":            row.GrnNo,
        "vendorId":         row.VendorId,
        "vendorName":       row.VendorName,
        "store":            row.Store,
        "returnDate":       row.ReturnDate,
        "reason":           row.Reason,
        "status":           row.Status,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "modifiedBy":       row.ModifiedBy,
        "modifiedDate":     row.ModifiedDate,
        "isActive":         bool(row.IsActive),
        "items":            json.loads(row.Items) if hasattr(row, 'Items') and row.Items else []
    }

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_purchase_return(return_data: PurchaseReturnCreate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in return_data.items]) if return_data.items else None
        
        query = text(f"""
            CALL {SP_NAME}(
                'CREATE', 0, :returnNo, :grnNo, :vendorId, :vendorName, :store,
                :returnDate, :reason, :status, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "returnNo": return_data.returnNo,
            "grnNo": return_data.grnNo,
            "vendorId": return_data.vendorId,
            "vendorName": return_data.vendorName,
            "store": return_data.store,
            "returnDate": return_data.returnDate,
            "reason": return_data.reason,
            "status": return_data.status,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.ReturnId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating Purchase Return: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{return_id}", response_model=dict)
def update_purchase_return(return_id: int, return_data: PurchaseReturnUpdate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in return_data.items]) if return_data.items else None

        query = text(f"""
            CALL {SP_NAME}(
                'UPDATE', :returnId, :returnNo, :grnNo, :vendorId, :vendorName, :store,
                :returnDate, :reason, :status, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "returnId": return_id,
            "returnNo": return_data.returnNo,
            "grnNo": return_data.grnNo,
            "vendorId": return_data.vendorId,
            "vendorName": return_data.vendorName,
            "store": return_data.store,
            "returnDate": return_data.returnDate,
            "reason": return_data.reason,
            "status": return_data.status,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        return {"id": result.ReturnId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating Purchase Return: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[PurchaseReturnResponse])
def get_all_purchase_returns(db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                r.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemName', i.ItemName,
                        'receivedQty', i.ReceivedQty,
                        'returnQty', i.ReturnQty,
                        'reason', i.Reason,
                        'remarks', i.Remarks
                    )
                ) FROM `inventory`.`PurchaseReturnItem` i WHERE i.ReturnId = r.ReturnId) AS Items
            FROM `inventory`.`PurchaseReturn` r
            ORDER BY r.ReturnId DESC;
        """)
        results = db.execute(query).fetchall()
        return [_map_row(r) for r in results]
    except Exception as e:
        logger.error(f"Error fetching Purchase Returns: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{return_id}", response_model=PurchaseReturnResponse)
def get_purchase_return_by_id(return_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                r.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemName', i.ItemName,
                        'receivedQty', i.ReceivedQty,
                        'returnQty', i.ReturnQty,
                        'reason', i.Reason,
                        'remarks', i.Remarks
                    )
                ) FROM `inventory`.`PurchaseReturnItem` i WHERE i.ReturnId = r.ReturnId) AS Items
            FROM `inventory`.`PurchaseReturn` r
            WHERE r.ReturnId = :returnId
        """)
        result = db.execute(query, {"returnId": return_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Purchase Return not found")
        return _map_row(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Purchase Return {return_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{return_id}")
def delete_purchase_return(return_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('DELETE', :returnId, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, 'Admin', NULL)")
        result = db.execute(query, {"returnId": return_id}).fetchone()
        db.commit()
        return {"id": result.ReturnId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting Purchase Return {return_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
