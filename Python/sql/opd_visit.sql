CREATE DATABASE IF NOT EXISTS hospital;
USE hospital;

-- ============================================================
-- MAIN VISIT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS Trn_OpdVisit (
    VisitId INT AUTO_INCREMENT PRIMARY KEY,
    AppointmentId INT NOT NULL,
    Uhid VARCHAR(50) NOT NULL,
    IsFinalized TINYINT(1) DEFAULT 0,
    FinalizedAt DATETIME NULL,
    FinalizedBy VARCHAR(100) NULL,
    CreatedBy VARCHAR(100) NULL,
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy VARCHAR(100) NULL,
    ModifiedDate DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted TINYINT(1) DEFAULT 0,
    CONSTRAINT UQ_Appointment UNIQUE (AppointmentId)
);

-- ============================================================
-- CLINICAL TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS Trn_OpdVisitVitals (
    VitalsId INT AUTO_INCREMENT PRIMARY KEY,
    VisitId INT NOT NULL UNIQUE,
    BpSystolic INT NULL,
    BpDiastolic INT NULL,
    Pulse INT NULL,
    RespRate INT NULL,
    Temp DECIMAL(5,2) NULL,
    TempUnit VARCHAR(5) NULL,
    Spo2 INT NULL,
    Height DECIMAL(5,2) NULL,
    Weight DECIMAL(5,2) NULL,
    Bmi DECIMAL(5,2) NULL,
    BloodSugar INT NULL,
    RecordedAt VARCHAR(100) NULL,
    RecordedBy VARCHAR(100) NULL,
    FOREIGN KEY (VisitId) REFERENCES Trn_OpdVisit(VisitId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Trn_OpdVisitTriage (
    TriageId INT AUTO_INCREMENT PRIMARY KEY,
    VisitId INT NOT NULL UNIQUE,
    ChiefComplaint TEXT NULL,
    PainScore INT NULL,
    AllergyVerified TINYINT(1) DEFAULT 0,
    PregnancyStatus VARCHAR(50) NULL,
    FallRisk VARCHAR(50) NULL,
    InfectionStatus VARCHAR(50) NULL,
    Observations TEXT NULL,
    FOREIGN KEY (VisitId) REFERENCES Trn_OpdVisit(VisitId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Trn_OpdVisitDiagnosis (
    DiagnosisId INT AUTO_INCREMENT PRIMARY KEY,
    VisitId INT NOT NULL,
    CodeId VARCHAR(100) NULL,
    Description TEXT NULL,
    FOREIGN KEY (VisitId) REFERENCES Trn_OpdVisit(VisitId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Trn_OpdVisitPrescription (
    PrescriptionId INT AUTO_INCREMENT PRIMARY KEY,
    VisitId INT NOT NULL,
    Type VARCHAR(50) NULL,
    MedicineName VARCHAR(200) NULL,
    Quantity VARCHAR(50) NULL,
    Alerts TEXT NULL,
    FOREIGN KEY (VisitId) REFERENCES Trn_OpdVisit(VisitId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Trn_OpdVisitLabOrder (
    LabOrderId INT AUTO_INCREMENT PRIMARY KEY,
    VisitId INT NOT NULL,
    TestName VARCHAR(200) NULL,
    TestCode VARCHAR(100) NULL,
    Priority VARCHAR(50) NULL,
    ClinicalNotes TEXT NULL,
    Status VARCHAR(50) NULL,
    Result TEXT NULL,
    FOREIGN KEY (VisitId) REFERENCES Trn_OpdVisit(VisitId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Trn_OpdVisitRadiologyOrder (
    RadiologyOrderId INT AUTO_INCREMENT PRIMARY KEY,
    VisitId INT NOT NULL,
    Modality VARCHAR(100) NULL,
    BodyPart VARCHAR(100) NULL,
    Indication TEXT NULL,
    Priority VARCHAR(50) NULL,
    ContrastRequired TINYINT(1) DEFAULT 0,
    SpecialInstructions TEXT NULL,
    Status VARCHAR(50) NULL,
    FOREIGN KEY (VisitId) REFERENCES Trn_OpdVisit(VisitId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Trn_OpdVisitProcedure (
    ProcedureId INT AUTO_INCREMENT PRIMARY KEY,
    VisitId INT NOT NULL,
    ProcedureName VARCHAR(200) NULL,
    PerformedBy VARCHAR(100) NULL,
    StartTime VARCHAR(100) NULL,
    EndTime VARCHAR(100) NULL,
    Notes TEXT NULL,
    BillingCode VARCHAR(100) NULL,
    FOREIGN KEY (VisitId) REFERENCES Trn_OpdVisit(VisitId) ON DELETE CASCADE
);


-- ============================================================
-- STORED PROCEDURE
-- ============================================================
DROP PROCEDURE IF EXISTS SpOpdVisit;

DELIMITER $$

CREATE PROCEDURE SpOpdVisit(
    IN p_Opt VARCHAR(20),
    IN p_AppointmentId INT,
    IN p_Uhid VARCHAR(50),
    IN p_Department VARCHAR(100),
    IN p_Date DATE,
    IN p_VitalsJson JSON,
    IN p_TriageJson JSON,
    IN p_DiagnosesJson JSON,
    IN p_PrescriptionsJson JSON,
    IN p_LabOrdersJson JSON,
    IN p_RadiologyOrdersJson JSON,
    IN p_ProceduresJson JSON,
    IN p_IsFinalized TINYINT(1),
    IN p_FinalizedBy VARCHAR(100),
    IN p_CreatedBy VARCHAR(100)
)
BEGIN
    DECLARE v_VisitId INT;

    -- ==============================================================
    -- GET_SCHEDULE: Fetch visits mapped from Appointments + Registration
    -- ==============================================================
    IF p_Opt = 'GET_SCHEDULE' THEN
        SELECT 
            A.AppointmentId AS id,
            A.AppointmentId AS appointmentId,
            A.QueueToken AS queueToken,
            A.AppointmentNumber AS appointmentNumber,
            A.Uhid AS uhid,
            COALESCE(P.PatientName, A.PatientName) AS patientName,
            P.Age AS age,
            P.Gender AS gender,
            COALESCE(P.MobileNumber, A.MobileNumber) AS mobileNumber,
            A.Doctor AS doctorName,
            A.Department AS department,
            A.AppointmentDate AS date,
            A.TimeSlot AS timeSlot,
            A.Type AS visitType,
            A.Priority AS priority,
            A.Status AS status,
            IF((SELECT COUNT(*) FROM hospital.OpBill B WHERE B.Uhid = A.Uhid AND DATE(B.BillDate) = A.AppointmentDate AND B.PaymentStatus = 'Paid') > 0, 'Completed', 'Pending') AS billingStatus,
            COALESCE(V.IsFinalized, 0) AS isFinalized,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', L.LabOrderId,
                        'testName', L.TestName,
                        'testCode', L.TestCode,
                        'priority', L.Priority,
                        'clinicalNotes', L.ClinicalNotes,
                        'status', L.Status,
                        'result', L.Result
                    )
                )
                FROM hospital.Trn_OpdVisitLabOrder L
                WHERE L.VisitId = V.VisitId
            ) AS labOrders,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', R.RadiologyOrderId,
                        'modality', R.Modality,
                        'bodyPart', R.BodyPart,
                        'indication', R.Indication,
                        'priority', R.Priority,
                        'contrastRequired', R.ContrastRequired,
                        'specialInstructions', R.SpecialInstructions,
                        'status', R.Status
                    )
                )
                FROM hospital.Trn_OpdVisitRadiologyOrder R
                WHERE R.VisitId = V.VisitId
            ) AS radiologyOrders
        FROM registration.Trn_Appointment A
        LEFT JOIN registration.PatientRegistration P ON A.Uhid = P.Uhid
        LEFT JOIN hospital.Trn_OpdVisit V ON A.AppointmentId = V.AppointmentId AND V.IsDeleted = 0
        WHERE A.IsDeleted = 0
          AND (p_Department IS NULL OR p_Department = '' OR A.Department = p_Department)
          AND (p_Date IS NULL OR A.AppointmentDate = p_Date)
        ORDER BY A.AppointmentId ASC;

    -- ==============================================================
    -- GET_DETAILS: Fetch all nested data for a single AppointmentId
    -- ==============================================================
    ELSEIF p_Opt = 'GET_DETAILS' THEN
        SELECT VisitId INTO v_VisitId FROM hospital.Trn_OpdVisit WHERE AppointmentId = p_AppointmentId AND IsDeleted = 0 LIMIT 1;
        
        IF v_VisitId IS NOT NULL THEN
            SELECT * FROM hospital.Trn_OpdVisit WHERE VisitId = v_VisitId;
            SELECT * FROM hospital.Trn_OpdVisitVitals WHERE VisitId = v_VisitId;
            SELECT * FROM hospital.Trn_OpdVisitTriage WHERE VisitId = v_VisitId;
            SELECT * FROM hospital.Trn_OpdVisitDiagnosis WHERE VisitId = v_VisitId;
            SELECT * FROM hospital.Trn_OpdVisitPrescription WHERE VisitId = v_VisitId;
            SELECT * FROM hospital.Trn_OpdVisitLabOrder WHERE VisitId = v_VisitId;
            SELECT * FROM hospital.Trn_OpdVisitRadiologyOrder WHERE VisitId = v_VisitId;
            SELECT * FROM hospital.Trn_OpdVisitProcedure WHERE VisitId = v_VisitId;
        ELSE
            SELECT 'NOT_FOUND' AS Status;
        END IF;

    -- ==============================================================
    -- SAVE_CLINICAL: Upsert clinical data using JSON
    -- ==============================================================
    ELSEIF p_Opt = 'SAVE_CLINICAL' THEN
        -- Get or Create Visit
        SELECT VisitId INTO v_VisitId FROM hospital.Trn_OpdVisit WHERE AppointmentId = p_AppointmentId AND IsDeleted = 0 LIMIT 1;
        
        IF v_VisitId IS NULL THEN
            INSERT INTO hospital.Trn_OpdVisit (AppointmentId, Uhid, CreatedBy) VALUES (p_AppointmentId, p_Uhid, p_CreatedBy);
            SET v_VisitId = LAST_INSERT_ID();
        END IF;
        
        -- Update IsFinalized if provided
        IF p_IsFinalized IS NOT NULL THEN
            UPDATE hospital.Trn_OpdVisit 
            SET IsFinalized = p_IsFinalized, FinalizedAt = CURRENT_TIMESTAMP, FinalizedBy = p_FinalizedBy 
            WHERE VisitId = v_VisitId;
        END IF;

        -- Process Vitals
        IF p_VitalsJson IS NOT NULL THEN
            DELETE FROM hospital.Trn_OpdVisitVitals WHERE VisitId = v_VisitId;
            INSERT INTO hospital.Trn_OpdVisitVitals (VisitId, BpSystolic, BpDiastolic, Pulse, RespRate, Temp, TempUnit, Spo2, Height, Weight, Bmi, BloodSugar, RecordedAt, RecordedBy)
            SELECT v_VisitId, 
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.bp_systolic')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.bp_diastolic')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.pulse')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.respRate')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.temp')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.tempUnit')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.spo2')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.height')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.weight')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.bmi')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.bloodSugar')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.recordedAt')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_VitalsJson, '$.recordedBy'));
        END IF;

        -- Process Triage
        IF p_TriageJson IS NOT NULL THEN
            DELETE FROM hospital.Trn_OpdVisitTriage WHERE VisitId = v_VisitId;
            INSERT INTO hospital.Trn_OpdVisitTriage (VisitId, ChiefComplaint, PainScore, AllergyVerified, PregnancyStatus, FallRisk, InfectionStatus, Observations)
            SELECT v_VisitId, 
                   JSON_UNQUOTE(JSON_EXTRACT(p_TriageJson, '$.chiefComplaint')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_TriageJson, '$.painScore')),
                   IF(JSON_UNQUOTE(JSON_EXTRACT(p_TriageJson, '$.allergyVerified')) = 'true', 1, 0),
                   JSON_UNQUOTE(JSON_EXTRACT(p_TriageJson, '$.pregnancyStatus')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_TriageJson, '$.fallRisk')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_TriageJson, '$.infectionStatus')),
                   JSON_UNQUOTE(JSON_EXTRACT(p_TriageJson, '$.observations'));
        END IF;

        -- Process Diagnoses
        IF p_DiagnosesJson IS NOT NULL THEN
            DELETE FROM hospital.Trn_OpdVisitDiagnosis WHERE VisitId = v_VisitId;
            INSERT INTO hospital.Trn_OpdVisitDiagnosis (VisitId, CodeId, Description)
            SELECT v_VisitId, 
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.id')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.description'))
            FROM JSON_TABLE(p_DiagnosesJson, '$[*]' COLUMNS (value JSON PATH '$')) AS jt;
        END IF;

        -- Process Prescriptions
        IF p_PrescriptionsJson IS NOT NULL THEN
            DELETE FROM hospital.Trn_OpdVisitPrescription WHERE VisitId = v_VisitId;
            INSERT INTO hospital.Trn_OpdVisitPrescription (VisitId, Type, MedicineName, Quantity, Alerts)
            SELECT v_VisitId, 
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.type')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.medicineName')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.quantity')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.alerts'))
            FROM JSON_TABLE(p_PrescriptionsJson, '$[*]' COLUMNS (value JSON PATH '$')) AS jt;
        END IF;

        -- Process Lab Orders
        IF p_LabOrdersJson IS NOT NULL THEN
            DELETE FROM hospital.Trn_OpdVisitLabOrder WHERE VisitId = v_VisitId;
            INSERT INTO hospital.Trn_OpdVisitLabOrder (VisitId, TestName, TestCode, Priority, ClinicalNotes, Status, Result)
            SELECT v_VisitId, 
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.testName')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.testCode')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.priority')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.clinicalNotes')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.status')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.result'))
            FROM JSON_TABLE(p_LabOrdersJson, '$[*]' COLUMNS (value JSON PATH '$')) AS jt;
        END IF;

        -- Process Radiology Orders
        IF p_RadiologyOrdersJson IS NOT NULL THEN
            DELETE FROM hospital.Trn_OpdVisitRadiologyOrder WHERE VisitId = v_VisitId;
            INSERT INTO hospital.Trn_OpdVisitRadiologyOrder (VisitId, Modality, BodyPart, Indication, Priority, ContrastRequired, SpecialInstructions, Status)
            SELECT v_VisitId, 
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.modality')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.bodyPart')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.indication')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.priority')),
                   IF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.contrastRequired')) = 'true', 1, 0),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.specialInstructions')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.status'))
            FROM JSON_TABLE(p_RadiologyOrdersJson, '$[*]' COLUMNS (value JSON PATH '$')) AS jt;
        END IF;

        -- Process Procedures
        IF p_ProceduresJson IS NOT NULL THEN
            DELETE FROM hospital.Trn_OpdVisitProcedure WHERE VisitId = v_VisitId;
            INSERT INTO hospital.Trn_OpdVisitProcedure (VisitId, ProcedureName, PerformedBy, StartTime, EndTime, Notes, BillingCode)
            SELECT v_VisitId, 
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.procedureName')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.performedBy')),
                   NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.startTime')), 'null'),
                   NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.endTime')), 'null'),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.notes')),
                   JSON_UNQUOTE(JSON_EXTRACT(value, '$.billingCode'))
            FROM JSON_TABLE(p_ProceduresJson, '$[*]' COLUMNS (value JSON PATH '$')) AS jt;
        END IF;

        SELECT 'SUCCESS' AS Status, v_VisitId AS VisitId;
    END IF;
END$$

DELIMITER ;
