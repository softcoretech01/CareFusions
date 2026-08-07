-- ============================================================
-- Patient Visit History - SQL Script
-- Database : registration
-- Table    : registration.PatientVisit
-- SP       : registration.SpPatientVisit
-- Screen   : /registration/history (VisitHistory.tsx)
--
-- Object names are fully qualified with `registration.` so this script
-- deploys correctly under init_db.py even when the connection's default
-- schema is `admin`.
-- ============================================================
CREATE DATABASE IF NOT EXISTS registration;

CREATE TABLE IF NOT EXISTS registration.PatientVisit (
    VisitId INT AUTO_INCREMENT PRIMARY KEY,
    Uhid VARCHAR(20),
    VisitDate DATE NOT NULL,
    VisitTime VARCHAR(20),
    VisitType VARCHAR(50) NOT NULL,
    Department VARCHAR(100),
    Doctor VARCHAR(100),
    Status VARCHAR(50) DEFAULT 'Scheduled',
    Notes VARCHAR(500),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_uhid (Uhid)
);

DROP PROCEDURE IF EXISTS registration.SpPatientVisit;
DELIMITER $$
CREATE PROCEDURE registration.SpPatientVisit(
    IN p_Opt VARCHAR(20),
    IN p_VisitId INT,
    IN p_Uhid VARCHAR(20),
    IN p_VisitDate DATE,
    IN p_VisitTime VARCHAR(20),
    IN p_VisitType VARCHAR(50),
    IN p_Department VARCHAR(100),
    IN p_Doctor VARCHAR(100),
    IN p_Status VARCHAR(50),
    IN p_Notes VARCHAR(500)
)
BEGIN
    IF p_Opt = 'INSERT' THEN
        INSERT INTO registration.PatientVisit (
            Uhid, VisitDate, VisitTime, VisitType, Department, Doctor, Status, Notes
        ) VALUES (
            p_Uhid, p_VisitDate, p_VisitTime, p_VisitType, p_Department, p_Doctor, p_Status, p_Notes
        );
        SELECT LAST_INSERT_ID() AS VisitId;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE registration.PatientVisit
        SET
            VisitDate = p_VisitDate,
            VisitTime = p_VisitTime,
            VisitType = p_VisitType,
            Department = p_Department,
            Doctor = p_Doctor,
            Status = p_Status,
            Notes = p_Notes
        WHERE VisitId = p_VisitId;
        SELECT p_VisitId AS VisitId;

    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM registration.PatientVisit WHERE VisitId = p_VisitId;
        SELECT p_VisitId AS VisitId;

    ELSEIF p_Opt = 'SELECT_BY_UHID' THEN
        SELECT * FROM registration.PatientVisit WHERE Uhid = p_Uhid ORDER BY VisitDate DESC, VisitTime DESC;

    END IF;
END$$
DELIMITER ;
