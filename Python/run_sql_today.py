import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def execute_sql_file():
    part1 = """
    DROP PROCEDURE IF EXISTS registration.SpGetTodayRegistrations;
    """

    part2 = """
    CREATE PROCEDURE registration.SpGetTodayRegistrations()
    BEGIN
        SELECT 
            Uhid, 
            PatientName, 
            'New' AS RegistrationType, 
            Department, 
            PrimaryDoctor AS Doctor, 
            TIME(CreatedDate) AS RegistrationTime, 
            Status
        FROM registration.PatientRegistration
        WHERE RegistrationDate = CURDATE()

        UNION ALL

        SELECT 
            Uhid, 
            PatientName, 
            'Quick' AS RegistrationType, 
            Department, 
            Doctor, 
            RegistrationTime, 
            Status
        FROM registration.QuickRegistration
        WHERE RegistrationDate = CURDATE()

        UNION ALL

        SELECT 
            Uhid, 
            PatientName, 
            'Emergency' AS RegistrationType, 
            'Emergency' AS Department, 
            'Emergency' AS Doctor, 
            RegistrationTime, 
            Status
        FROM registration.EmergencyRegistration
        WHERE RegistrationDate = CURDATE()
        
        ORDER BY RegistrationTime DESC;
    END;
    """

    with engine.begin() as conn:
        print("Executing Drop Procedure...")
        conn.execute(text(part1))
        
        print("Executing Create Procedure...")
        conn.execute(text(part2))
        
        print("Successfully created SpGetTodayRegistrations in `registration` DB!")

if __name__ == '__main__':
    execute_sql_file()
