from app.database import SessionLocal
from sqlalchemy import text

def update_sp():
    db = SessionLocal()
    try:
        # Drop the existing procedure
        db.execute(text("DROP PROCEDURE IF EXISTS hospital.SpIpdAdmission;"))
        db.commit()
        
        # Create the new procedure
        create_sp_sql = """
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
               InsuranceStatus, OperationsData, DischargeDate, DischargeSummary, DischargedBy
        FROM IPD_Admission
        WHERE IsDeleted = 0
        ORDER BY AdmissionId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT AdmissionId, AdmissionNumber, Uhid, PatientName, Age, Gender, BloodGroup,
               AdmissionDate, AdmittingDoctor, Specialty, AdmissionType, Priority,
               ExpectedStayDays, Status, CurrentWardId, CurrentBedId, ProvisionalDiagnosis,
               InsuranceStatus, OperationsData, DischargeDate, DischargeSummary, DischargedBy
        FROM IPD_Admission
        WHERE AdmissionId = p_AdmissionId AND IsDeleted = 0;

    ELSEIF p_Opt = 'TRANSFERS' THEN
        SELECT TransferId, AdmissionId, FromWardId, ToWardId, FromBedId, ToBedId,
               TransferDate, TransferReason
        FROM IPD_WardTransfer
        ORDER BY AdmissionId, TransferDate;

    ELSEIF p_Opt = 'DISCHARGEMEDS' THEN
        SELECT DM.DischargeMedId, DM.AdmissionId, DM.MedicineName, DM.Dosage, DM.Frequency, DM.Duration, DM.Quantity, DM.Notes,
               COALESCE((SELECT SellingPrice FROM admin.Master_Medicine WHERE GenericName = SUBSTRING_INDEX(DM.MedicineName, ' (', 1) AND IsDeleted = 0 LIMIT 1), 0) AS Price
        FROM IPD_DischargeMedicine DM
        ORDER BY DM.AdmissionId, DM.DischargeMedId;

    ELSEIF p_Opt = 'ADMIT' THEN
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

        IF v_OldWard IS NOT NULL AND v_OldWard <> p_WardId AND v_OldBed IS NOT NULL THEN
            INSERT INTO IPD_WardTransfer (AdmissionId, FromWardId, ToWardId, FromBedId, ToBedId, TransferReason)
            VALUES (p_AdmissionId, v_OldWard, p_WardId, v_OldBed, p_BedId, p_TransferReason);
        END IF;

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
END
        """
        db.execute(text(create_sp_sql))
        db.commit()
        print("Successfully updated SpIpdAdmission")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_sp()
