-- ==============================================================================
-- Remove Department from the lab test master
-- ==============================================================================
-- test_master.sql no longer declares Master_LabTest.Department, but
-- CREATE TABLE IF NOT EXISTS never alters a table that already exists — so an
-- existing database needs this.
--
-- NOTE: this drops a COLUMN, not the shared Master_Department table. That table
-- is owned by department_master.sql and is still used by the Department master,
-- PRO and billing. Do not drop it.
--
-- test_master.sql also used to declare its own 2-column Master_Department with
-- a seed, which would have created the WRONG table (no Status, no IsDeleted) had
-- it ever run before department_master.sql. That stub is gone; nothing here
-- needs to repair it, because the correct definition already wins on every
-- existing database.
--
-- ORDER MATTERS. Run this BEFORE deploying the new backend, or both together:
-- the API stops sending p_Department while the deployed SpMasterLabTest still
-- expects it. Re-run `python init_db.py test_master.sql` afterwards.
--
-- IRREVERSIBLE. Back the values up first if there is any chance of wanting them:
--     SELECT TestId, TestCode, Department FROM admin.Master_LabTest;
--
-- Idempotent: safe to re-run.

USE admin;

ALTER TABLE Master_LabTest DROP COLUMN IF EXISTS Department;
