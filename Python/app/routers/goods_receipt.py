import logging
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.goods_receipt import GoodsReceiptCreate, GoodsReceiptUpdate, GoodsReceiptResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/grns", tags=["Procurement - Goods Receipt Note"])

SP_NAME = "inventory.SpManageGoodsReceipt"

def _map_row(row) -> dict:
    return {
        "id":               row.GrnId,
        "grnNo":            row.GrnNo,
        "poNumber":         row.PoNumber,
        "vendorId":         row.VendorId,
        "vendorName":       row.VendorName,
        "store":            row.Store,
        "receivedDate":     row.ReceivedDate,
        "invoiceNumber":    row.InvoiceNumber,
        "invoiceDate":      row.InvoiceDate,
        "transportDetails": row.TransportDetails,
        "lrNumber":         row.LrNumber,
        "vehicleNumber":    row.VehicleNumber,
        "status":           row.Status,
        "qcStatus":         row.QcStatus,
        "createdBy":        row.CreatedBy,
        "createdDate":      row.CreatedDate,
        "modifiedBy":       row.ModifiedBy,
        "modifiedDate":     row.ModifiedDate,
        "isActive":         bool(row.IsActive),
        "items":            json.loads(row.Items) if hasattr(row, 'Items') and row.Items else []
    }

def _post_to_stock(db: Session, grn_id: int) -> dict:
    """Post an accepted GRN into inventory, and report what happened.

    Receiving goods used to leave stock untouched: SpManageGoodsReceipt wrote the
    GoodsReceipt tables and nothing else, so a fully received PO still showed zero
    on hand and somebody had to re-key a manual Stock In with no link back.

    SpGrnPostToStock is idempotent — it records the Inventory_Document it raised on
    GoodsReceipt.InventoryDocId and returns ALREADY_POSTED thereafter — so calling
    it on every save is safe, including when a GRN is edited after acceptance.

    A posting problem must not fail the GRN save itself (the receipt is still a
    valid record), so the outcome is returned to the caller and logged instead.
    """
    try:
        db.execute(text("CALL inventory.SpGrnPostToStock(:g, 'Admin')"), {"g": grn_id})
        db.commit()
        row = db.execute(text(
            "SELECT InventoryDocId FROM inventory.GoodsReceipt WHERE GrnId = :g"
        ), {"g": grn_id}).fetchone()
        doc_id = row.InventoryDocId if row else None

        # Tell the PO it has been received. Runs regardless of whether THIS call
        # posted stock, so editing an already-posted GRN still re-evaluates the
        # order — a PO used to sit on 'Approved' forever no matter how much of it
        # had arrived.
        po = db.execute(text(
            "SELECT PoNumber FROM inventory.GoodsReceipt WHERE GrnId = :g"
        ), {"g": grn_id}).fetchone()
        if po and po.PoNumber:
            try:
                db.execute(text("CALL inventory.SpPoRefreshFulfilment(:p)"), {"p": po.PoNumber})
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"[GRN {grn_id}] PO fulfilment refresh failed: {e}")

        if doc_id:
            return {"stockPosted": True, "inventoryDocId": doc_id}
        # Not posted is normal for a draft or rejected receipt.
        logger.info(f"[GRN {grn_id}] not posted to stock (not accepted, unknown store, or no accepted lines)")
        return {"stockPosted": False, "inventoryDocId": None}
    except Exception as e:
        db.rollback()
        logger.error(f"[GRN {grn_id}] stock posting failed: {e}")
        return {"stockPosted": False, "inventoryDocId": None, "stockError": str(e)}


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_grn(grn: GoodsReceiptCreate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in grn.items]) if grn.items else None
        
        query = text(f"""
            CALL {SP_NAME}(
                'CREATE', 0, :grnNo, :poNumber, :vendorId, :vendorName, :store,
                :receivedDate, :invoiceNumber, :invoiceDate, :transportDetails, 
                :lrNumber, :vehicleNumber, :status, :qcStatus, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "grnNo": grn.grnNo,
            "poNumber": grn.poNumber,
            "vendorId": grn.vendorId,
            "vendorName": grn.vendorName,
            "store": grn.store,
            "receivedDate": grn.receivedDate,
            "invoiceNumber": grn.invoiceNumber,
            "invoiceDate": grn.invoiceDate,
            "transportDetails": grn.transportDetails,
            "lrNumber": grn.lrNumber,
            "vehicleNumber": grn.vehicleNumber,
            "status": grn.status,
            "qcStatus": grn.qcStatus,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        posted = _post_to_stock(db, result.GrnId)
        return {"id": result.GrnId, "message": result.Message, **posted}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating GRN: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{grn_id}", response_model=dict)
def update_grn(grn_id: int, grn: GoodsReceiptUpdate, db: Session = Depends(get_db)):
    try:
        items_json = json.dumps([item.dict() for item in grn.items]) if grn.items else None

        query = text(f"""
            CALL {SP_NAME}(
                'UPDATE', :grnId, :grnNo, :poNumber, :vendorId, :vendorName, :store,
                :receivedDate, :invoiceNumber, :invoiceDate, :transportDetails, 
                :lrNumber, :vehicleNumber, :status, :qcStatus, 'Admin', :itemsJson
            )
        """)
        
        result = db.execute(query, {
            "grnId": grn_id,
            "grnNo": grn.grnNo,
            "poNumber": grn.poNumber,
            "vendorId": grn.vendorId,
            "vendorName": grn.vendorName,
            "store": grn.store,
            "receivedDate": grn.receivedDate,
            "invoiceNumber": grn.invoiceNumber,
            "invoiceDate": grn.invoiceDate,
            "transportDetails": grn.transportDetails,
            "lrNumber": grn.lrNumber,
            "vehicleNumber": grn.vehicleNumber,
            "status": grn.status,
            "qcStatus": grn.qcStatus,
            "itemsJson": items_json
        }).fetchone()
        
        db.commit()
        posted = _post_to_stock(db, grn_id)
        return {"id": result.GrnId, "message": result.Message, **posted}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating GRN: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[GoodsReceiptResponse])
def get_all_grns(db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                g.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemType', i.ItemType,
                        'itemName', i.ItemName,
                        'category', i.Category,
                        'orderedQty', i.OrderedQty,
                        'receivedQty', i.ReceivedQty,
                        'acceptedQty', i.AcceptedQty,
                        'rejectedQty', i.RejectedQty,
                        'rate', i.Rate,
                        'totalPrice', i.TotalPrice,
                        'batchNumber', i.BatchNumber,
                        'expiryDate', i.ExpiryDate,
                        'manufactureDate', i.ManufactureDate,
                        'remarks', i.Remarks
                    )
                ) FROM `inventory`.`GoodsReceiptItem` i WHERE i.GrnId = g.GrnId) AS Items
            FROM `inventory`.`GoodsReceipt` g
            ORDER BY g.GrnId DESC;
        """)
        results = db.execute(query).fetchall()
        return [_map_row(r) for r in results]
    except Exception as e:
        logger.error(f"Error fetching GRNs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{grn_id}", response_model=GoodsReceiptResponse)
