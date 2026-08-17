-- ============================================================
-- Emergency Registration - SQL Script
-- Database : registration
-- Table    : registration.EmergencyRegistration
-- SP       : registration.SpEmergencyRegistration
-- Screen   : /registration/emergency (EmergencyRegistration.tsx)
--
-- Object names are fully qualified with `registration.` so this script
-- deploys correctly under init_db.py even when the connection's default
-- schema is `admin`.
-- ============================================================
CREATE DATABASE IF NOT EXISTS registration;

CREATE TABLE IF NOT EXISTS registration.EmergencyRegistration (
    EmergencyRegistrationId INT AUTO_INCREMENT PRIMARY KEY,
    Uhid VARCHAR(20) UNIQUE,
    RegistrationDate DATE,
    RegistrationTime TIME,
    PatientName VARCHAR(50),
    Gender VARCHAR(10),
    ApproximateAge INT,
    EmergencyContactName VARCHAR(50),
    EmergencyContactPhone VARCHAR(10),
    Status VARCHAR(20),
    CreatedBy VARCHAR(50),
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy VARCHAR(50),
    ModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP PROCEDURE IF EXISTS registration.SpEmergencyRegistration;
DELIMITER $$
CREATE PROCEDURE registration.SpEmergencyRegistration(
    IN p_Opt VARCHAR(20),
    IN p_EmergencyRegistrationId INT,
    IN p_RegistrationDate DATE,
    IN p_RegistrationTime TIME,
    IN p_PatientName VARCHAR(50),
    IN p_Gender VARCHAR(10),
    IN p_ApproximateAge INT,
    IN p_EmergencyContactName VARCHAR(50),
    IN p_EmergencyContactPhone VARCHAR(10),
    IN p_Status VARCHAR(20),
    IN p_CreatedBy VARCHAR(50),
    IN p_ModifiedBy VARCHAR(50)
)
BEGIN
    IF p_Opt = 'SELECT_ALL' THEN
        SELECT * FROM registration.EmergencyRegistration ORDER BY EmergencyRegistrationId DESC;

    ELSEIF p_Opt = 'SELECT_BY_ID' THEN
        SELECT * FROM registration.EmergencyRegistration WHERE EmergencyRegistrationId = p_EmergencyRegistrationId;

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

        INSERT INTO registration.EmergencyRegistration (
            Uhid, RegistrationDate, RegistrationTime, PatientName, Gender, ApproximateAge,
            EmergencyContactName, EmergencyContactPhone, Status, CreatedBy
        ) VALUES (
            @new_uhid, p_RegistrationDate, p_RegistrationTime, p_PatientName, p_Gender, p_ApproximateAge,
            p_EmergencyContactName, p_EmergencyContactPhone, p_Status, p_CreatedBy
        );

        SET @new_id = LAST_INSERT_ID();
        
        COMMIT;
        SELECT RELEASE_LOCK('generate_uhid_lock') INTO @lock_released;

        SELECT * FROM registration.EmergencyRegistration WHERE EmergencyRegistrationId = @new_id;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE registration.EmergencyRegistration SET
            RegistrationDate = p_RegistrationDate,
            RegistrationTime = p_RegistrationTime,
            PatientName = p_PatientName,
            Gender = p_Gender,
            ApproximateAge = p_ApproximateAge,
            EmergencyContactName = p_EmergencyContactName,
            EmergencyContactPhone = p_EmergencyContactPhone,
            Status = p_Status,
            ModifiedBy = p_ModifiedBy
        WHERE EmergencyRegistrationId = p_EmergencyRegistrationId;

        SELECT * FROM registration.EmergencyRegistration WHERE EmergencyRegistrationId = p_EmergencyRegistrationId;

    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM registration.EmergencyRegistration WHERE EmergencyRegistrationId = p_EmergencyRegistrationId;
        SELECT ROW_COUNT() as affected_rows;
    END IF;
END$$
DELIMITER ;
