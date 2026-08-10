-- ============================================================
-- IPD Clinical Records - SQL Script
-- Database : hospital
-- Tables   : hospital.IpdVitals, IpdClinicalRounds, IpdMedication
-- SP       : hospital.SpIpdClinical
-- Screens  : /ipd/visit/:patientId — Nursing Flowsheet, Clinical Rounds,
--            MAR (Medication Administration Record)
--
-- Relationships (FK):
--   IpdVitals.AdmissionId         -> hospital.IPD_Admission.AdmissionId (CASCADE)
--   IpdClinicalRounds.AdmissionId -> hospital.IPD_Admission.AdmissionId (CASCADE)
--   IpdMedication.AdmissionId     -> hospital.IPD_Admission.AdmissionId (CASCADE)
--   IpdMedication.MedicineId      -> admin.Master_Medicine.MedicineId
--
-- These three tables already existed on the server but had no stored
-- procedures, no router and no .sql file, so a clean init_db.py run would not
-- recreate them and nothing ever wrote to them — the three tabs kept their
-- data in component state or localStorage and lost it on refresh. They are
-- recreated here with proper keys and indexes (they held no rows).
-- ============================================================
CREATE DATABASE IF NOT EXISTS hospital;

DROP TABLE IF EXISTS hospital.IpdVitals;
CREATE TABLE hospital.IpdVitals (
    VitalsId        INT          NOT NULL AUTO_INCREMENT,
    AdmissionId     INT          NOT NULL,
    Temperature     VARCHAR(20)  NULL,
    Pulse           VARCHAR(20)  NULL,
    BloodPressure   VARCHAR(20)  NULL,
    RespiratoryRate VARCHAR(20)  NULL,
    SpO2            VARCHAR(20)  NULL,
    Notes           VARCHAR(500) NULL,
    RecordedBy      VARCHAR(150) NULL,
    RecordedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_IpdVitals PRIMARY KEY (VitalsId),
    CONSTRAINT FK_IpdVitals_Admission FOREIGN KEY (AdmissionId)
        REFERENCES hospital.IPD_Admission (AdmissionId) ON DELETE CASCADE,
    KEY IDX_IpdVitals_Admission (AdmissionId, RecordedAt)
);

DROP TABLE IF EXISTS hospital.IpdClinicalRounds;
CREATE TABLE hospital.IpdClinicalRounds (
    RoundId     INT          NOT NULL AUTO_INCREMENT,
    AdmissionId INT          NOT NULL,
    DoctorName  VARCHAR(150) NOT NULL,
    Note        VARCHAR(1000) NOT NULL,
    RecordedAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_IpdClinicalRounds PRIMARY KEY (RoundId),
    CONSTRAINT FK_IpdRounds_Admission FOREIGN KEY (AdmissionId)
        REFERENCES hospital.IPD_Admission (AdmissionId) ON DELETE CASCADE,
    KEY IDX_IpdRounds_Admission (AdmissionId, RecordedAt)
);

DROP TABLE IF EXISTS hospital.IpdMedication;
CREATE TABLE hospital.IpdMedication (
    MedicationId    INT          NOT NULL AUTO_INCREMENT,
    AdmissionId     INT          NOT NULL,
    MedicineId      INT          NULL,                  -- FK to the medicine master
    MedicineName    VARCHAR(200) NOT NULL,              -- snapshot at prescribing time
    Dosage          VARCHAR(50)  NOT NULL,
    Frequency       VARCHAR(50)  NOT NULL,
    Route           VARCHAR(50)  NOT NULL DEFAULT 'Oral',
    Administrations VARCHAR(500) NOT NULL DEFAULT '{}', -- JSON map of slot to given flag
    PrescribedBy    VARCHAR(150) NULL,
    RecordedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_IpdMedication PRIMARY KEY (MedicationId),
    CONSTRAINT FK_IpdMedication_Admission FOREIGN KEY (AdmissionId)
        REFERENCES hospital.IPD_Admission (AdmissionId) ON DELETE CASCADE,
    CONSTRAINT FK_IpdMedication_Medicine FOREIGN KEY (MedicineId)
        REFERENCES admin.Master_Medicine (MedicineId),
    KEY IDX_IpdMedication_Admission (AdmissionId)
);


