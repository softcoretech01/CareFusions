import pymysql

conn = pymysql.connect(host='100.86.181.18', port=3320, user='root', password='H3s#2026#01', database='registration')
cursor = conn.cursor()

# Drop columns
try:
    cursor.execute("ALTER TABLE QuickRegistration DROP COLUMN Department, DROP COLUMN Doctor;")
    print("Columns dropped.")
except Exception as e:
    print("Drop columns error:", e)

# Update SP
sp_sql = """
CREATE DEFINER=`root`@`%` PROCEDURE `SpQuickRegistration`(
    IN p_Opt VARCHAR(20),
    IN p_QuickRegistrationId INT,
    IN p_RegistrationDate DATE,
    IN p_RegistrationTime TIME,
    IN p_Title VARCHAR(10),
    IN p_PatientName VARCHAR(50),
    IN p_Gender VARCHAR(10),
    IN p_DateOfBirth DATE,
    IN p_Age INT,
    IN p_MobileNumber VARCHAR(10),
    IN p_AlternateMobile VARCHAR(10),
    IN p_VisitType VARCHAR(50),
    IN p_Priority VARCHAR(20),
    IN p_VisitReason VARCHAR(250),
    IN p_ConsultationRequired VARCHAR(10),
    IN p_ConsultationFee DECIMAL(10,2),
    IN p_PaymentMode VARCHAR(50),
    IN p_InsuranceRequired VARCHAR(10),
    IN p_InsuranceProvider VARCHAR(50),
    IN p_Tpa VARCHAR(50),
    IN p_PolicyNumber VARCHAR(50),
    IN p_ValidTill DATE,
    IN p_Status VARCHAR(20),
    IN p_Remarks VARCHAR(250),
    IN p_CreatedBy VARCHAR(50),
    IN p_ModifiedBy VARCHAR(50)
)
BEGIN
    IF p_Opt = 'SELECT_ALL' THEN
        SELECT * FROM registration.QuickRegistration WHERE COALESCE(IsDeleted, 0) = 0 ORDER BY QuickRegistrationId DESC;
    ELSEIF p_Opt = 'SELECT_BY_ID' THEN
        SELECT * FROM registration.QuickRegistration WHERE QuickRegistrationId = p_QuickRegistrationId;
    ELSEIF p_Opt = 'INSERT' THEN
        IF GET_LOCK('generate_uhid_lock', 10) = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'System is busy generating UHIDs, please try again.';
        END IF;
        
        SELECT MAX(CAST(SUBSTRING_INDEX(Uhid, '-', -1) AS UNSIGNED)) INTO @max_seq
        FROM (
            SELECT Uhid FROM registration.PatientRegistration WHERE Uhid LIKE 'UHID-%'
            UNION ALL
            SELECT Uhid FROM registration.QuickRegistration WHERE Uhid LIKE 'UHID-%'
            UNION ALL
            SELECT Uhid FROM registration.EmergencyRegistration WHERE Uhid LIKE 'UHID-%'
        ) AS AllUhids;
        
        SET @max_seq = IFNULL(@max_seq, 0) + 1;
        SET @new_uhid = CONCAT('UHID-', YEAR(CURDATE()), '-', LPAD(@max_seq, 4, '0'));

        INSERT INTO registration.QuickRegistration (
            Uhid, RegistrationDate, RegistrationTime, Title, PatientName,
            Gender, DateOfBirth, Age, MobileNumber, AlternateMobile,
            VisitType, Priority, VisitReason,
            ConsultationRequired, ConsultationFee, PaymentMode, InsuranceRequired,
            InsuranceProvider, Tpa, PolicyNumber, ValidTill,
            Status, Remarks, CreatedBy
        ) VALUES (
            @new_uhid, p_RegistrationDate, p_RegistrationTime, p_Title, p_PatientName,
            p_Gender, p_DateOfBirth, p_Age, p_MobileNumber, p_AlternateMobile,
            p_VisitType, p_Priority, p_VisitReason,
            p_ConsultationRequired, p_ConsultationFee, p_PaymentMode, p_InsuranceRequired,
            p_InsuranceProvider, p_Tpa, p_PolicyNumber, p_ValidTill,
            p_Status, p_Remarks, p_CreatedBy
        );

        SET @new_id = LAST_INSERT_ID();
        COMMIT;
        SELECT RELEASE_LOCK('generate_uhid_lock') INTO @lock_released;
        SELECT * FROM registration.QuickRegistration WHERE QuickRegistrationId = @new_id;
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE registration.QuickRegistration SET
            RegistrationDate = p_RegistrationDate,
            RegistrationTime = p_RegistrationTime,
            Title = p_Title,
            PatientName = p_PatientName,
            Gender = p_Gender,
            DateOfBirth = p_DateOfBirth,
            Age = p_Age,
            MobileNumber = p_MobileNumber,
            AlternateMobile = p_AlternateMobile,
            VisitType = p_VisitType,
            Priority = p_Priority,
            VisitReason = p_VisitReason,
            ConsultationRequired = p_ConsultationRequired,
            ConsultationFee = p_ConsultationFee,
            PaymentMode = p_PaymentMode,
            InsuranceRequired = p_InsuranceRequired,
            InsuranceProvider = p_InsuranceProvider,
            Tpa = p_Tpa,
            PolicyNumber = p_PolicyNumber,
            ValidTill = p_ValidTill,
            Status = p_Status,
            Remarks = p_Remarks,
            ModifiedBy = p_ModifiedBy
        WHERE QuickRegistrationId = p_QuickRegistrationId;

        SELECT * FROM registration.QuickRegistration WHERE QuickRegistrationId = p_QuickRegistrationId;
    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM registration.QuickRegistration WHERE QuickRegistrationId = p_QuickRegistrationId;
        SELECT ROW_COUNT() as affected_rows;
    END IF;
END
"""

try:
    cursor.execute("DROP PROCEDURE IF EXISTS SpQuickRegistration;")
    cursor.execute(sp_sql)
    conn.commit()
    print("SP Updated.")
except Exception as e:
    print("SP update error:", e)
