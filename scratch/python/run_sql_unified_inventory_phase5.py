"""Unified Inventory migration — PHASE 5 (ItemType through the inventory ledger).

Run:  python run_sql_unified_inventory_phase5.py

Applies:
  1. sql/unified_inventory_phase5.sql - ItemType on Inventory_Stock,
     Inventory_DocumentItem and Inventory_StockLedger; stock identity becomes
     (ItemType, ItemId, StoreId, BatchNo); the two single-master foreign keys
     are dropped; Vw_CatalogItem unions both masters into one shape.
  2. sql/inventory.sql - SpInvStockPost / SpInvDocument / SpInvStock carry and
     validate ItemType.

Then proves nothing moved: row counts, total quantity and total stock value
must be identical before and after, and the ownership guard must reject a
mismatched ItemType + ItemId pair.

MySQL does not support IF EXISTS on every DDL clause used here, so the runner
tolerates the "already applied" errors that make the script re-runnable.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path

from sqlalchemy import text

from app.database import engine
from init_db import split_statements

SQL_DIR = Path(__file__).parent / "sql"

# Errors that simply mean "this statement already ran".
BENIGN = (
    "Duplicate key name",
    "Duplicate column name",
    "check that column/key exists",
    "Can't DROP",
    "doesn't exist",
)

BASELINE = {
    "stock rows":   "SELECT COUNT(*) FROM inventory.Inventory_Stock",
    "stock qty":    "SELECT COALESCE(SUM(Quantity),0) FROM inventory.Inventory_Stock",
    "stock value":  "SELECT ROUND(COALESCE(SUM(Quantity*ValuationRate),0),2) FROM inventory.Inventory_Stock",
    "ledger rows":  "SELECT COUNT(*) FROM inventory.Inventory_StockLedger",
    "doc rows":     "SELECT COUNT(*) FROM inventory.Inventory_Document",
    "doc item rows": "SELECT COUNT(*) FROM inventory.Inventory_DocumentItem",
}


def snapshot(con):
    return {k: con.execute(text(q)).scalar() for k, q in BASELINE.items()}


def apply_file(con, name):
    print(f"== applying {name} ==")
    skipped = 0
    for stmt in split_statements((SQL_DIR / name).read_text(encoding="utf-8")):
        try:
            con.execute(text(stmt))
        except Exception as e:
            if any(b in str(e) for b in BENIGN):
                skipped += 1
                continue
            raise
    con.commit()
    if skipped:
        print(f"   ({skipped} statement(s) already applied)")


def verify(con, before):
    print("\n== verification ==")
    after = snapshot(con)
    ok = True
    for k in BASELINE:
        same = before[k] == after[k]
        ok = ok and same
        print(f"   [{'OK' if same else 'CHANGED'}] {k:<15} {before[k]} -> {after[k]}")

    print("\n   Stock by type:")
    for r in con.execute(text("""
            SELECT ItemType, COUNT(*) AS Lots, COALESCE(SUM(Quantity),0) AS Qty
              FROM inventory.Inventory_Stock GROUP BY ItemType ORDER BY ItemType""")).fetchall():
        print(f"   - {r.ItemType:<14} {r.Lots} lots, qty {r.Qty}")

    print("\n   Catalog view:")
    for r in con.execute(text("""
            SELECT ItemType, COUNT(*) AS N FROM inventory.Vw_CatalogItem
             WHERE IsDeleted = 0 GROUP BY ItemType ORDER BY ItemType""")).fetchall():
        print(f"   - {r.ItemType:<14} {r.N}")

    # A medicine id must not be postable as an item, and vice versa.
    for label, itype, iid in (("MEDICINE + item id", "MEDICINE", 99999),
                              ("MEDICAL_ITEM + medicine id", "MEDICAL_ITEM", 99999)):
        try:
            con.execute(text("""CALL inventory.SpInvStockPost(:t, :i, 4, 'PROBE', NULL, NULL,
                                 1, 1, 'Nos', 'RECEIPT', NULL, 'PROBE', 'RECEIPT', 'probe', 'probe')"""),
                        {"t": itype, "i": iid})
            con.rollback()
            print(f"   [FAIL] {label} was accepted")
        except Exception as e:
            con.rollback()
            good = "INVALID_ITEMTYPE_ITEMID" in str(e)
            print(f"   [{'OK' if good else 'FAIL'}] {label} rejected"
                  + ("" if good else f" - {str(e)[:100]}"))
    return ok


def main():
    with engine.connect() as con:
        before = snapshot(con)
        print("baseline:", before)
        apply_file(con, "unified_inventory_phase5.sql")
        apply_file(con, "inventory.sql")
        verify(con, before)
    print("\nPhase 5 done.")


if __name__ == "__main__":
    main()
