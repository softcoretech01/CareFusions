"""Unified Inventory migration — PHASE 1 (one canonical Type/Category tree).

Run:  python run_sql_unified_inventory_phase1.py

Applies, in order:
  1. sql/category_master.sql          - SpMasterCategory gains the InventoryType
                                        filter + canonical-value validation.
  2. sql/unified_inventory_phase1.sql - backfills InventoryType, merges
                                        Master_MedicineCategory into
                                        Master_Category, adds Medicine.SubCategory.
  3. NOT NULL on Master_Category.InventoryType - only when every row is
     classified. If anything is still unclassified the column is left nullable
     and the offending rows are printed, rather than guessing a value (§33).

Then verifies the result. Re-runnable: every step is idempotent.
Phase 0 (backups) must have been run first.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path

from sqlalchemy import text

from app.database import engine
from init_db import split_statements

SQL_DIR = Path(__file__).parent / "sql"
CANONICAL = ("MEDICINE", "MEDICAL_ITEM", "NON_MEDICAL")


def require_phase0(con):
    missing = [t for t in ("Master_Category_Backup_UIM", "Master_MedicineCategory_Backup_UIM")
               if not con.execute(text("""
                    SELECT COUNT(*) FROM information_schema.TABLES
                     WHERE TABLE_SCHEMA = 'admin' AND TABLE_NAME = :t"""),
                                  {"t": t}).scalar()]
    if missing:
        sys.exit(f"ABORT: Phase 0 backups missing ({', '.join(missing)}). "
                 f"Run run_sql_unified_inventory_phase0.py first.")


def apply_file(con, name):
    print(f"== applying {name} ==")
    for stmt in split_statements((SQL_DIR / name).read_text(encoding="utf-8")):
        con.execute(text(stmt))
    con.commit()


def enforce_not_null(con):
    print("\n== enforcing NOT NULL on Master_Category.InventoryType ==")
    bad = con.execute(text(f"""
        SELECT CategoryId, CategoryName, COALESCE(InventoryType, '(NULL)') AS TypeName
          FROM admin.Master_Category
         WHERE IsDeleted = 0
           AND (InventoryType IS NULL OR InventoryType NOT IN {CANONICAL})
    """)).fetchall()
    if bad:
        print(f"   SKIPPED - {len(bad)} row(s) still unclassified; column stays nullable:")
        for r in bad:
            print(f"   - {r.CategoryId} {r.CategoryName} = {r.TypeName}")
        print("   Classify them in the Category master, then re-run this script.")
        return False
    con.execute(text("""
        ALTER TABLE admin.Master_Category
        MODIFY COLUMN InventoryType VARCHAR(50) NOT NULL
    """))
    con.commit()
    print("   OK - every category is classified; column is now NOT NULL.")
    return True


def verify(con):
    print("\n== verification ==")
    print("   Categories by type:")
    for r in con.execute(text("""
            SELECT COALESCE(InventoryType, '(NULL)') AS TypeName, COUNT(*) AS RowCnt
              FROM admin.Master_Category WHERE IsDeleted = 0
             GROUP BY TypeName ORDER BY TypeName""")).fetchall():
        print(f"   - {r.TypeName:<14} {r.RowCnt}")

    orphan = con.execute(text("""
        SELECT COUNT(*) FROM admin.Master_MedicineCategory mc
         WHERE NOT EXISTS (SELECT 1 FROM admin.Master_Category c
                            WHERE LOWER(c.CategoryName) = LOWER(mc.CategoryName)
                              AND c.IsDeleted = 0)
    """)).scalar()
    print(f"   Medicine categories not yet in Master_Category: {orphan}")

    has_sub = con.execute(text("""
        SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = 'admin' AND TABLE_NAME = 'Master_Medicine'
           AND COLUMN_NAME = 'SubCategory'""")).scalar()
    print(f"   Master_Medicine.SubCategory present: {'yes' if has_sub else 'NO'}")

    # No data may be lost by this phase.
    for src, bak in (("admin.Master_Category", "admin.Master_Category_Backup_UIM"),
                     ("admin.Master_Item", "admin.Master_Item_Backup_UIM"),
                     ("admin.Master_Medicine", "admin.Master_Medicine_Backup_UIM")):
        now = con.execute(text(f"SELECT COUNT(*) FROM {src}")).scalar()
        was = con.execute(text(f"SELECT COUNT(*) FROM {bak}")).scalar()
        state = "OK" if now >= was else "DATA LOSS"
        print(f"   [{state}] {src}: {was} before -> {now} after")

    # The SP must reject a non-canonical type.
    try:
        con.execute(text("""CALL SpMasterCategory('INSERT', NULL, '__uim_probe__', 'Medical',
                             NULL, 1, 0, 0, 0, NULL, 'Active', 'probe', NULL, NULL, NULL, NULL)"""))
        con.rollback()
        print("   [FAIL] SP accepted legacy value 'Medical' - validation not active")
    except Exception as e:
        con.rollback()
        ok = "INVALID_INVENTORY_TYPE" in str(e)
        print(f"   [{'OK' if ok else 'FAIL'}] SP rejects a non-canonical type"
              + ("" if ok else f" - got: {str(e)[:120]}"))


def main():
    with engine.connect() as con:
        require_phase0(con)
        apply_file(con, "category_master.sql")
        apply_file(con, "unified_inventory_phase1.sql")
        enforce_not_null(con)
        verify(con)
    print("\nPhase 1 done.")


if __name__ == "__main__":
    main()
