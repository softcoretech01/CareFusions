import urllib.parse
from sqlalchemy import create_engine, text
from app.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD

url = f'mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD) if DB_PASSWORD else ""}@{DB_HOST}:{DB_PORT}/hospital'
engine = create_engine(url)

sp_sql1 = """
DROP PROCEDURE IF EXISTS hospital.SpIpdAdmissionRequest;
"""

sp_sql2 = """
CREATE PROCEDURE hospital.SpIpdAdmissionRequest(
    IN p_Opt VARCHAR(20),
    IN p_RequestId INT,
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_Specialty VARCHAR(100),
    IN p_AdmissionType VARCHAR(50),
    IN p_Priority VARCHAR(20),
    IN p_AdmissionReason VARCHAR(500),
    IN p_RequestedBy VARCHAR(150),
    IN p_Status VARCHAR(20),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT RequestId, RequestDate, Uhid, PatientName, Specialty, AdmissionType, Priority,
               AdmissionReason, RequestedBy, Status
        FROM IPD_AdmissionRequest
        WHERE IsDeleted = 0
        ORDER BY CASE Status WHEN 'Pending' THEN 1 WHEN 'Admitted' THEN 2 ELSE 3 END, RequestId DESC;

    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO IPD_AdmissionRequest (Uhid, PatientName, Specialty, AdmissionType, Priority,
                                          AdmissionReason, RequestedBy, Status, CreatedBy)
        VALUES (p_Uhid, p_PatientName, p_Specialty, p_AdmissionType, p_Priority,
                p_AdmissionReason, p_RequestedBy, 'Pending', p_User);
        SELECT LAST_INSERT_ID() AS RequestId;

    ELSEIF p_Opt = 'UPDATESTATUS' THEN
        UPDATE IPD_AdmissionRequest SET Status = p_Status, UpdatedBy = p_User
        WHERE RequestId = p_RequestId;
        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END
"""

sp_sql3 = """
DROP PROCEDURE IF EXISTS hospital.SpIpdAdmission;
"""

