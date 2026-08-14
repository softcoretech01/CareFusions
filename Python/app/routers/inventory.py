"""Inventory API — stock lots, movements and the stock ledger.

Backed by the inventory.SpInv* procedures. Items and stores come from the admin
masters; lots, movement documents and the ledger live in the dedicated
`inventory` schema. Every movement is posted through SpInvStockPost, which
maintains the moving-average valuation rate and appends a ledger row.
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.inventory import DocumentCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inventory", tags=["Inventory"])

_DOC = ("CALL inventory.SpInvDocument(:p_Opt, :p_DocId, :p_DocType, :p_FromStoreId, :p_ToStoreId, "
        ":p_DepartmentName, :p_VendorName, :p_ReferenceNo, :p_RequestedBy, :p_ApprovedBy, "
        ":p_Reason, :p_Remarks, :p_Items, :p_FromDate, :p_ToDate, :p_User)")

_STOCK = "CALL inventory.SpInvStock(:p_Opt, :p_StoreId, :p_ItemId, :p_Days, :p_FromDate, :p_ToDate)"

_DOC_D = {k: None for k in (
    "p_Opt p_DocId p_DocType p_FromStoreId p_ToStoreId p_DepartmentName p_VendorName "
    "p_ReferenceNo p_RequestedBy p_ApprovedBy p_Reason p_Remarks p_Items p_FromDate "
    "p_ToDate p_User").split()}
_STOCK_D = {k: None for k in "p_Opt p_StoreId p_ItemId p_Days p_FromDate p_ToDate".split()}


def _doc_sp(db: Session, opt: str, **kw):
    params = dict(_DOC_D)
    params["p_Opt"] = opt
    params.update({f"p_{k}": v for k, v in kw.items()})
    return db.execute(text(_DOC), params)


def _stock_sp(db: Session, opt: str, **kw):
    params = dict(_STOCK_D)
    params["p_Opt"] = opt
    params.update({f"p_{k}": v for k, v in kw.items()})
    return db.execute(text(_STOCK), params)


def _f(v):
    return float(v) if v is not None else 0.0


def _iso(v):
    return v.isoformat() if v else None


# ── Row mappers ──────────────────────────────────────────────
def _map_lot(r) -> dict:
    return {
        "stockId": r.StockId, "itemId": r.ItemId, "itemCode": r.ItemCode, "itemName": r.ItemName,
        "category": r.Category or "", "subCategory": r.SubCategory or "",
        "brand": r.Brand or "", "manufacturer": r.Manufacturer or "",
        "storeId": r.StoreId, "storeName": r.StoreName,
        "batchNo": r.BatchNo, "mfgDate": _iso(r.MfgDate), "expiryDate": _iso(r.ExpiryDate),
        "quantity": _f(r.Quantity), "reservedQty": _f(r.ReservedQty),
        "valuationRate": _f(r.ValuationRate), "stockValue": _f(r.StockValue),
        "uom": r.Uom or "", "reorderLevel": r.ReorderLevel, "minStock": r.MinStock,
        "maxStock": r.MaxStock,
    }


def _map_doc(r) -> dict:
    return {
        "docId": r.DocId, "docNumber": r.DocNumber, "docType": r.DocType,
        "docDate": _iso(r.DocDate),
        "fromStoreId": r.FromStoreId, "fromStoreName": getattr(r, "FromStoreName", None) or "",
        "toStoreId": r.ToStoreId, "toStoreName": getattr(r, "ToStoreName", None) or "",
        "departmentName": r.DepartmentName or "", "vendorName": r.VendorName or "",
        "referenceNo": r.ReferenceNo or "", "requestedBy": r.RequestedBy or "",
        "approvedBy": r.ApprovedBy or "", "reason": r.Reason or "", "remarks": r.Remarks or "",
        "status": r.Status, "totalItems": r.TotalItems,
        "totalQty": _f(r.TotalQty), "totalValue": _f(r.TotalValue),
        "items": [],
    }


def _map_doc_item(r) -> dict:
    return {
        "docItemId": r.DocItemId, "itemId": r.ItemId, "itemName": r.ItemName,
        "batchNo": r.BatchNo, "mfgDate": _iso(r.MfgDate), "expiryDate": _iso(r.ExpiryDate),
        "quantity": _f(r.Quantity), "rate": _f(r.Rate), "value": _f(r.Value),
        "uom": r.Uom or "", "remarks": r.Remarks or "",
    }


# ══════════════════════════ LOOKUPS ══════════════════════════
@router.get("/stores")
def list_stores(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text(
            "SELECT StoreId, StoreCode, StoreName, StoreType FROM admin.Master_Store "
            "WHERE IsDeleted = 0 AND Status = 'Active' ORDER BY StoreName"
        )).fetchall()
        return [{"storeId": r.StoreId, "storeCode": r.StoreCode,
                 "storeName": r.StoreName, "storeType": r.StoreType} for r in rows]
    except Exception as e:
        logger.error(f"[GET /inventory/stores] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stores")


@router.get("/items")
def list_items(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text(
            "SELECT ItemId, ItemCode, ItemName, Category, SubCategory, Uom, ReorderLevel, "
            "MinStock, MaxStock, BatchRequired, ExpiryRequired, GstPercentage "
            "FROM admin.Master_Item WHERE IsDeleted = 0 AND Status = 'Active' ORDER BY ItemName"
        )).fetchall()
        return [{
            "itemId": r.ItemId, "itemCode": r.ItemCode, "itemName": r.ItemName,
            "category": r.Category or "", "subCategory": r.SubCategory or "",
            "uom": r.Uom or "", "reorderLevel": r.ReorderLevel,
            "minStock": r.MinStock, "maxStock": r.MaxStock,
            "batchRequired": bool(r.BatchRequired), "expiryRequired": bool(r.ExpiryRequired),
            "gstPercentage": r.GstPercentage,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /inventory/items] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch items")


# ══════════════════════════ STOCK ══════════════════════════
@router.get("/stock")
def list_stock(store_id: Optional[int] = Query(None, alias="storeId"),
               item_id: Optional[int] = Query(None, alias="itemId"),
               db: Session = Depends(get_db)):
    try:
        return [_map_lot(r) for r in _stock_sp(db, "LOTS", StoreId=store_id, ItemId=item_id).fetchall()]
    except Exception as e:
        logger.error(f"[GET /inventory/stock] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stock")


@router.get("/stock/issuable")
def issuable_lots(store_id: int = Query(..., alias="storeId"), db: Session = Depends(get_db)):
    """Lots that can be issued from a store, nearest expiry first (FEFO); expired excluded."""
    try:
        rows = _stock_sp(db, "ITEMLOTS", StoreId=store_id).fetchall()
        return [{
            "stockId": r.StockId, "itemId": r.ItemId, "itemCode": r.ItemCode,
            "itemName": r.ItemName, "category": r.Category or "", "batchNo": r.BatchNo,
            "expiryDate": _iso(r.ExpiryDate), "quantity": _f(r.Quantity),
            "valuationRate": _f(r.ValuationRate), "uom": r.Uom or "",
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /inventory/stock/issuable] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch issuable lots")


@router.get("/stock/low")
def low_stock(store_id: Optional[int] = Query(None, alias="storeId"), db: Session = Depends(get_db)):
    try:
        rows = _stock_sp(db, "LOWSTOCK", StoreId=store_id).fetchall()
        return [{
            "itemId": r.ItemId, "itemCode": r.ItemCode, "itemName": r.ItemName,
            "category": r.Category or "", "reorderLevel": r.ReorderLevel,
            "quantity": _f(r.Quantity), "deficit": _f(r.Deficit), "uom": r.Uom or "",
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /inventory/stock/low] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch low stock")


@router.get("/stock/expiring")
def expiring(days: int = Query(90, ge=0),
             store_id: Optional[int] = Query(None, alias="storeId"),
             db: Session = Depends(get_db)):
    try:
        rows = _stock_sp(db, "EXPIRY", Days=days, StoreId=store_id).fetchall()
        return [{
            "stockId": r.StockId, "itemId": r.ItemId, "itemCode": r.ItemCode,
            "itemName": r.ItemName, "category": r.Category or "", "storeName": r.StoreName,
            "batchNo": r.BatchNo, "mfgDate": _iso(r.MfgDate), "expiryDate": _iso(r.ExpiryDate),
            "quantity": _f(r.Quantity), "uom": r.Uom or "", "daysToExpiry": r.DaysToExpiry,
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /inventory/stock/expiring] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expiring stock")


@router.get("/stock/valuation")
def valuation(store_id: Optional[int] = Query(None, alias="storeId"), db: Session = Depends(get_db)):
    try:
        rows = _stock_sp(db, "VALUATION", StoreId=store_id).fetchall()
        return [{"category": r.Category or "Uncategorised", "itemCount": r.ItemCount,
                 "totalQty": _f(r.TotalQty), "totalValue": _f(r.TotalValue)} for r in rows]
    except Exception as e:
        logger.error(f"[GET /inventory/stock/valuation] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch valuation")


@router.get("/ledger")
def ledger(store_id: Optional[int] = Query(None, alias="storeId"),
           item_id: Optional[int] = Query(None, alias="itemId"),
           from_date: Optional[str] = Query(None, alias="from"),
           to_date: Optional[str] = Query(None, alias="to"),
           db: Session = Depends(get_db)):
    try:
        rows = _stock_sp(db, "LEDGER", StoreId=store_id, ItemId=item_id,
                         FromDate=from_date, ToDate=to_date).fetchall()
        return [{
            "ledgerId": r.LedgerId, "txnDate": _iso(r.TxnDate), "itemId": r.ItemId,
            "itemName": r.ItemName, "storeId": r.StoreId, "storeName": r.StoreName or "",
            "batchNo": r.BatchNo, "movementType": r.MovementType,
            "quantity": _f(r.Quantity), "rate": _f(r.Rate), "value": _f(r.Value),
            "balanceQty": _f(r.BalanceQty), "docId": r.DocId, "docNumber": r.DocNumber or "",
            "docType": r.DocType or "", "remarks": r.Remarks or "", "user": r.CreatedBy or "",
        } for r in rows]
    except Exception as e:
        logger.error(f"[GET /inventory/ledger] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch ledger")


# ══════════════════════════ DOCUMENTS ══════════════════════════
@router.get("/documents")
def list_documents(doc_type: Optional[str] = Query(None, alias="type"),
                   store_id: Optional[int] = Query(None, alias="storeId"),
                   from_date: Optional[str] = Query(None, alias="from"),
                   to_date: Optional[str] = Query(None, alias="to"),
                   db: Session = Depends(get_db)):
    try:
        headers = _doc_sp(db, "LIST", DocType=doc_type, FromStoreId=store_id,
                          FromDate=from_date, ToDate=to_date).fetchall()
        lines = _doc_sp(db, "LISTITEMS", DocType=doc_type,
                        FromDate=from_date, ToDate=to_date).fetchall()
        by_doc: dict = {}
        for ln in lines:
            by_doc.setdefault(ln.DocId, []).append(_map_doc_item(ln))
        out = []
        for h in headers:
            d = _map_doc(h)
            d["items"] = by_doc.get(h.DocId, [])
            out.append(d)
        return out
    except Exception as e:
        logger.error(f"[GET /inventory/documents] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch documents")


@router.get("/documents/{doc_id}")
def get_document(doc_id: int, db: Session = Depends(get_db)):
    try:
        h = _doc_sp(db, "GETBYID", DocId=doc_id).fetchone()
        if not h:
            raise HTTPException(status_code=404, detail="Document not found")
        d = _map_doc(h)
        d["items"] = [_map_doc_item(r) for r in _doc_sp(db, "ITEMS", DocId=doc_id).fetchall()]
        return d
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /inventory/documents/{doc_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch document")


@router.post("/documents", status_code=201)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    """Create and post a stock movement.

    Every line is applied to its lot and written to the ledger inside the
    stored procedure, so stock, valuation and audit trail always move together.
    """
    items_json = json.dumps([{
        "itemId": i.itemId, "batchNo": i.batchNo, "mfgDate": i.mfgDate,
        "expiryDate": i.expiryDate, "quantity": i.quantity, "rate": i.rate,
        "uom": i.uom, "remarks": i.remarks,
    } for i in payload.items])
    try:
        row = _doc_sp(db, "CREATE", DocType=payload.docType.value,
                      FromStoreId=payload.fromStoreId, ToStoreId=payload.toStoreId,
                      DepartmentName=payload.departmentName, VendorName=payload.vendorName,
                      ReferenceNo=payload.referenceNo, RequestedBy=payload.requestedBy,
                      ApprovedBy=payload.approvedBy, Reason=payload.reason,
                      Remarks=payload.remarks, Items=items_json,
                      User=payload.user or "Admin").fetchone()
        db.commit()
        return {"docId": row.DocId, "docNumber": row.DocNumber}
    except Exception as e:
        db.rollback()
        msg = str(getattr(e, "orig", e))
        for signal in ("Insufficient stock in the selected lot",
                       "No stock lot for this item, store and batch",
                       "Movement quantity cannot be zero",
                       "Unknown item", "Unknown store"):
            if signal in msg:
                raise HTTPException(status_code=409, detail=signal)
        if "foreign key constraint" in msg.lower() or "1452" in msg:
            raise HTTPException(status_code=400, detail="Unknown item or store reference")
        logger.error(f"[POST /inventory/documents] {e}")
        raise HTTPException(status_code=500, detail="Failed to post stock movement")


@router.put("/documents/{doc_id}")
def update_document(doc_id: int, payload: DocumentCreate, db: Session = Depends(get_db)):
    """Update a stock movement document.
    
    Note: Since stock movements are immediately posted to the ledger, this endpoint
    only updates the document metadata and items for correction purposes. It does NOT
    reverse or recalculate the stock ledger or lot quantities.
    """
    try:
        doc = db.execute(text("SELECT * FROM inventory.Inventory_Document WHERE DocId = :doc_id"), {"doc_id": doc_id}).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
            
        db.execute(text("""
            UPDATE inventory.Inventory_Document
            SET DepartmentName = :dept, VendorName = :vendor, ReferenceNo = :ref,
                RequestedBy = :req, ApprovedBy = :app, Reason = :reason, Remarks = :rem
            WHERE DocId = :doc_id
        """), {
            "dept": payload.departmentName, "vendor": payload.vendorName,
            "ref": payload.referenceNo, "req": payload.requestedBy,
            "app": payload.approvedBy, "reason": payload.reason,
            "rem": payload.remarks, "doc_id": doc_id
        })
        
        db.execute(text("DELETE FROM inventory.Inventory_DocumentItem WHERE DocId = :doc_id"), {"doc_id": doc_id})
        
        for i in payload.items:
            db.execute(text("""
                INSERT INTO inventory.Inventory_DocumentItem 
                (DocId, ItemId, ItemName, BatchNo, MfgDate, ExpiryDate, Quantity, Rate, Value, Uom, Remarks)
                SELECT :doc_id, :item_id, COALESCE(ItemName, 'Unknown'), :batch, :mfg, :exp, :qty, :rate, :val, 
                       COALESCE(:uom, Uom), :rem
                FROM admin.Master_Item WHERE ItemId = :item_id
            """), {
                "doc_id": doc_id, "item_id": i.itemId, 
                "batch": i.batchNo or "-", "mfg": i.mfgDate, "exp": i.expiryDate,
                "qty": i.quantity, "rate": i.rate or 0, "val": i.quantity * (i.rate or 0),
                "uom": i.uom, "rem": i.remarks or ""
            })
            
        db.execute(text("""
            UPDATE inventory.Inventory_Document d
            SET TotalItems = (SELECT COUNT(*) FROM inventory.Inventory_DocumentItem WHERE DocId = :doc_id),
                TotalQty   = (SELECT COALESCE(SUM(ABS(Quantity)), 0) FROM inventory.Inventory_DocumentItem WHERE DocId = :doc_id),
                TotalValue = (SELECT COALESCE(SUM(ABS(Value)), 0) FROM inventory.Inventory_DocumentItem WHERE DocId = :doc_id)
            WHERE d.DocId = :doc_id
        """), {"doc_id": doc_id})
        
        db.commit()
        return {"message": "Document updated"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /inventory/documents/{doc_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update document")


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Remove a movement document. Stock is NOT reversed — post a correcting
    adjustment instead, so the ledger keeps a complete history."""
    try:
        _doc_sp(db, "DELETE", DocId=doc_id)
        db.commit()
        return {"message": "Document deleted. Stock was not reversed."}
    except Exception as e:
        db.rollback()
        logger.error(f"[DELETE /inventory/documents/{doc_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


# ══════════════════════════ DASHBOARD ══════════════════════════
@router.get("/dashboard")
def dashboard(store_id: Optional[int] = Query(None, alias="storeId"),
              db: Session = Depends(get_db)):
    try:
        kpi = db.execute(text("""
            SELECT
              (SELECT COUNT(DISTINCT ItemId) FROM inventory.Inventory_Stock
                 WHERE (:sid IS NULL OR StoreId = :sid))                              AS totalItems,
              (SELECT COALESCE(SUM(Quantity * ValuationRate), 0) FROM inventory.Inventory_Stock
                 WHERE (:sid IS NULL OR StoreId = :sid))                              AS stockValue,
              (SELECT COUNT(*) FROM inventory.Inventory_Stock
                 WHERE Quantity <= 0 AND (:sid IS NULL OR StoreId = :sid))            AS outOfStock,
              (SELECT COUNT(*) FROM inventory.Inventory_Stock
                 WHERE ExpiryDate IS NOT NULL AND Quantity > 0
                   AND ExpiryDate <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
                   AND (:sid IS NULL OR StoreId = :sid))                              AS expiringSoon,
              (SELECT COALESCE(SUM(Quantity), 0) FROM inventory.Inventory_StockLedger
                 WHERE Quantity > 0 AND DATE(TxnDate) = CURDATE()
                   AND (:sid IS NULL OR StoreId = :sid))                              AS todayInward,
              (SELECT COALESCE(-SUM(Quantity), 0) FROM inventory.Inventory_StockLedger
                 WHERE Quantity < 0 AND DATE(TxnDate) = CURDATE()
                   AND (:sid IS NULL OR StoreId = :sid))                              AS todayOutward
        """), {"sid": store_id}).fetchone()

        trend = db.execute(text("""
            SELECT DATE(TxnDate) AS d,
                   COALESCE(SUM(CASE WHEN Quantity > 0 THEN Quantity ELSE 0 END), 0) AS inQty,
                   COALESCE(-SUM(CASE WHEN Quantity < 0 THEN Quantity ELSE 0 END), 0) AS outQty
            FROM inventory.Inventory_StockLedger
            WHERE TxnDate >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
              AND (:sid IS NULL OR StoreId = :sid)
            GROUP BY DATE(TxnDate) ORDER BY d
        """), {"sid": store_id}).fetchall()

        return {
            "totalItems": kpi.totalItems,
            "stockValue": _f(kpi.stockValue),
            "outOfStock": kpi.outOfStock,
            "expiringSoon": kpi.expiringSoon,
            "todayInward": _f(kpi.todayInward),
            "todayOutward": _f(kpi.todayOutward),
            "trend": [{"date": _iso(r.d), "inQty": _f(r.inQty), "outQty": _f(r.outQty)} for r in trend],
        }
    except Exception as e:
        logger.error(f"[GET /inventory/dashboard] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard")