def get_grn_by_id(grn_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                g.*,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId', i.ItemId,
                        'itemType', i.ItemType,
                        'itemName', i.ItemName,
                        'category', i.Category,
                        'orderedQty', i.OrderedQty,
                        'receivedQty', i.ReceivedQty,
                        'acceptedQty', i.AcceptedQty,
                        'rejectedQty', i.RejectedQty,
                        'rate', i.Rate,
                        'totalPrice', i.TotalPrice,
                        'batchNumber', i.BatchNumber,
                        'expiryDate', i.ExpiryDate,
                        'manufactureDate', i.ManufactureDate,
                        'remarks', i.Remarks
                    )
                ) FROM `inventory`.`GoodsReceiptItem` i WHERE i.GrnId = g.GrnId) AS Items
            FROM `inventory`.`GoodsReceipt` g
            WHERE g.GrnId = :grnId
        """)
        result = db.execute(query, {"grnId": grn_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="GRN not found")
        return _map_row(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching GRN {grn_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{grn_id}")
def delete_grn(grn_id: int, db: Session = Depends(get_db)):
    try:
        query = text(f"CALL {SP_NAME}('DELETE', :grnId, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Admin', NULL)")
        result = db.execute(query, {"grnId": grn_id}).fetchone()
        db.commit()
        return {"id": result.GrnId, "message": result.Message}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting GRN {grn_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