sp_sql4 = """
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
    IN p_Status VARCHAR(30),
    IN p_CurrentWardId INT,
    IN p_CurrentBedId INT,
    IN p_AdmissionReason VARCHAR(500),
    IN p_InsuranceStatus VARCHAR(50),
    IN p_OperationsData JSON,
    IN p_DischargeDate DATE,
    IN p_DischargeSummary TEXT,
    IN p_DischargedBy VARCHAR(150),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT a.AdmissionId, a.AdmissionNumber, a.Uhid, a.PatientName, a.Age, a.Gender,
               a.AdmissionDate, a.AdmittingDoctor, a.Specialty, a.AdmissionType, a.Status,
               a.CurrentWardId, w.WardName, a.CurrentBedId, b.BedNumber,
               a.AdmissionReason
        FROM IPD_Admission a
        LEFT JOIN IPD_Ward w ON w.WardId = a.CurrentWardId
        LEFT JOIN IPD_Bed b ON b.BedId = a.CurrentBedId
        WHERE a.IsDeleted = 0
        ORDER BY a.AdmissionId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT a.AdmissionId, a.AdmissionNumber, a.Uhid, a.PatientName, a.Age, a.Gender, a.BloodGroup,
               a.AdmissionDate, a.AdmittingDoctor, a.Specialty, a.AdmissionType, a.Priority, a.ExpectedStayDays,
               a.Status, a.CurrentWardId, w.WardName, a.CurrentBedId, b.BedNumber,
               a.AdmissionReason, a.InsuranceStatus, a.OperationsData,
               a.DischargeDate, a.DischargeSummary, a.DischargedBy
        FROM IPD_Admission a
        LEFT JOIN IPD_Ward w ON w.WardId = a.CurrentWardId
        LEFT JOIN IPD_Bed b ON b.BedId = a.CurrentBedId
        WHERE a.AdmissionId = p_AdmissionId;

    ELSEIF p_Opt = 'TRANSFERS' THEN
        SELECT TransferId, FromWardId, ToWardId, FromBedId, ToBedId, TransferDate, TransferReason
        FROM IPD_WardTransfer WHERE AdmissionId = p_AdmissionId ORDER BY TransferId DESC;

    ELSEIF p_Opt = 'DISCHARGEMEDS' THEN
        SELECT DischargeMedId, MedicineName, Dosage, Frequency, Duration, Quantity, Notes
        FROM IPD_DischargeMedicine WHERE AdmissionId = p_AdmissionId ORDER BY DischargeMedId;

    ELSEIF p_Opt = 'ADMIT' THEN
        SET @next_num = COALESCE((SELECT MAX(CAST(SUBSTRING(AdmissionNumber, 10) AS UNSIGNED)) FROM IPD_Admission WHERE AdmissionNumber LIKE CONCAT('IPD-', YEAR(CURRENT_DATE), '%')), 0) + 1;
        SET @adm_no = CONCAT('IPD-', YEAR(CURRENT_DATE), LPAD(@next_num, 4, '0'));

        INSERT INTO IPD_Admission (AdmissionNumber, Uhid, PatientName, Age, Gender, BloodGroup,
                                   AdmittingDoctor, Specialty, AdmissionType, Priority, ExpectedStayDays,
                                   Status, CurrentWardId, CurrentBedId, AdmissionReason, InsuranceStatus, OperationsData, CreatedBy)
        VALUES (@adm_no, p_Uhid, p_PatientName, p_Age, p_Gender, p_BloodGroup,
                p_AdmittingDoctor, p_Specialty, p_AdmissionType, p_Priority, p_ExpectedStayDays,
                COALESCE(p_Status,'Admitted'), p_CurrentWardId, p_CurrentBedId, p_AdmissionReason, p_InsuranceStatus, p_OperationsData, p_User);
        
        SET @new_id = LAST_INSERT_ID();
        
        IF p_CurrentBedId IS NOT NULL THEN
            UPDATE IPD_Bed SET Status = 'Occupied', UpdatedBy = p_User WHERE BedId = p_CurrentBedId;
        END IF;
        
        SELECT @new_id AS AdmissionId, @adm_no AS AdmissionNumber;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE IPD_Admission
        SET Age = p_Age, Gender = p_Gender, BloodGroup = p_BloodGroup,
            AdmittingDoctor = p_AdmittingDoctor, Specialty = p_Specialty,
            AdmissionType = p_AdmissionType, ExpectedStayDays = p_ExpectedStayDays,
            AdmissionReason = p_AdmissionReason, InsuranceStatus = p_InsuranceStatus,
            UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'OPEMRUPDATE' THEN
        UPDATE IPD_Admission SET OperationsData = p_OperationsData, UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'ALLOCATEBED' THEN
        SELECT CurrentWardId, CurrentBedId INTO @oldWard, @oldBed
        FROM IPD_Admission WHERE AdmissionId = p_AdmissionId;

        UPDATE IPD_Admission 
        SET CurrentWardId = p_CurrentWardId, CurrentBedId = p_CurrentBedId, UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId;

        IF @oldBed IS NOT NULL AND @oldBed != p_CurrentBedId THEN
            UPDATE IPD_Bed SET Status = 'Cleaning', UpdatedBy = p_User WHERE BedId = @oldBed;
        END IF;

        IF p_CurrentBedId IS NOT NULL AND p_CurrentBedId != IFNULL(@oldBed,0) THEN
            UPDATE IPD_Bed SET Status = 'Occupied', UpdatedBy = p_User WHERE BedId = p_CurrentBedId;
        END IF;

        IF @oldWard IS NOT NULL OR p_CurrentWardId IS NOT NULL THEN
            INSERT INTO IPD_WardTransfer (AdmissionId, FromWardId, ToWardId, FromBedId, ToBedId, TransferReason)
            VALUES (p_AdmissionId, @oldWard, p_CurrentWardId, @oldBed, p_CurrentBedId, p_DischargeSummary);
        END IF;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'REQUESTDISCHARGE' THEN
        UPDATE IPD_Admission SET Status = 'Discharge Requested', UpdatedBy = p_User WHERE AdmissionId = p_AdmissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DISCHARGE' THEN
        SELECT CurrentBedId INTO @oldBed FROM IPD_Admission WHERE AdmissionId = p_AdmissionId;
        
        UPDATE IPD_Admission 
        SET Status = 'Discharged', DischargeDate = p_DischargeDate,
            DischargeSummary = p_DischargeSummary, DischargedBy = p_DischargedBy,
            UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId;
        
        IF @oldBed IS NOT NULL THEN
            UPDATE IPD_Bed SET Status = 'Cleaning', UpdatedBy = p_User WHERE BedId = @oldBed;
        END IF;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELDISCHARGEMEDS' THEN
        DELETE FROM IPD_DischargeMedicine WHERE AdmissionId = p_AdmissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'ADDDISCHARGEMED' THEN
        INSERT INTO IPD_DischargeMedicine (AdmissionId, MedicineName, Dosage, Frequency, Duration, Quantity, Notes)
        VALUES (p_AdmissionId, p_PatientName, p_Gender, p_BloodGroup, p_Specialty, p_ExpectedStayDays, p_AdmissionReason);
        SELECT LAST_INSERT_ID() AS DischargeMedId;

    END IF;
END
"""

with engine.connect() as conn:
    conn.execute(text(sp_sql1))
    conn.execute(text(sp_sql2))
    conn.execute(text(sp_sql3))
    conn.execute(text(sp_sql4))
    conn.commit()
    print("ALL SPs UPDATED")
