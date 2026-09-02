import urllib.parse
from sqlalchemy import create_engine, text
from app.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD

url = f'mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD) if DB_PASSWORD else ""}@{DB_HOST}:{DB_PORT}/hospital'
engine = create_engine(url)

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
    IN p_WardId INT,
    IN p_BedId INT,
    IN p_AdmissionReason VARCHAR(500),
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
                                   Status, CurrentWardId, CurrentBedId, AdmissionReason, InsuranceStatus, CreatedBy)
        VALUES (@adm_no, p_Uhid, p_PatientName, p_Age, p_Gender, p_BloodGroup,
                p_AdmittingDoctor, p_Specialty, p_AdmissionType, p_Priority, p_ExpectedStayDays,
                'Admitted', p_WardId, p_BedId, p_AdmissionReason, p_InsuranceStatus, p_User);
        
        SET @new_id = LAST_INSERT_ID();
        
        IF p_BedId IS NOT NULL THEN
            UPDATE IPD_Bed SET Status = 'Occupied', UpdatedBy = p_User WHERE BedId = p_BedId;
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

    ELSEIF p_Opt = 'ALLOCATEBED' THEN
        SELECT CurrentWardId, CurrentBedId INTO @oldWard, @oldBed
        FROM IPD_Admission WHERE AdmissionId = p_AdmissionId;

        UPDATE IPD_Admission 
        SET CurrentWardId = p_WardId, CurrentBedId = p_BedId, UpdatedBy = p_User
        WHERE AdmissionId = p_AdmissionId;

        IF @oldBed IS NOT NULL AND @oldBed != p_BedId THEN
            UPDATE IPD_Bed SET Status = 'Cleaning', UpdatedBy = p_User WHERE BedId = @oldBed;
        END IF;

        IF p_BedId IS NOT NULL AND p_BedId != IFNULL(@oldBed,0) THEN
            UPDATE IPD_Bed SET Status = 'Occupied', UpdatedBy = p_User WHERE BedId = p_BedId;
        END IF;

        IF @oldWard IS NOT NULL OR p_WardId IS NOT NULL THEN
            INSERT INTO IPD_WardTransfer (AdmissionId, FromWardId, ToWardId, FromBedId, ToBedId, TransferReason)
            VALUES (p_AdmissionId, @oldWard, p_WardId, @oldBed, p_BedId, p_TransferReason);
        END IF;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'REQUESTDISCHARGE' THEN
        UPDATE IPD_Admission SET Status = 'Discharge Requested', UpdatedBy = p_User WHERE AdmissionId = p_AdmissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DISCHARGE' THEN
        SELECT CurrentBedId INTO @oldBed FROM IPD_Admission WHERE AdmissionId = p_AdmissionId;
        
        UPDATE IPD_Admission 
        SET Status = 'Discharged', DischargeDate = CURRENT_DATE,
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
        VALUES (p_AdmissionId, p_MedicineName, p_Dosage, p_Frequency, p_Duration, p_Quantity, p_Notes);
        SELECT LAST_INSERT_ID() AS DischargeMedId;

    END IF;
END
"""

with engine.connect() as conn:
    conn.execute(text("DROP PROCEDURE IF EXISTS hospital.SpIpdAdmission;"))
    conn.execute(text(sp_sql4))
    conn.commit()
    print("SpIpdAdmission UPDATED WITH CORRECT ARGS")
