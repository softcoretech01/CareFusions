-- Fixes the drift between registration.PatientRegistration and
-- registration.SpPatientRegistration.
--
-- PrimaryDoctor / Department / RegistrationSource were added to the CREATE TABLE
-- in patient_registration.sql and to the procedure's INSERT column list, but the
-- table already existed, so `CREATE TABLE IF NOT EXISTS` silently skipped them
-- while `CREATE PROCEDURE` picked them up. Every INSERT then failed with
--   1054 Unknown column 'PrimaryDoctor' in 'INSERT INTO'
-- which surfaced in the UI as "Failed to save patient" on every registration.
--
-- Already applied to the dev database on 2026-09-03.
-- Idempotent: safe to run more than once (MariaDB supports IF NOT EXISTS here).

USE registration;

ALTER TABLE PatientRegistration
    ADD COLUMN IF NOT EXISTS PrimaryDoctor      VARCHAR(50) NULL AFTER ReferredBy,
    ADD COLUMN IF NOT EXISTS Department         VARCHAR(50) NULL AFTER PrimaryDoctor,
    ADD COLUMN IF NOT EXISTS RegistrationSource VARCHAR(50) NULL AFTER Department;
