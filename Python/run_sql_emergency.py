import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def execute_sql_file():
    part1 = """
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
    """
    
    part2 = """
    DROP PROCEDURE IF EXISTS registration.SpEmergencyRegistration;
    """

    part3 = """
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
            INSERT INTO registration.EmergencyRegistration (
                RegistrationDate, RegistrationTime, PatientName, Gender, ApproximateAge,
                EmergencyContactName, EmergencyContactPhone, Status, CreatedBy
            ) VALUES (
                p_RegistrationDate, p_RegistrationTime, p_PatientName, p_Gender, p_ApproximateAge,
                p_EmergencyContactName, p_EmergencyContactPhone, p_Status, p_CreatedBy
            );
            
            SET @new_id = LAST_INSERT_ID();
            SET @new_uhid = CONCAT('UHID-EM-', YEAR(CURDATE()), '-', LPAD(@new_id, 4, '0'));
            
            UPDATE registration.EmergencyRegistration SET Uhid = @new_uhid WHERE EmergencyRegistrationId = @new_id;
            
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
    END;
    """

    with engine.begin() as conn:
        print("Executing EmergencyRegistration Table Creation...")
        conn.execute(text(part1))
        
        print("Executing Drop Procedure...")
        conn.execute(text(part2))
        
        print("Executing Create Procedure...")
        conn.execute(text(part3))
        
        print("Successfully created table and stored procedure in `registration` DB!")

if __name__ == '__main__':
    execute_sql_file()
