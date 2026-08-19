-- ============================================================
-- IPD (In-Patient Department) - SQL Script
-- Database : hospital
-- Tables   : IPD_Ward, IPD_Bed, IPD_Admission, IPD_WardTransfer,
--            IPD_DischargeMedicine, IPD_AdmissionRequest
-- SPs      : SpIpdWard, SpIpdBed, SpIpdAdmission, SpIpdAdmissionRequest
-- Screens  : /ipd/* (Admission Desk, Bed Management, Active Inpatients,
--            Ward Transfers, Discharges, Dashboard)
--
-- Relationships (FK):
--   IPD_Bed.WardId            -> IPD_Ward.WardId
--   IPD_Admission.CurrentWardId -> IPD_Ward.WardId
--   IPD_Admission.CurrentBedId  -> IPD_Bed.BedId
--   IPD_WardTransfer.AdmissionId    -> IPD_Admission.AdmissionId
--   IPD_DischargeMedicine.AdmissionId -> IPD_Admission.AdmissionId
--
-- Object names are fully qualified with `hospital.` so this deploys
-- correctly even when the connection's default schema is admin.
-- ============================================================

USE hospital;

-- ── Ward ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.IPD_Ward (
    WardId            INT          NOT NULL AUTO_INCREMENT,
    WardName          VARCHAR(120) NOT NULL,
    WardType          ENUM('General','Semi-Private','Private','Deluxe','ICU','NICU','PICU','HDU','OT') NOT NULL,
    GenderRestriction ENUM('Male','Female','Any') NOT NULL DEFAULT 'Any',
    Capacity          INT          NOT NULL DEFAULT 0,
    Status            ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    CreatedBy         VARCHAR(100) NULL,
    CreatedDate       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy         VARCHAR(100) NULL,
    UpdatedDate       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted         TINYINT(1)   NOT NULL DEFAULT 0,
    CONSTRAINT PK_IPD_Ward PRIMARY KEY (WardId),
    CONSTRAINT UQ_IPD_Ward_Name UNIQUE (WardName)
);

-- ── Bed ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.IPD_Bed (
    BedId       INT          NOT NULL AUTO_INCREMENT,
    WardId      INT          NOT NULL,
    RoomNumber  VARCHAR(50)  NULL,
    BedNumber   VARCHAR(50)  NOT NULL,
    Status      ENUM('Available','Reserved','Occupied','Cleaning','Maintenance') NOT NULL DEFAULT 'Available',
    CreatedBy   VARCHAR(100) NULL,
    CreatedDate DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy   VARCHAR(100) NULL,
    UpdatedDate DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted   TINYINT(1)   NOT NULL DEFAULT 0,
    CONSTRAINT PK_IPD_Bed PRIMARY KEY (BedId),
    CONSTRAINT UQ_IPD_Bed UNIQUE (WardId, BedNumber),
    CONSTRAINT FK_IPD_Bed_Ward FOREIGN KEY (WardId)
        REFERENCES hospital.IPD_Ward (WardId),
    KEY IDX_IPD_Bed_Status (Status)
);

-- ── Admission ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.IPD_Admission (
    AdmissionId         INT          NOT NULL AUTO_INCREMENT,
    AdmissionNumber     VARCHAR(20)  NOT NULL,            -- Auto: IPD-YYYYNNNN
    Uhid                VARCHAR(30)  NOT NULL,
    PatientName         VARCHAR(150) NOT NULL,
    Age                 INT          NULL,
    Gender              VARCHAR(10)  NULL,
    BloodGroup          VARCHAR(5)   NULL,
    AdmissionDate       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    AdmittingDoctor     VARCHAR(150) NULL,
    Specialty           VARCHAR(100) NULL,
    AdmissionType       VARCHAR(50)  NULL,
    Priority            VARCHAR(20)  NULL,
    ExpectedStayDays    INT          NULL,
    Status              ENUM('Admitted','Discharge Requested','Discharged') NOT NULL DEFAULT 'Admitted',
    CurrentWardId       INT          NULL,
    CurrentBedId        INT          NULL,
    ProvisionalDiagnosis VARCHAR(500) NULL,
    InsuranceStatus     VARCHAR(50)  NULL,
    DischargeDate       DATE         NULL,
    DischargeSummary    TEXT         NULL,
    DischargedBy        VARCHAR(150) NULL,
    CreatedBy           VARCHAR(100) NULL,
    CreatedDate         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100) NULL,
    UpdatedDate         DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)   NOT NULL DEFAULT 0,
    CONSTRAINT PK_IPD_Admission PRIMARY KEY (AdmissionId),
    CONSTRAINT UQ_IPD_Admission_Number UNIQUE (AdmissionNumber),
    CONSTRAINT FK_IPD_Admission_Ward FOREIGN KEY (CurrentWardId)
        REFERENCES hospital.IPD_Ward (WardId),
    CONSTRAINT FK_IPD_Admission_Bed FOREIGN KEY (CurrentBedId)
        REFERENCES hospital.IPD_Bed (BedId),
    KEY IDX_IPD_Admission_Uhid   (Uhid),
    KEY IDX_IPD_Admission_Status (Status)
);

-- ── Ward transfer history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.IPD_WardTransfer (
    TransferId    INT          NOT NULL AUTO_INCREMENT,
    AdmissionId   INT          NOT NULL,
    FromWardId    INT          NULL,
    ToWardId      INT          NULL,
    FromBedId     INT          NULL,
    ToBedId       INT          NULL,
    TransferDate  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TransferReason VARCHAR(255) NULL,
    CreatedDate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT PK_IPD_WardTransfer PRIMARY KEY (TransferId),
    CONSTRAINT FK_IPD_Transfer_Admission FOREIGN KEY (AdmissionId)
        REFERENCES hospital.IPD_Admission (AdmissionId),
    KEY IDX_IPD_Transfer_Admission (AdmissionId)
);

-- ── Discharge medicines ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.IPD_DischargeMedicine (
    DischargeMedId INT          NOT NULL AUTO_INCREMENT,
    AdmissionId    INT          NOT NULL,
    MedicineName   VARCHAR(255) NOT NULL,
    Dosage         VARCHAR(50)  NULL,
    Frequency      VARCHAR(50)  NULL,
    Duration       VARCHAR(50)  NULL,
    Quantity       INT          NULL,
    Notes          VARCHAR(255) NULL,
    CONSTRAINT PK_IPD_DischargeMedicine PRIMARY KEY (DischargeMedId),
    CONSTRAINT FK_IPD_DischargeMed_Admission FOREIGN KEY (AdmissionId)
        REFERENCES hospital.IPD_Admission (AdmissionId),
    KEY IDX_IPD_DischargeMed_Admission (AdmissionId)
);

-- ── Admission requests (pre-admission queue) ─────────────────
CREATE TABLE IF NOT EXISTS hospital.IPD_AdmissionRequest (
    RequestId           INT          NOT NULL AUTO_INCREMENT,
    RequestDate         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Uhid                VARCHAR(30)  NOT NULL,
    PatientName         VARCHAR(150) NOT NULL,
    Specialty           VARCHAR(100) NULL,
    AdmissionType       VARCHAR(50)  NULL,
    Priority            VARCHAR(20)  NULL,
    ProvisionalDiagnosis VARCHAR(500) NULL,
    RequestedBy         VARCHAR(150) NULL,
    Status              ENUM('Pending','Admitted','Cancelled') NOT NULL DEFAULT 'Pending',
    CreatedBy           VARCHAR(100) NULL,
    CreatedDate         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100) NULL,
    UpdatedDate         DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)   NOT NULL DEFAULT 0,
    CONSTRAINT PK_IPD_AdmissionRequest PRIMARY KEY (RequestId),
    KEY IDX_IPD_Request_Status (Status)
);


-- ============================================================
-- SP: SpIpdWard  (LIST | INSERT | UPDATE | DELETE)
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpIpdWard;
DELIMITER $$
CREATE PROCEDURE hospital.SpIpdWard(
    IN p_Opt VARCHAR(20),
    IN p_WardId INT,
    IN p_WardName VARCHAR(120),
    IN p_WardType VARCHAR(20),
    IN p_GenderRestriction VARCHAR(10),
    IN p_Capacity INT,
    IN p_Status VARCHAR(10),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT w.WardId, w.WardName, w.WardType, w.GenderRestriction, w.Capacity, w.Status,
               (SELECT COUNT(*) FROM IPD_Bed b WHERE b.WardId = w.WardId AND b.IsDeleted = 0) AS TotalBeds,
               (SELECT COUNT(*) FROM IPD_Bed b WHERE b.WardId = w.WardId AND b.IsDeleted = 0 AND b.Status = 'Available') AS AvailableBeds
        FROM IPD_Ward w
        WHERE w.IsDeleted = 0
        ORDER BY w.WardName;

    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO IPD_Ward (WardName, WardType, GenderRestriction, Capacity, Status, CreatedBy)
        VALUES (p_WardName, p_WardType, p_GenderRestriction, p_Capacity, COALESCE(p_Status,'Active'), p_User);
        SELECT LAST_INSERT_ID() AS WardId;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE IPD_Ward
        SET WardName = p_WardName, WardType = p_WardType, GenderRestriction = p_GenderRestriction,
            Capacity = p_Capacity, Status = COALESCE(p_Status, Status), UpdatedBy = p_User
        WHERE WardId = p_WardId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE IPD_Ward SET IsDeleted = 1, UpdatedBy = p_User WHERE WardId = p_WardId;
        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpIpdBed  (LIST | INSERT | UPDATESTATUS | DELETE)
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpIpdBed;
DELIMITER $$
CREATE PROCEDURE hospital.SpIpdBed(
    IN p_Opt VARCHAR(20),
    IN p_BedId INT,
    IN p_WardId INT,
    IN p_RoomNumber VARCHAR(50),
    IN p_BedNumber VARCHAR(50),
    IN p_Status VARCHAR(20),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT b.BedId, b.WardId, w.WardName, b.RoomNumber, b.BedNumber, b.Status
        FROM IPD_Bed b
        JOIN IPD_Ward w ON w.WardId = b.WardId
        WHERE b.IsDeleted = 0
        ORDER BY b.WardId, b.BedNumber;

    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO IPD_Bed (WardId, RoomNumber, BedNumber, Status, CreatedBy)
        VALUES (p_WardId, p_RoomNumber, p_BedNumber, COALESCE(p_Status,'Available'), p_User);
        SELECT LAST_INSERT_ID() AS BedId;

    ELSEIF p_Opt = 'UPDATESTATUS' THEN
        UPDATE IPD_Bed SET Status = p_Status, UpdatedBy = p_User
        WHERE BedId = p_BedId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE IPD_Bed SET IsDeleted = 1, UpdatedBy = p_User WHERE BedId = p_BedId;
        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpIpdAdmission
--   LIST | GETBYID | TRANSFERS | DISCHARGEMEDS
--   ADMIT | UPDATE | ALLOCATEBED | REQUESTDISCHARGE | DISCHARGE
--   DELDISCHARGEMEDS | ADDDISCHARGEMED
-- Bed status is kept in sync transactionally with each action.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpIpdAdmission;
DELIMITER $$
CREATE PROCEDURE hospital.SpIpdAdmission(
    IN p_Opt VARCHAR(24),
    IN p_AdmissionId INT,
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_Age INT,
    IN p_Gender VARCHAR(10),
    IN p_BloodGroup VARCHAR(5),
    IN p_AdmittingDoctor VARCHAR(150),
    IN p_Specialty VARCHAR(100),
    IN p_AdmissionType VARCHAR(50),
    IN p_Priority VARCHAR(20),
    IN p_ExpectedStayDays INT,
    IN p_WardId INT,
    IN p_BedId INT,
    IN p_ProvisionalDiagnosis VARCHAR(500),
    IN p_InsuranceStatus VARCHAR(50),
    IN p_TransferReason VARCHAR(255),
    IN p_DischargeSummary TEXT,
    IN p_DischargedBy VARCHAR(150),
    IN p_MedicineName VARCHAR(255),
    IN p_Dosage VARCHAR(50),
    IN p_Frequency VARCHAR(50),
    IN p_Duration VARCHAR(50),
    IN p_Quantity INT,
    IN p_Notes VARCHAR(255),
    IN p_User VARCHAR(100)
)
BEGIN
    DECLARE v_Num  VARCHAR(20);
    DECLARE v_Seq  INT;
    DECLARE v_OldBed INT;
    DECLARE v_OldWard INT;

    IF p_Opt = 'LIST' THEN
        SELECT AdmissionId, AdmissionNumber, Uhid, PatientName, Age, Gender, BloodGroup,
               AdmissionDate, AdmittingDoctor, Specialty, AdmissionType, Priority,
               ExpectedStayDays, Status, CurrentWardId, CurrentBedId, ProvisionalDiagnosis,
               InsuranceStatus, DischargeDate, DischargeSummary, DischargedBy
        FROM IPD_Admission
        WHERE IsDeleted = 0
        ORDER BY AdmissionId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT AdmissionId, AdmissionNumber, Uhid, PatientName, Age, Gender, BloodGroup,
               AdmissionDate, AdmittingDoctor, Specialty, AdmissionType, Priority,
               ExpectedStayDays, Status, CurrentWardId, CurrentBedId, ProvisionalDiagnosis,
               InsuranceStatus, DischargeDate, DischargeSummary, DischargedBy
        FROM IPD_Admission
        WHERE AdmissionId = p_AdmissionId AND IsDeleted = 0;

    ELSEIF p_Opt = 'TRANSFERS' THEN
        SELECT TransferId, AdmissionId, FromWardId, ToWardId, FromBedId, ToBedId,
               TransferDate, TransferReason
        FROM IPD_WardTransfer
        ORDER BY AdmissionId, TransferDate;

    ELSEIF p_Opt = 'DISCHARGEMEDS' THEN
        SELECT DM.DischargeMedId, DM.AdmissionId, DM.MedicineName, DM.Dosage, DM.Frequency, DM.Duration, DM.Quantity, DM.Notes,
               COALESCE((SELECT SellingPrice FROM admin.Master_Medicine WHERE BrandName = SUBSTRING_INDEX(DM.MedicineName, ' (', 1) AND IsDeleted = 0 LIMIT 1), 0) AS Price
        FROM IPD_DischargeMedicine DM
        ORDER BY DM.AdmissionId, DM.DischargeMedId;

    ELSEIF p_Opt = 'ADMIT' THEN
        -- Only well-formed numbers (IPD-YYYY followed by digits only) count.
        -- A malformed value such as 'IPD-2026-001' otherwise makes
        -- CAST(SUBSTRING(...,9) AS UNSIGNED) wrap to a huge number, which
        -- overflowed v_Seq and produced a colliding admission number.
        SELECT COALESCE(MAX(CAST(SUBSTRING(AdmissionNumber, 9) AS UNSIGNED)), 0) + 1
          INTO v_Seq
          FROM IPD_Admission
         WHERE AdmissionNumber REGEXP CONCAT('^IPD-', YEAR(CURDATE()), '[0-9]+$');
        SET v_Num = CONCAT('IPD-', YEAR(CURDATE()), LPAD(v_Seq, 4, '0'));

        INSERT INTO IPD_Admission (
            AdmissionNumber, Uhid, PatientName, Age, Gender, BloodGroup, AdmittingDoctor,
            Specialty, AdmissionType, Priority, ExpectedStayDays, Status, CurrentWardId,
            CurrentBedId, ProvisionalDiagnosis, InsuranceStatus, CreatedBy
        ) VALUES (
            v_Num, p_Uhid, p_PatientName, p_Age, p_Gender, p_BloodGroup, p_AdmittingDoctor,
            p_Specialty, p_AdmissionType, p_Priority, p_ExpectedStayDays, 'Admitted', p_WardId,
            p_BedId, p_ProvisionalDiagnosis, p_InsuranceStatus, p_User
        );

        IF p_BedId IS NOT NULL THEN
            UPDATE IPD_Bed SET Status = 'Occupied' WHERE BedId = p_BedId;
        END IF;

        SELECT LAST_INSERT_ID() AS AdmissionId, v_Num AS AdmissionNumber;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE IPD_Admission
        SET PatientName = p_PatientName, Age = p_Age, Gender = p_Gender, BloodGroup = p_BloodGroup,
            AdmittingDoctor = p_AdmittingDoctor, Specialty = p_Specialty, AdmissionType = p_AdmissionType,
            Priority = p_Priority, ExpectedStayDays = p_ExpectedStayDays,
            ProvisionalDiagnosis = p_ProvisionalDiagnosis, InsuranceStatus = p_InsuranceStatus,
            UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'ALLOCATEBED' THEN
        SELECT CurrentBedId, CurrentWardId INTO v_OldBed, v_OldWard
          FROM IPD_Admission WHERE AdmissionId = p_AdmissionId;

        -- Log a transfer only when the ward actually changes.
        IF v_OldWard IS NOT NULL AND v_OldWard <> p_WardId AND v_OldBed IS NOT NULL THEN
            INSERT INTO IPD_WardTransfer (AdmissionId, FromWardId, ToWardId, FromBedId, ToBedId, TransferReason)
            VALUES (p_AdmissionId, v_OldWard, p_WardId, v_OldBed, p_BedId, p_TransferReason);
        END IF;

        -- Free the previous bed (send to Cleaning), occupy the new one.
        IF v_OldBed IS NOT NULL AND v_OldBed <> p_BedId THEN
            UPDATE IPD_Bed SET Status = 'Cleaning' WHERE BedId = v_OldBed;
        END IF;
        UPDATE IPD_Bed SET Status = 'Occupied' WHERE BedId = p_BedId;

        UPDATE IPD_Admission
        SET CurrentBedId = p_BedId, CurrentWardId = p_WardId, UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'REQUESTDISCHARGE' THEN
        UPDATE IPD_Admission
        SET Status = 'Discharge Requested', DischargeDate = CURDATE(),
            DischargeSummary = p_DischargeSummary, DischargedBy = p_DischargedBy, UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DISCHARGE' THEN
        SELECT CurrentBedId INTO v_OldBed FROM IPD_Admission WHERE AdmissionId = p_AdmissionId;
        IF v_OldBed IS NOT NULL THEN
            UPDATE IPD_Bed SET Status = 'Available' WHERE BedId = v_OldBed;
        END IF;
        UPDATE IPD_Admission
        SET Status = 'Discharged', CurrentBedId = NULL, CurrentWardId = NULL,
            DischargeDate = CURDATE(),
            DischargeSummary = COALESCE(p_DischargeSummary, DischargeSummary),
            DischargedBy = COALESCE(p_DischargedBy, DischargedBy), UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELDISCHARGEMEDS' THEN
        DELETE FROM IPD_DischargeMedicine WHERE AdmissionId = p_AdmissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'ADDDISCHARGEMED' THEN
        INSERT INTO IPD_DischargeMedicine (AdmissionId, MedicineName, Dosage, Frequency, Duration, Quantity, Notes)
        VALUES (p_AdmissionId, p_MedicineName, p_Dosage, p_Frequency, p_Duration, p_Quantity, p_Notes);
        SELECT LAST_INSERT_ID() AS DischargeMedId;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpIpdAdmissionRequest  (LIST | INSERT | UPDATESTATUS)
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpIpdAdmissionRequest;
DELIMITER $$
CREATE PROCEDURE hospital.SpIpdAdmissionRequest(
    IN p_Opt VARCHAR(20),
    IN p_RequestId INT,
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_Specialty VARCHAR(100),
    IN p_AdmissionType VARCHAR(50),
    IN p_Priority VARCHAR(20),
    IN p_ProvisionalDiagnosis VARCHAR(500),
    IN p_RequestedBy VARCHAR(150),
    IN p_Status VARCHAR(20),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT RequestId, RequestDate, Uhid, PatientName, Specialty, AdmissionType,
               Priority, ProvisionalDiagnosis, RequestedBy, Status
        FROM IPD_AdmissionRequest
        WHERE IsDeleted = 0
        ORDER BY RequestId DESC;

    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO IPD_AdmissionRequest (Uhid, PatientName, Specialty, AdmissionType, Priority,
                                          ProvisionalDiagnosis, RequestedBy, Status, CreatedBy)
        VALUES (p_Uhid, p_PatientName, p_Specialty, p_AdmissionType, p_Priority,
                p_ProvisionalDiagnosis, p_RequestedBy, 'Pending', p_User);
        SELECT LAST_INSERT_ID() AS RequestId;

    ELSEIF p_Opt = 'UPDATESTATUS' THEN
        UPDATE IPD_AdmissionRequest SET Status = p_Status, UpdatedBy = p_User
        WHERE RequestId = p_RequestId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END$$
DELIMITER ;
