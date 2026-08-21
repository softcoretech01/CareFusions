"""Unified Inventory migration — PHASE 6 (pharmacy stock becomes ledger stock).

Run:  python run_sql_unified_inventory_phase6.py

Moves hospital.Pharmacy_Stock into inventory.Inventory_Stock at the Pharmacy
Store, so there is ONE stock engine for medicines, medical items and
non-medical items.

How, and why this way:
  * The quantities are posted as a single opening-balance ADJUSTMENT document
    through SpInvDocument -> SpInvStockPost, NOT inserted straight into the
    stock table. That is what gives every migrated quantity a real ledger row,
    a document number and an audit trail, exactly like any other movement.
  * A lot with no batch number in the source is brought in as BatchNo
    'OPENING'. Real batch numbers are preserved. No expiry date is invented:
    rows without one arrive without one, and real batches start at the next GRN.
  * hospital.Pharmacy_Stock is copied to Pharmacy_Stock_Backup_UIM first and is
    NOT dropped - it is retained for at least one release (spec §17).

Idempotent: the opening document is tagged ReferenceNo = 'UIM-OPENING'. If it
already exists the script reports and exits without posting again.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json

from sqlalchemy import text

from app.database import engine

OPENING_REF = "UIM-OPENING"
OPENING_BATCH = "OPENING"


def pharmacy_store_id(con) -> int:
    row = con.execute(text("""
        SELECT StoreId FROM admin.Master_Store
         WHERE StoreType = 'Pharmacy Store' AND IsDeleted = 0
         ORDER BY StoreId LIMIT 1""")).first()
    if not row:
        sys.exit("ABORT: no store of type 'Pharmacy Store' exists in Master_Store.")
    return row.StoreId


def backup(con):
    con.execute(text("""
        CREATE TABLE IF NOT EXISTS hospital.Pharmacy_Stock_Backup_UIM
            AS SELECT * FROM hospital.Pharmacy_Stock"""))
    con.commit()
    src = con.execute(text("SELECT COUNT(*) FROM hospital.Pharmacy_Stock")).scalar()
    bak = con.execute(text("SELECT COUNT(*) FROM hospital.Pharmacy_Stock_Backup_UIM")).scalar()
    print(f"== backup ==\n   hospital.Pharmacy_Stock {src} -> Pharmacy_Stock_Backup_UIM {bak}")
    if bak < src:
        sys.exit("ABORT: backup is smaller than the source. Not migrating.")


def already_posted(con):
    return con.execute(text("""
        SELECT DocId, DocNumber FROM inventory.Inventory_Document
         WHERE ReferenceNo = :ref ORDER BY DocId LIMIT 1"""), {"ref": OPENING_REF}).first()


def build_lines(con, store_id):
    """One line per pharmacy lot, skipping anything already in the ledger."""
    rows = con.execute(text("""
        SELECT s.MedicineId, s.BatchNo, s.Quantity, s.UnitPrice, s.ExpiryDate,
               m.GenericName, m.Unit
          FROM hospital.Pharmacy_Stock s
          JOIN admin.Master_Medicine m ON m.MedicineId = s.MedicineId
         WHERE s.Quantity > 0
         ORDER BY s.MedicineId""")).fetchall()

    lines, skipped = [], []
    for r in rows:
        batch = (r.BatchNo or "").strip() or OPENING_BATCH
        exists = con.execute(text("""
            SELECT Quantity FROM inventory.Inventory_Stock
             WHERE ItemType = 'MEDICINE' AND ItemId = :id AND StoreId = :st AND BatchNo = :b"""),
            {"id": r.MedicineId, "st": store_id, "b": batch}).scalar()
        if exists is not None:
            skipped.append(f"{r.GenericName} batch {batch} (already holds {exists})")
            continue
        lines.append({
            "itemId": r.MedicineId,
            "itemType": "MEDICINE",
            "batchNo": batch,
            "mfgDate": None,
            # Never invented: whatever the pharmacy row carried, including nothing.
            "expiryDate": r.ExpiryDate.isoformat() if r.ExpiryDate else None,
            "quantity": float(r.Quantity),
            "rate": float(r.UnitPrice or 0),
            "uom": r.Unit,
            "remarks": f"Opening balance migrated from Pharmacy_Stock"
                       + ("" if (r.BatchNo or "").strip() else " (source had no batch number)"),
        })
    return lines, skipped


def post_opening(con, store_id, lines):
    res = con.execute(text("""
        CALL inventory.SpInvDocument('CREATE', NULL, 'ADJUSTMENT', :store, NULL, NULL, NULL,
             :ref, 'Unified inventory migration', NULL,
             'Opening balance: pharmacy stock moved into the unified inventory ledger',
             'Phase 6 migration', :items, NULL, NULL, 'UIM-Phase6')"""),
        {"store": store_id, "ref": OPENING_REF, "items": json.dumps(lines)}).fetchall()
    con.commit()
    return res[0] if res else None


def verify(con, store_id):
    print("\n== verification ==")
    rows = con.execute(text("""
        SELECT m.MedicineCode, m.GenericName,
               COALESCE(p.Quantity, 0)  AS PharmQty,
               COALESCE(SUM(i.Quantity), 0) AS LedgerQty,
               GROUP_CONCAT(i.BatchNo)  AS Batches
          FROM admin.Master_Medicine m
          LEFT JOIN hospital.Pharmacy_Stock p ON p.MedicineId = m.MedicineId
          LEFT JOIN inventory.Inventory_Stock i
                 ON i.ItemType = 'MEDICINE' AND i.ItemId = m.MedicineId AND i.StoreId = :st
         WHERE m.IsDeleted = 0
         GROUP BY m.MedicineId, m.MedicineCode, m.GenericName, p.Quantity
         ORDER BY m.MedicineCode"""), {"st": store_id}).fetchall()

    ok = True
    for r in rows:
        match = float(r.PharmQty) == float(r.LedgerQty)
        ok = ok and match
        print(f"   [{'OK ' if match else 'DIFF'}] {r.MedicineCode:<8} {r.GenericName:<14}"
              f" pharmacy {r.PharmQty:>6} -> ledger {r.LedgerQty:>8}  batches: {r.Batches or '-'}")

    led = con.execute(text("""
        SELECT COUNT(*) FROM inventory.Inventory_StockLedger
         WHERE ItemType = 'MEDICINE' AND DocType = 'ADJUSTMENT'""")).scalar()
    print(f"\n   Medicine ledger rows: {led}")
    print("   Pharmacy_Stock retained:",
          "yes" if con.execute(text(
              "SELECT COUNT(*) FROM hospital.Pharmacy_Stock")).scalar() else "EMPTY")
    return ok


def main():
    with engine.connect() as con:
        store_id = pharmacy_store_id(con)
        print(f"Pharmacy Store = StoreId {store_id}\n")
        backup(con)

        done = already_posted(con)
        if done:
            print(f"\n== already migrated ==\n   Opening document {done.DocNumber} "
                  f"(DocId {done.DocId}) exists. Nothing posted.")
            verify(con, store_id)
            return

        lines, skipped = build_lines(con, store_id)
        print(f"\n== opening balances ==\n   {len(lines)} lot(s) to post")
        for s in skipped:
            print(f"   skipped: {s}")
        if not lines:
            print("   Nothing to migrate.")
            verify(con, store_id)
            return

        doc = post_opening(con, store_id, lines)
        print(f"   Posted as {doc.DocNumber} (DocId {doc.DocId})" if doc else "   Posted")
        verify(con, store_id)
    print("\nPhase 6 done.")


if __name__ == "__main__":
    main()
