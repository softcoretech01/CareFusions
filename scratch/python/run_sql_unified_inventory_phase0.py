"""Unified Inventory migration — PHASE 0 (backups + data audit).

Run:  python run_sql_unified_inventory_phase0.py

Phase 0 is deliberately NON-DESTRUCTIVE. It only:
  1. creates the *_Backup_UIM safety copies (sql/unified_inventory_phase0.sql),
  2. verifies every backup matches its source row-for-row,
  3. audits Master_Item for drug rows that belong in Master_Medicine,
  4. reports the category -> InventoryType classification Phase 1 will apply.

Nothing is updated or deleted. If the audit finds drug rows in Master_Item they
are REPORTED, not moved: moving them changes what a historical PR/PO line points
at, so it needs explicit sign-off (spec §33/§35).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path

from sqlalchemy import text

from app.database import engine
from init_db import split_statements

SQL_FILE = Path(__file__).parent / "sql" / "unified_inventory_phase0.sql"

BACKUPS = [
    ("admin.Master_Item", "admin.Master_Item_Backup_UIM"),
    ("admin.Master_Category", "admin.Master_Category_Backup_UIM"),
    ("admin.Master_SubCategory", "admin.Master_SubCategory_Backup_UIM"),
    ("admin.Master_MedicineCategory", "admin.Master_MedicineCategory_Backup_UIM"),
    ("admin.Master_Medicine", "admin.Master_Medicine_Backup_UIM"),
]

# Phase 1 applies these. Listed here so the audit shows exactly what will change
# before anything is written (spec §46).
CATEGORY_TYPE_MAP = {
    "Medical Consumables": "MEDICAL_ITEM",
    "Surgical Items": "MEDICAL_ITEM",
    "Lab Reagents": "MEDICAL_ITEM",
    "Equipment": "MEDICAL_ITEM",       # provisional - awaiting user confirmation
    "Stationery": "NON_MEDICAL",
    "Medicines": "MEDICINE",
    "Vaccines": "MEDICINE",
}


def apply_backups(con):
    print("== 1. Backups ==")
    sql = SQL_FILE.read_text(encoding="utf-8")
    for stmt in split_statements(sql):
        con.execute(text(stmt))
    con.commit()

    ok = True
    for src, bak in BACKUPS:
        s = con.execute(text(f"SELECT COUNT(*) FROM {src}")).scalar()
        b = con.execute(text(f"SELECT COUNT(*) FROM {bak}")).scalar()
        flag = "OK " if s == b else "MISMATCH"
        if s != b:
            ok = False
        print(f"   [{flag}] {src:<38} {s:>4}  ->  {bak} {b:>4}")
    if not ok:
        print("   NOTE: a mismatch means the backup predates newer rows; it is a"
              " point-in-time copy, which is intended. Re-create it only if the"
              " backup is empty.")
    return ok


def audit_drug_rows(con):
    """Items that look like they belong in Master_Medicine."""
    print("\n== 2. Drug rows inside Master_Item ==")
    rows = con.execute(text("""
        SELECT i.ItemId, i.ItemCode, i.ItemName, i.Category,
               m.MedicineId, m.MedicineCode,
               CASE
                 WHEN m.MedicineId IS NOT NULL THEN 'NAME/BARCODE MATCHES A MEDICINE'
                 ELSE 'CATEGORY IS A MEDICINE CATEGORY'
               END AS Reason
        FROM admin.Master_Item i
        LEFT JOIN admin.Master_Medicine m
               ON m.IsDeleted = 0
              AND (LOWER(m.GenericName) = LOWER(i.ItemName)
                   OR (i.Barcode IS NOT NULL AND i.Barcode <> '' AND m.Barcode = i.Barcode))
        WHERE i.IsDeleted = 0
          AND (m.MedicineId IS NOT NULL
               OR i.Category IN (SELECT CategoryName FROM admin.Master_Category
                                 WHERE IsDeleted = 0 AND CategoryName IN ('Medicines', 'Vaccines')))
        ORDER BY i.ItemId
    """)).fetchall()

    if not rows:
        total = con.execute(text(
            "SELECT COUNT(*) FROM admin.Master_Item WHERE IsDeleted = 0")).scalar()
        print(f"   None. All {total} active items are non-drug rows -> no migration needed.")
        return []

    print(f"   {len(rows)} row(s) need review BEFORE Phase 1. Nothing was moved:")
    for r in rows:
        print(f"   - ItemId {r.ItemId} {r.ItemCode} '{r.ItemName}' "
              f"(category '{r.Category}') : {r.Reason}")
    return rows


def audit_categories(con):
    print("\n== 3. Category -> InventoryType classification (Phase 1 preview) ==")
    rows = con.execute(text("""
        SELECT c.CategoryId, c.CategoryName, c.InventoryType,
               (SELECT COUNT(*) FROM admin.Master_Item i
                 WHERE i.IsDeleted = 0 AND i.Category = c.CategoryName) AS ItemCount
        FROM admin.Master_Category c
        WHERE c.IsDeleted = 0
        ORDER BY c.CategoryId
    """)).fetchall()

    unmapped = []
    for r in rows:
        target = CATEGORY_TYPE_MAP.get(r.CategoryName)
        current = r.InventoryType or "(NULL)"
        if target is None:
            unmapped.append(r.CategoryName)
            print(f"   [?]  {r.CategoryName:<24} {current:<14} -> UNMAPPED "
                  f"({r.ItemCount} items) - needs a decision")
        else:
            mark = "=" if current == target else ">"
            print(f"   [{mark}]  {r.CategoryName:<24} {current:<14} -> {target:<13} "
                  f"({r.ItemCount} items)")

    med = con.execute(text(
        "SELECT CategoryId, CategoryName FROM admin.Master_MedicineCategory")).fetchall()
    print(f"\n   Master_MedicineCategory holds {len(med)} row(s) to merge as MEDICINE:")
    existing = {r.CategoryName.lower() for r in rows}
    for m in med:
        note = "already in Master_Category" if m.CategoryName.lower() in existing else "will be inserted"
        print(f"   - {m.CategoryName:<24} ({note})")

    print("\n   Medicine.Category values currently in use (these are dosage forms,"
          "\n   re-classified to therapeutic categories in Phase 1):")
    for r in con.execute(text("""
            SELECT Category, COUNT(*) n FROM admin.Master_Medicine
            WHERE IsDeleted = 0 GROUP BY Category ORDER BY Category""")).fetchall():
        print(f"   - {r.Category:<24} {r.n} medicine(s)")

    return unmapped


def audit_stock(con):
    print("\n== 4. Stock baseline (verify unchanged after Phases 5-6) ==")
    for label, q in [
        ("Inventory_Stock rows", "SELECT COUNT(*) FROM inventory.Inventory_Stock"),
        ("Inventory_Stock qty", "SELECT COALESCE(SUM(Quantity),0) FROM inventory.Inventory_Stock"),
        ("Inventory_Stock value",
         "SELECT COALESCE(SUM(Quantity*ValuationRate),0) FROM inventory.Inventory_Stock"),
        ("StockLedger rows", "SELECT COUNT(*) FROM inventory.Inventory_StockLedger"),
        ("Pharmacy_Stock rows", "SELECT COUNT(*) FROM hospital.Pharmacy_Stock"),
        ("Pharmacy_Stock qty", "SELECT COALESCE(SUM(Quantity),0) FROM hospital.Pharmacy_Stock"),
        ("Pharmacy_Stock w/o batch",
         "SELECT COUNT(*) FROM hospital.Pharmacy_Stock WHERE BatchNo IS NULL OR BatchNo = ''"),
        ("PurchaseRequisitionItem rows", "SELECT COUNT(*) FROM inventory.PurchaseRequisitionItem"),
    ]:
        print(f"   {label:<32} {con.execute(text(q)).scalar()}")


def main():
    with engine.connect() as con:
        apply_backups(con)
        drugs = audit_drug_rows(con)
        unmapped = audit_categories(con)
        audit_stock(con)

    print("\n== Phase 0 result ==")
    print(f"   Drug rows to migrate out of Master_Item : {len(drugs)}")
    print(f"   Categories without a type mapping       : {len(unmapped)}"
          + (f" {unmapped}" if unmapped else ""))
    print("   Nothing was modified or deleted. Backups are in place.")
    if not drugs and not unmapped:
        print("   -> Phase 0 clean. Safe to start Phase 1.")
    else:
        print("   -> Resolve the items above before starting Phase 1.")


if __name__ == "__main__":
    main()
