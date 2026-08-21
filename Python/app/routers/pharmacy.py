"""Pharmacy (retail sales / POS) API.

Backed by hospital.SpPharmacyStock and hospital.SpPharmacySale. The medicine
catalog lives in admin.Master_Medicine; live stock + sales live in the hospital
schema. All object names are fully qualified so calls work from the default
admin connection.
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas.pharmacy import SaleCreate, StockUpsert, StockAdjust, StatusUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pharmacy", tags=["Pharmacy"])


# ── SP helpers ───────────────────────────────────────────────
def _stock_sp(db: Session, opt: str, **kw):
    return db.execute(text(
        "CALL hospital.SpPharmacyStock(:p_Opt, :p_MedicineId, :p_BatchNo, :p_Quantity, "
        ":p_UnitPrice, :p_ExpiryDate, :p_MinStockLevel, :p_Days, :p_User)"
    ), {
        "p_Opt": opt,
        "p_MedicineId": kw.get("medicine_id"),
        "p_BatchNo": kw.get("batch_no"),
        "p_Quantity": kw.get("quantity"),
        "p_UnitPrice": kw.get("unit_price"),
        "p_ExpiryDate": kw.get("expiry_date"),
        "p_MinStockLevel": kw.get("min_stock"),
        "p_Days": kw.get("days"),
        "p_User": kw.get("user", "Admin"),
    })


def _sale_sp(db: Session, opt: str, **kw):
    return db.execute(text(
        "CALL hospital.SpPharmacySale(:p_Opt, :p_SaleId, :p_PatientName, :p_PatientRef, "
        ":p_TotalAmount, :p_Discount, :p_Tax, :p_NetAmount, :p_PaymentMode, :p_PaymentStatus, "
        ":p_Items, :p_FromDate, :p_ToDate, :p_User)"
    ), {
        "p_Opt": opt,
        "p_SaleId": kw.get("sale_id"),
        "p_PatientName": kw.get("patient_name"),
        "p_PatientRef": kw.get("patient_ref"),
        "p_TotalAmount": kw.get("total_amount"),
        "p_Discount": kw.get("discount"),
        "p_Tax": kw.get("tax"),
        "p_NetAmount": kw.get("net_amount"),
        "p_PaymentMode": kw.get("payment_mode"),
        "p_PaymentStatus": kw.get("payment_status"),
        "p_Items": kw.get("items"),
        "p_FromDate": kw.get("from_date"),
        "p_ToDate": kw.get("to_date"),
        "p_User": kw.get("user", "Admin"),
    })


# ── Row mappers ──────────────────────────────────────────────

# -- FEFO allocation over the unified ledger --------------------------
# The pharmacy counter is a store inside inventory.Inventory_Stock, so a sale
# is an ISSUE from that store. A requested quantity is filled from the batch
# expiring soonest, then the next, so short-dated stock leaves first and
# nothing quietly expires behind a newer lot.

def _pharmacy_store_id(db: Session) -> int:
    row = db.execute(text("""
        SELECT StoreId FROM admin.Master_Store
         WHERE StoreType = 'Pharmacy Store' AND IsDeleted = 0
         ORDER BY StoreId LIMIT 1""")).first()
    if not row:
        raise HTTPException(status_code=500,
                            detail="No store of type 'Pharmacy Store' is configured")
    return row.StoreId


def _allocate_fefo(db: Session, store_id: int, item_type: str, item_id: int, qty: float):
    """Split `qty` across the store's lots, nearest expiry first.

    Expired lots are excluded - they must be written off, not sold. Raises 409
    when the counter cannot cover the quantity, naming what is short.
    """
    lots = db.execute(text("""
        SELECT BatchNo, Quantity, ExpiryDate
          FROM inventory.Inventory_Stock
         WHERE ItemType = :t AND ItemId = :i AND StoreId = :s AND Quantity > 0
           AND (ExpiryDate IS NULL OR ExpiryDate >= CURDATE())
         ORDER BY ExpiryDate IS NULL, ExpiryDate, BatchNo"""),
        {"t": item_type, "i": item_id, "s": store_id}).fetchall()

    remaining, picked = float(qty), []
    for lot in lots:
        if remaining <= 0:
            break
        take = min(remaining, float(lot.Quantity))
        picked.append({"batchNo": lot.BatchNo, "quantity": take})
        remaining -= take

    if remaining > 0:
        available = sum(float(l.Quantity) for l in lots)
        raise HTTPException(
            status_code=409,
            detail=(f"Insufficient stock at the pharmacy counter: {qty:g} requested, "
                    f"{available:g} available (excluding expired batches)"))
    return picked


def _map_medicine(r) -> dict:
    return {
        "id": str(r.id),
        # Which master owns `id`. The counter sells medicines and priced
        # medical items, and a sale must name the type so the right master and
        # the right stock lots are used.
        "itemType": getattr(r, "itemType", None) or "MEDICINE",
        "name": r.name,
        "category": r.category or "",
        "batchNo": r.batchNo or "",
        "quantity": int(r.quantity or 0),
        "unitPrice": float(r.unitPrice or 0),
        "expiryDate": r.expiryDate.isoformat() if r.expiryDate else "",
        "manufacturer": r.manufacturer or "",
        "minStockLevel": int(r.minStockLevel or 0),
    }


def _map_item(r) -> dict:
    return {
        "medicineId": str(r.MedicineId),
        "itemType": getattr(r, "ItemType", None) or "MEDICINE",
        "batchNo": getattr(r, "BatchNo", None) or "",
        "medicineName": r.MedicineName,
        "quantity": int(r.Quantity),
        "unitPrice": float(r.UnitPrice),
        "subtotal": float(r.Subtotal),
    }


def _map_sale(h, items) -> dict:
    return {
        "saleId": h.SaleId,
        "billId": h.BillNumber,
        "patientName": h.PatientName or "",
        "patientId": h.PatientRef or "",
        "date": h.SaleDate.isoformat() if h.SaleDate else "",
        "items": items,
        "totalAmount": float(h.TotalAmount or 0),
        "discount": float(h.Discount or 0),
        "tax": float(h.Tax or 0),
        "netAmount": float(h.NetAmount or 0),
        "paymentMode": h.PaymentMode or "",
        "paymentStatus": h.PaymentStatus or "",
    }


# ══════════════════════════ MEDICINES / STOCK ══════════════════════════
@router.get("/medicines")
def list_medicines(db: Session = Depends(get_db)):
    try:
        rows = _stock_sp(db, "LIST").fetchall()
        return [_map_medicine(r) for r in rows]
    except Exception as e:
        logger.error(f"[GET /pharmacy/medicines] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch medicines")


@router.get("/medicines/low-stock")
def low_stock(db: Session = Depends(get_db)):
    try:
        rows = _stock_sp(db, "LOWSTOCK").fetchall()
        return [{"id": str(r.id), "name": r.name, "category": r.category or "",
                 "quantity": int(r.quantity or 0), "minStockLevel": int(r.minStockLevel or 0)} for r in rows]
    except Exception as e:
        logger.error(f"[GET /pharmacy/medicines/low-stock] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch low stock")


@router.get("/medicines/expiring")
def expiring(days: int = Query(30, ge=0), db: Session = Depends(get_db)):
    try:
        rows = _stock_sp(db, "EXPIRY", days=days).fetchall()
        return [{"id": str(r.id), "name": r.name, "category": r.category or "",
                 "batchNo": r.batchNo or "", "quantity": int(r.quantity or 0),
                 "expiryDate": r.expiryDate.isoformat() if r.expiryDate else ""} for r in rows]
    except Exception as e:
        logger.error(f"[GET /pharmacy/medicines/expiring] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expiring stock")


@router.put("/stock/{medicine_id}", status_code=200)
def upsert_stock(medicine_id: int, payload: StockUpsert, db: Session = Depends(get_db)):
    try:
        _stock_sp(db, "UPSERT", medicine_id=medicine_id, batch_no=payload.batchNo,
                  quantity=payload.quantity, unit_price=payload.unitPrice,
                  expiry_date=payload.expiryDate or None, min_stock=payload.minStockLevel,
                  user=payload.user or "Admin")
        db.commit()
        return {"id": str(medicine_id)}
    except Exception as e:
        db.rollback()
        logger.error(f"[PUT /pharmacy/stock/{medicine_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to update stock")


@router.post("/stock/{medicine_id}/adjust", status_code=200)
def adjust_stock(medicine_id: int, payload: StockAdjust, db: Session = Depends(get_db)):
    """Manual stock correction at the pharmacy counter.

    Posts a real ADJUSTMENT document to the inventory ledger rather than
    editing a quantity in place, so a correction is as auditable as a receipt
    or a sale. A decrease is applied FEFO across the counter's batches; an
    increase needs a batch to land on, so it goes to the batch expiring
    soonest, or to 'OPENING' when the counter holds none.
    """
    store_id = _pharmacy_store_id(db)
    delta = float(payload.delta)
    if delta == 0:
        raise HTTPException(status_code=400, detail="Adjustment quantity cannot be zero")
    try:
        if delta < 0:
            lines = [{
                "itemId": medicine_id, "itemType": "MEDICINE", "batchNo": part["batchNo"],
                "mfgDate": None, "expiryDate": None, "quantity": -part["quantity"],
                "rate": 0, "uom": None, "remarks": "Manual counter correction",
            } for part in _allocate_fefo(db, store_id, "MEDICINE", medicine_id, -delta)]
        else:
            row = db.execute(text("""
                SELECT BatchNo FROM inventory.Inventory_Stock
                 WHERE ItemType = 'MEDICINE' AND ItemId = :i AND StoreId = :s
                 ORDER BY ExpiryDate IS NULL, ExpiryDate LIMIT 1"""),
                {"i": medicine_id, "s": store_id}).first()
            lines = [{
                "itemId": medicine_id, "itemType": "MEDICINE",
                "batchNo": row.BatchNo if row else "OPENING",
                "mfgDate": None, "expiryDate": None, "quantity": delta,
                "rate": 0, "uom": None, "remarks": "Manual counter correction",
            }]

        db.execute(text("""
            CALL inventory.SpInvDocument('CREATE', NULL, 'ADJUSTMENT', :store, NULL, NULL,
                 NULL, NULL, NULL, NULL, 'Manual pharmacy stock correction',
                 NULL, :items, NULL, NULL, :user)"""),
            {"store": store_id, "items": json.dumps(lines),
             "user": payload.user or "Admin"}).fetchall()
        db.commit()
        return {"id": str(medicine_id)}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /pharmacy/stock/{medicine_id}/adjust] {e}")
        raise HTTPException(status_code=500, detail="Failed to adjust stock")


# ══════════════════════════ SALES ══════════════════════════
@router.get("/sales")
def list_sales(from_date: Optional[str] = Query(None, alias="from"),
               to_date: Optional[str] = Query(None, alias="to"),
               db: Session = Depends(get_db)):
    try:
        headers = _sale_sp(db, "LIST", from_date=from_date, to_date=to_date).fetchall()
        item_rows = _sale_sp(db, "LISTITEMS", from_date=from_date, to_date=to_date).fetchall()
        by_sale: dict = {}
        for it in item_rows:
            by_sale.setdefault(it.SaleId, []).append(_map_item(it))
        return [_map_sale(h, by_sale.get(h.SaleId, [])) for h in headers]
    except Exception as e:
        logger.error(f"[GET /pharmacy/sales] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sales")


@router.get("/sales/{sale_id}")
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    try:
        h = _sale_sp(db, "GETBYID", sale_id=sale_id).fetchone()
        if not h:
            raise HTTPException(status_code=404, detail="Sale not found")
        items = [_map_item(r) for r in _sale_sp(db, "ITEMS", sale_id=sale_id).fetchall()]
        return _map_sale(h, items)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /pharmacy/sales/{sale_id}] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sale")


@router.post("/sales", status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    """Sell from the pharmacy counter.

    The sale is posted as an inventory ISSUE from the Pharmacy Store before the
    bill is written, so stock, valuation and the ledger all move together. Each
    requested quantity is allocated FEFO and the bill records one line per
    batch consumed. Both steps share one transaction: if either fails nothing
    is committed, so a bill can never exist without the stock movement behind it.
    """
    store_id = _pharmacy_store_id(db)

    # 1. Allocate every line to real batches before anything is written.
    sale_lines, movement_lines = [], []
    for it in payload.items:
        item_type = getattr(it, "itemType", None) or "MEDICINE"
        for part in _allocate_fefo(db, store_id, item_type, it.medicineId, it.quantity):
            sale_lines.append({
                "medicineId": it.medicineId, "itemType": item_type,
                "medicineName": it.medicineName, "batchNo": part["batchNo"],
                "quantity": part["quantity"], "unitPrice": it.unitPrice,
                "subtotal": round(part["quantity"] * it.unitPrice, 2),
            })
            movement_lines.append({
                "itemId": it.medicineId, "itemType": item_type,
                "batchNo": part["batchNo"], "mfgDate": None, "expiryDate": None,
                "quantity": part["quantity"], "rate": 0, "uom": None,
                "remarks": "Pharmacy counter sale",
            })

    items_json = json.dumps(sale_lines)
    try:
        # 2. Move the stock. SpInvStockPost refuses to take a lot negative, so
        #    this is the single guard against overselling.
        db.execute(text("""
            CALL inventory.SpInvDocument('CREATE', NULL, 'ISSUE', :store, NULL,
                 'Pharmacy Counter', NULL, NULL, NULL, NULL, NULL,
                 'Pharmacy POS sale', :items, NULL, NULL, :user)"""),
            {"store": store_id, "items": json.dumps(movement_lines),
             "user": payload.user or "Admin"}).fetchall()

        # 3. Write the bill against the same transaction.
        row = _sale_sp(db, "CREATE",
                       patient_name=payload.patientName, patient_ref=payload.patientRef,
                       total_amount=payload.totalAmount, discount=payload.discount,
                       tax=payload.tax, net_amount=payload.netAmount,
                       payment_mode=payload.paymentMode.value,
                       payment_status=payload.paymentStatus.value,
                       items=items_json, user=payload.user or "Admin").fetchone()
        db.commit()
        return {"saleId": row.SaleId, "billId": row.BillNumber}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        msg = str(getattr(e, "orig", e))
        if "Insufficient stock" in msg:
            raise HTTPException(status_code=409, detail="Insufficient stock for one or more items")
        logger.error(f"[POST /pharmacy/sales] {e}")
        raise HTTPException(status_code=500, detail="Failed to create sale")


@router.post("/sales/{sale_id}/refund", status_code=200)
def refund_sale(sale_id: int, db: Session = Depends(get_db)):
    """Refund a bill and put the stock back into the batches it came from.

    Returning by medicine alone would be wrong once stock is batch tracked: the
    quantity would land on whichever lot happened to be found, corrupting both
    expiry tracking and valuation. The sale lines record the batch, so the
    return goes back exactly where it came from.
    """
    store_id = _pharmacy_store_id(db)
    try:
        lines = db.execute(text("""
            SELECT MedicineId, ItemType, MedicineName, BatchNo, Quantity
              FROM hospital.Pharmacy_SaleItem WHERE SaleId = :sid"""),
            {"sid": sale_id}).fetchall()
        if not lines:
            raise HTTPException(status_code=404, detail="Sale not found")

        # Lines sold before batch tracking have no batch; those cannot be put
        # back automatically without guessing a lot, so they are refused rather
        # than silently landing on the wrong batch.
        unbatched = [l.MedicineName for l in lines if not (l.BatchNo or "").strip()]
        if unbatched:
            raise HTTPException(
                status_code=409,
                detail=("This bill predates batch tracking and has no batch on: "
                        + ", ".join(unbatched)
                        + ". Restore the stock with a manual inventory adjustment."))

        db.execute(text("""
            CALL inventory.SpInvDocument('CREATE', NULL, 'RETURN', NULL, :store, NULL,
                 NULL, NULL, NULL, NULL, NULL, :remarks, :items, NULL, NULL, :user)"""),
            {"store": store_id, "remarks": f"Refund of pharmacy sale {sale_id}",
             "items": json.dumps([{
                 "itemId": l.MedicineId, "itemType": l.ItemType or "MEDICINE",
                 "batchNo": l.BatchNo, "mfgDate": None, "expiryDate": None,
                 "quantity": float(l.Quantity), "rate": 0, "uom": None,
                 "remarks": "Pharmacy sale refund",
             } for l in lines]),
             "user": "Admin"}).fetchall()

        _sale_sp(db, "REFUND", sale_id=sale_id, user="Admin")
        db.commit()
        return {"saleId": sale_id, "paymentStatus": "Refunded"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[POST /pharmacy/sales/{sale_id}/refund] {e}")
        raise HTTPException(status_code=500, detail="Failed to refund sale")


@router.patch("/sales/{sale_id}/status", status_code=200)
def update_status(sale_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    try:
        _sale_sp(db, "UPDATESTATUS", sale_id=sale_id,
                 payment_status=payload.paymentStatus.value, user=payload.user or "Admin")
        db.commit()
        return {"saleId": sale_id, "paymentStatus": payload.paymentStatus.value}
    except Exception as e:
        db.rollback()
        logger.error(f"[PATCH /pharmacy/sales/{sale_id}/status] {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")
