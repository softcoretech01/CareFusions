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
def _map_medicine(r) -> dict:
    return {
        "id": str(r.id),
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
    try:
        _stock_sp(db, "ADJUST", medicine_id=medicine_id, quantity=payload.delta,
                  user=payload.user or "Admin")
        db.commit()
        return {"id": str(medicine_id)}
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
    items_json = json.dumps([{
        "medicineId": it.medicineId, "medicineName": it.medicineName,
        "quantity": it.quantity, "unitPrice": it.unitPrice, "subtotal": it.subtotal,
    } for it in payload.items])
    try:
        row = _sale_sp(db, "CREATE",
                       patient_name=payload.patientName, patient_ref=payload.patientRef,
                       total_amount=payload.totalAmount, discount=payload.discount,
                       tax=payload.tax, net_amount=payload.netAmount,
                       payment_mode=payload.paymentMode.value,
                       payment_status=payload.paymentStatus.value,
                       items=items_json, user=payload.user or "Admin").fetchone()
        db.commit()
        return {"saleId": row.SaleId, "billId": row.BillNumber}
    except Exception as e:
        db.rollback()
        msg = str(getattr(e, "orig", e))
        if "Insufficient stock" in msg:
            raise HTTPException(status_code=409, detail="Insufficient stock for one or more items")
        logger.error(f"[POST /pharmacy/sales] {e}")
        raise HTTPException(status_code=500, detail="Failed to create sale")


@router.post("/sales/{sale_id}/refund", status_code=200)
def refund_sale(sale_id: int, db: Session = Depends(get_db)):
    try:
        _sale_sp(db, "REFUND", sale_id=sale_id, user="Admin")
        db.commit()
        return {"saleId": sale_id, "paymentStatus": "Refunded"}
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
