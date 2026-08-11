-- ============================================================
-- SpIpdClinicalOperations — IPD clinical actions used by the
-- /ipd-visits/save-clinical and /ipd-visits/{id}/details endpoints.
--
-- Actions: GET_DETAILS | SAVE_VITALS | SAVE_ROUND | SAVE_MEDICATION |
--          UPDATE_MEDICATION_ADMIN | SAVE_INVESTIGATION
--
-- NOTE: this procedure previously lived only in the database (no source file);
-- it is captured here so it can be redeployed. Key fix: SAVE_MEDICATION now
-- COALESCEs Administrations to '{}' — the column is NOT NULL, and a brand-new
-- MAR entry has no administrations yet, so a NULL made the insert fail (1048)
-- and the medication silently never appeared.
-- ============================================================
USE hospital;

DROP PROCEDURE IF EXISTS hospital.SpIpdClinicalOperations;

DELIMITER $$

CREATE PROCEDURE hospital.SpIpdClinicalOperations(
    IN p_Action          VARCHAR(50),
    IN p_AdmissionId     INT,
    IN p_Temperature     VARCHAR(50),
    IN p_Pulse           VARCHAR(50),
    IN p_BloodPressure   VARCHAR(50),
    IN p_RespiratoryRate VARCHAR(50),
    IN p_SpO2            VARCHAR(50),
    IN p_Notes           TEXT,
    IN p_DoctorName      VARCHAR(255),
    IN p_RoundNote       TEXT,
    IN p_MedicineName    VARCHAR(255),
    IN p_Dosage          VARCHAR(100),
    IN p_Frequency       VARCHAR(100),
    IN p_Route           VARCHAR(100),
    IN p_Administrations VARCHAR(500),
    IN p_TestName        VARCHAR(255),
    IN p_Result          TEXT,
    IN p_NormalRange     VARCHAR(255),
    IN p_Status          VARCHAR(50),
    IN p_MedicineId      INT
)
BEGIN

    IF p_Action = 'GET_DETAILS' THEN
        SELECT * FROM hospital.IPD_Admission     WHERE AdmissionId = p_AdmissionId;
        SELECT * FROM hospital.IpdVitals         WHERE AdmissionId = p_AdmissionId ORDER BY RecordedAt DESC;
        SELECT * FROM hospital.IpdClinicalRounds WHERE AdmissionId = p_AdmissionId ORDER BY RecordedAt DESC;
        SELECT * FROM hospital.IpdMedication     WHERE AdmissionId = p_AdmissionId ORDER BY RecordedAt DESC;
        SELECT * FROM hospital.IpdInvestigation  WHERE AdmissionId = p_AdmissionId ORDER BY RecordedAt DESC;

    ELSEIF p_Action = 'SAVE_VITALS' THEN
        INSERT INTO hospital.IpdVitals
            (AdmissionId, Temperature, Pulse, BloodPressure, RespiratoryRate, SpO2, Notes)
        VALUES
            (p_AdmissionId, p_Temperature, p_Pulse, p_BloodPressure, p_RespiratoryRate, p_SpO2, p_Notes);
        SELECT LAST_INSERT_ID() AS VitalsId;

    ELSEIF p_Action = 'SAVE_ROUND' THEN
        INSERT INTO hospital.IpdClinicalRounds (AdmissionId, DoctorName, Note)
        VALUES (p_AdmissionId, p_DoctorName, p_RoundNote);
        SELECT LAST_INSERT_ID() AS RoundId;

    ELSEIF p_Action = 'SAVE_MEDICATION' THEN
        INSERT INTO hospital.IpdMedication
            (AdmissionId, MedicineId, MedicineName, Dosage, Frequency, Route, Administrations)
        VALUES
            (p_AdmissionId, p_MedicineId, p_MedicineName, p_Dosage, p_Frequency, p_Route,
             COALESCE(p_Administrations, '{}'));
        SELECT LAST_INSERT_ID() AS MedicationId;

    ELSEIF p_Action = 'UPDATE_MEDICATION_ADMIN' THEN
        UPDATE hospital.IpdMedication
        SET Administrations = COALESCE(p_Administrations, '{}')
        WHERE MedicineId = p_MedicineId AND AdmissionId = p_AdmissionId;
        SELECT 1 AS Success;

    ELSEIF p_Action = 'SAVE_INVESTIGATION' THEN
        INSERT INTO hospital.IpdInvestigation (AdmissionId, TestName, Result, NormalRange, Status)
        VALUES (p_AdmissionId, p_TestName, p_Result, p_NormalRange, p_Status);
        SELECT LAST_INSERT_ID() AS InvestigationId;

    END IF;

END$$

DELIMITER ;
