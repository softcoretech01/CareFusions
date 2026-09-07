-- ==============================================================================
-- Remove the lab Test Category concept
-- ==============================================================================
-- test_master.sql no longer declares Master_LabTestCategory or the
-- Master_LabTest.TestCategory column, but CREATE TABLE IF NOT EXISTS never
-- alters a table that already exists — so an existing database needs this.
--
-- ORDER MATTERS. Run this BEFORE deploying the new backend, or run both
-- together: the API stops sending p_TestCategory, and the currently deployed
-- SpMasterLabTest still expects it. Re-run `python init_db.py test_master.sql`
-- afterwards to recreate the procedure without that parameter.
--
-- IRREVERSIBLE. Dropping the column destroys the stored category of every lab
-- test. Back the values up first if there is any chance of wanting them:
--     SELECT TestId, TestCode, TestCategory FROM admin.Master_LabTest;
--
-- Idempotent: safe to re-run.

USE admin;

ALTER TABLE Master_LabTest DROP COLUMN IF EXISTS TestCategory;

DROP TABLE IF EXISTS Master_LabTestCategory;