-- ============================================================
-- SP: SpIpdClinical
-- VITALS_LIST, VITALS_ADD, VITALS_DEL
-- ROUNDS_LIST | ROUNDS_ADD | ROUNDS_DEL
-- MED_LIST    | MED_ADD    | MED_ADMIN | MED_DEL
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpIpdClinical;
DELIMITER $$
CREATE PROCEDURE hospital.SpIpdClinical(
    IN p_Opt VARCHAR(20),
    IN p_Id INT,
    IN p_AdmissionId INT,
    IN p_Temperature VARCHAR(20),
    IN p_Pulse VARCHAR(20),
    IN p_BloodPressure VARCHAR(20),
    IN p_RespiratoryRate VARCHAR(20),
    IN p_SpO2 VARCHAR(20),
    IN p_Notes VARCHAR(500),
    IN p_DoctorName VARCHAR(150),
    IN p_Note VARCHAR(1000),
    IN p_MedicineId INT,
    IN p_MedicineName VARCHAR(200),
    IN p_Dosage VARCHAR(50),
    IN p_Frequency VARCHAR(50),
    IN p_Route VARCHAR(50),
    IN p_Administrations VARCHAR(500),
    IN p_User VARCHAR(150)
)
BEGIN
    -- ── Nursing flowsheet ──
    IF p_Opt = 'VITALS_LIST' THEN
        SELECT * FROM hospital.IpdVitals
        WHERE AdmissionId = p_AdmissionId ORDER BY RecordedAt DESC, VitalsId DESC;

    ELSEIF p_Opt = 'VITALS_ADD' THEN
        INSERT INTO hospital.IpdVitals
            (AdmissionId, Temperature, Pulse, BloodPressure, RespiratoryRate, SpO2, Notes, RecordedBy)
        VALUES
            (p_AdmissionId, p_Temperature, p_Pulse, p_BloodPressure, p_RespiratoryRate,
             p_SpO2, p_Notes, p_User);
        SELECT * FROM hospital.IpdVitals WHERE VitalsId = LAST_INSERT_ID();

    ELSEIF p_Opt = 'VITALS_DEL' THEN
        DELETE FROM hospital.IpdVitals WHERE VitalsId = p_Id;
        SELECT p_Id AS VitalsId;

    -- ── Clinical rounds ──
    ELSEIF p_Opt = 'ROUNDS_LIST' THEN
        SELECT * FROM hospital.IpdClinicalRounds
        WHERE AdmissionId = p_AdmissionId ORDER BY RecordedAt DESC, RoundId DESC;

    ELSEIF p_Opt = 'ROUNDS_ADD' THEN
        INSERT INTO hospital.IpdClinicalRounds (AdmissionId, DoctorName, Note)
        VALUES (p_AdmissionId, p_DoctorName, p_Note);
        SELECT * FROM hospital.IpdClinicalRounds WHERE RoundId = LAST_INSERT_ID();

    ELSEIF p_Opt = 'ROUNDS_DEL' THEN
        DELETE FROM hospital.IpdClinicalRounds WHERE RoundId = p_Id;
        SELECT p_Id AS RoundId;

    -- ── Medication administration record ──
    ELSEIF p_Opt = 'MED_LIST' THEN
        SELECT * FROM hospital.IpdMedication
        WHERE AdmissionId = p_AdmissionId ORDER BY MedicationId;

    ELSEIF p_Opt = 'MED_ADD' THEN
        INSERT INTO hospital.IpdMedication
            (AdmissionId, MedicineId, MedicineName, Dosage, Frequency, Route, Administrations, PrescribedBy)
        VALUES
            (p_AdmissionId, p_MedicineId, p_MedicineName, p_Dosage, p_Frequency,
             COALESCE(p_Route, 'Oral'), COALESCE(p_Administrations, '{}'), p_User);
        SELECT * FROM hospital.IpdMedication WHERE MedicationId = LAST_INSERT_ID();

    ELSEIF p_Opt = 'MED_ADMIN' THEN
        -- Records which slots have been given, as a JSON map.
        UPDATE hospital.IpdMedication
        SET Administrations = COALESCE(p_Administrations, '{}')
        WHERE MedicationId = p_Id;
        SELECT * FROM hospital.IpdMedication WHERE MedicationId = p_Id;

    ELSEIF p_Opt = 'MED_DEL' THEN
        DELETE FROM hospital.IpdMedication WHERE MedicationId = p_Id;
        SELECT p_Id AS MedicationId;
    END IF;
END$$
DELIMITER ;
