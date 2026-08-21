-- ============================================================
-- Unified Inventory / Procurement / Pharmacy — PHASE 0
-- Purpose : Safety backups taken before the Type/Category
--           migration touches any master data.
-- Scope   : ADDITIVE ONLY. This script never updates or deletes
--           a live row, so it is safe to re-run (init_db.py
--           applies every *.sql in this folder on each run).
--
-- Backups are plain table copies suffixed _Backup_UIM
-- (UIM = Unified Inventory Migration). They are retained for at
-- least one release per spec §17/§35 and are dropped only after
-- production validation.
--
-- Phase 0 audit result (recorded 2026-08-21):
--   Master_Item holds 10 rows, none of which are drugs, so no
--   item->medicine data migration is required. The drug rows that
--   appeared to live in the Item Master were a frontend mock array
--   (ItemMaster.tsx), removed in the same phase.
-- ============================================================

CREATE DATABASE IF NOT EXISTS admin;

-- ── Master_Item ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin.Master_Item_Backup_UIM
    AS SELECT * FROM admin.Master_Item;

-- ── Master_Category ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin.Master_Category_Backup_UIM
    AS SELECT * FROM admin.Master_Category;

-- ── Master_SubCategory ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin.Master_SubCategory_Backup_UIM
    AS SELECT * FROM admin.Master_SubCategory;

-- ── Master_MedicineCategory ─────────────────────────────────
-- Merged into Master_Category in Phase 1; the original rows
-- (including operator-entered ones) are preserved here first.
CREATE TABLE IF NOT EXISTS admin.Master_MedicineCategory_Backup_UIM
    AS SELECT * FROM admin.Master_MedicineCategory;

-- ── Master_Medicine ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin.Master_Medicine_Backup_UIM
    AS SELECT * FROM admin.Master_Medicine;
