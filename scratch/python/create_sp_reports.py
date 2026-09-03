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
                -- RESULT SET 1: KPIs
                SELECT 
                    COUNT(PatientId) AS TotalRegistrations,
                    SUM(CASE WHEN PatientType IN ('OP', 'Walk-In') THEN 1 ELSE 0 END) AS OpPatients,
                    SUM(CASE WHEN PatientType = 'Emergency' THEN 1 ELSE 0 END) AS EmergencyPatients,
                    (SELECT COUNT(*) FROM hospital.IPD_Admission 
                     WHERE (p_StartDate IS NULL OR p_StartDate = '' OR DATE(AdmissionDate) >= p_StartDate)
                       AND (p_EndDate IS NULL OR p_EndDate = '' OR DATE(AdmissionDate) <= p_EndDate)
                       AND IsDeleted = 0) AS IpPatients
                FROM PatientRegistration
                WHERE (p_StartDate IS NULL OR p_StartDate = '' OR RegistrationDate >= p_StartDate)
                  AND (p_EndDate IS NULL OR p_EndDate = '' OR RegistrationDate <= p_EndDate);

                -- RESULT SET 2: Demographics
                SELECT 
                    PatientType,
                    COUNT(PatientId) AS PatientCount
                FROM PatientRegistration
                WHERE (p_StartDate IS NULL OR p_StartDate = '' OR RegistrationDate >= p_StartDate)
                  AND (p_EndDate IS NULL OR p_EndDate = '' OR RegistrationDate <= p_EndDate)
                GROUP BY PatientType;

                -- RESULT SET 3: Trends
                SELECT 
                    RegistrationDate,
                    COUNT(PatientId) AS RegistrationCount
                FROM PatientRegistration
                WHERE (p_StartDate IS NULL OR p_StartDate = '' OR RegistrationDate >= p_StartDate)
                  AND (p_EndDate IS NULL OR p_EndDate = '' OR RegistrationDate <= p_EndDate)
                GROUP BY RegistrationDate
                ORDER BY RegistrationDate ASC;

                -- RESULT SET 4: Recent Registrations
                SELECT 
                    Uhid,
                    PatientName,
                    RegistrationDate,
                    PatientType,
                    Status
                FROM PatientRegistration
                WHERE (p_StartDate IS NULL OR p_StartDate = '' OR RegistrationDate >= p_StartDate)
                  AND (p_EndDate IS NULL OR p_EndDate = '' OR RegistrationDate <= p_EndDate)
                ORDER BY CreatedDate DESC
                LIMIT 10;
            END
            """
            
            conn.execute(text(sp_code))
                        
        print("Successfully created SpGetRegistrationReports!")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    run_reports_sql()
