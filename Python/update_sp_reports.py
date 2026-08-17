import sys
import os
sys.path.append(os.getcwd())
from app.database import engine
from sqlalchemy import text

def run_reports_sql():
    try:
        with engine.begin() as conn:
            conn.execute(text("USE registration;"))
            conn.execute(text("DROP PROCEDURE IF EXISTS SpGetRegistrationReports;"))
            
            sp_code = """
            CREATE PROCEDURE SpGetRegistrationReports(
                IN p_StartDate DATE,
                IN p_EndDate DATE
            )
            BEGIN
                CREATE TEMPORARY TABLE IF NOT EXISTS TempAllRegistrations (
                    Id INT,
                    Uhid VARCHAR(20),
                    PatientName VARCHAR(50),
                    RegistrationDate DATE,
                    CreatedDate TIMESTAMP,
                    PatientType VARCHAR(20),
                    Status VARCHAR(20)
                );
                
                TRUNCATE TABLE TempAllRegistrations;
                
                INSERT INTO TempAllRegistrations
                SELECT PatientId, Uhid, PatientName, RegistrationDate, CreatedDate, PatientType, Status
                FROM PatientRegistration
                WHERE (p_StartDate IS NULL OR RegistrationDate >= p_StartDate)
                  AND (p_EndDate IS NULL OR RegistrationDate <= p_EndDate);
                  
                INSERT INTO TempAllRegistrations
                SELECT QuickRegistrationId, Uhid, PatientName, RegistrationDate, CreatedDate, 'Walk-In', Status
                FROM QuickRegistration
                WHERE (p_StartDate IS NULL OR RegistrationDate >= p_StartDate)
                  AND (p_EndDate IS NULL OR RegistrationDate <= p_EndDate);
                  
                INSERT INTO TempAllRegistrations
                SELECT EmergencyRegistrationId, Uhid, PatientName, RegistrationDate, CreatedDate, 'Emergency', Status
                FROM EmergencyRegistration
                WHERE (p_StartDate IS NULL OR RegistrationDate >= p_StartDate)
                  AND (p_EndDate IS NULL OR RegistrationDate <= p_EndDate);

                -- RESULT SET 1: KPIs
                SELECT 
                    COUNT(Id) AS TotalRegistrations,
                    SUM(CASE WHEN PatientType IN ('OP', 'Walk-In') THEN 1 ELSE 0 END) AS OpPatients,
                    SUM(CASE WHEN PatientType = 'Emergency' THEN 1 ELSE 0 END) AS EmergencyPatients,
                    (SELECT COUNT(*) FROM hospital.IPD_Admission 
                     WHERE (p_StartDate IS NULL OR p_StartDate = '' OR DATE(AdmissionDate) >= p_StartDate)
                       AND (p_EndDate IS NULL OR p_EndDate = '' OR DATE(AdmissionDate) <= p_EndDate)
                       AND IsDeleted = 0) AS IpPatients
                FROM TempAllRegistrations;

                -- RESULT SET 2: Demographics
                SELECT 
                    PatientType,
                    COUNT(Id) AS PatientCount
                FROM TempAllRegistrations
                GROUP BY PatientType;

                -- RESULT SET 3: Trends
                SELECT 
                    RegistrationDate,
                    COUNT(Id) AS RegistrationCount
                FROM TempAllRegistrations
                GROUP BY RegistrationDate
                ORDER BY RegistrationDate ASC;

                -- RESULT SET 4: Recent Registrations
                SELECT 
                    Uhid,
                    PatientName,
                    RegistrationDate,
                    PatientType,
                    Status
                FROM TempAllRegistrations
                ORDER BY CreatedDate DESC
                LIMIT 10;
                
                DROP TEMPORARY TABLE IF EXISTS TempAllRegistrations;
            END
            """
            
            conn.execute(text(sp_code))
                        
        print("Successfully fixed SpGetRegistrationReports date check!")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    run_reports_sql()
