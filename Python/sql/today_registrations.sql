-- ============================================================
-- Today's Registrations report - SQL Script
-- Database : registration
-- SP       : registration.SpGetTodayRegistrations
-- Screen   : /registration/today (TodayRegistrations.tsx)
--
-- Unions PatientRegistration + QuickRegistration + EmergencyRegistration
-- for the current date. Object names are fully qualified with
-- `registration.` so this deploys correctly under init_db.py even when the
-- connection's default schema is `admin`.
--
-- NOTE: init_db.py runs files alphabetically; this file sorts after the
-- three source tables (emergency_/patient_/quick_) so they already exist,
-- but MySQL creates the procedure regardless of table existence.
-- ============================================================
CREATE DATABASE IF NOT EXISTS registration;

DROP PROCEDURE IF EXISTS registration.SpGetTodayRegistrations;
DELIMITER $$
CREATE PROCEDURE registration.SpGetTodayRegistrations()
BEGIN
    SELECT
        Uhid,
        PatientName,
        'New' AS RegistrationType,
        COALESCE(Department, '') AS Department,
        COALESCE(PrimaryDoctor, '') AS Doctor,
        TIME(CreatedDate) AS RegistrationTime,
        'Active' AS Status,
        Gender,
        Age,
        MobileNumber
    FROM registration.PatientRegistration
    WHERE (RegistrationDate = CURDATE() OR DATE(CreatedDate) = CURDATE())
      AND (IsDeleted = 0 OR IsDeleted IS NULL)

    UNION ALL

    SELECT
        Uhid,
        PatientName,
        'Quick' AS RegistrationType,
        COALESCE(VisitType, 'General') AS Department,
        '' AS Doctor,
        COALESCE(RegistrationTime, TIME(CreatedDate)) AS RegistrationTime,
        COALESCE(Status, 'Active') AS Status,
        Gender,
        Age,
        MobileNumber
    FROM registration.QuickRegistration
    WHERE (RegistrationDate = CURDATE() OR DATE(CreatedDate) = CURDATE())
      AND (IsDeleted = 0 OR IsDeleted IS NULL)

    UNION ALL

    SELECT
        Uhid,
        PatientName,
        'Emergency' AS RegistrationType,
        'Emergency' AS Department,
        'Emergency' AS Doctor,
        COALESCE(RegistrationTime, TIME(CreatedDate)) AS RegistrationTime,
        COALESCE(Status, 'Active') AS Status,
        Gender,
        ApproximateAge AS Age,
        EmergencyContactPhone AS MobileNumber
    FROM registration.EmergencyRegistration
    WHERE (RegistrationDate = CURDATE() OR DATE(CreatedDate) = CURDATE())
      AND (IsDeleted = 0 OR IsDeleted IS NULL)

    ORDER BY RegistrationTime DESC;
END$$
DELIMITER ;
