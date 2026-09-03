USE registration;

DELIMITER $$

DROP PROCEDURE IF EXISTS SpGetRegistrationReports$$

CREATE PROCEDURE SpGetRegistrationReports(
    IN p_StartDate DATE,
    IN p_EndDate DATE
)
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
    SELECT PatientId, Uhid, PatientName, RegistrationDate, CreatedDate, PatientType, 'Active' AS Status
    FROM PatientRegistration
    WHERE (p_StartDate IS NULL OR DATE(RegistrationDate) >= p_StartDate)
      AND (p_EndDate IS NULL OR DATE(RegistrationDate) <= p_EndDate);
      
    INSERT INTO TempAllRegistrations
    SELECT QuickRegistrationId, Uhid, PatientName, RegistrationDate, CreatedDate, 'Walk-In', Status
    FROM QuickRegistration
    WHERE (p_StartDate IS NULL OR DATE(RegistrationDate) >= p_StartDate)
      AND (p_EndDate IS NULL OR DATE(RegistrationDate) <= p_EndDate);
      
    INSERT INTO TempAllRegistrations
    SELECT EmergencyRegistrationId, Uhid, PatientName, RegistrationDate, CreatedDate, 'Emergency', Status
    FROM EmergencyRegistration
    WHERE (p_StartDate IS NULL OR DATE(RegistrationDate) >= p_StartDate)
      AND (p_EndDate IS NULL OR DATE(RegistrationDate) <= p_EndDate);

    INSERT INTO TempAllRegistrations
    SELECT AdmissionId, Uhid, PatientName, DATE(AdmissionDate), CreatedDate, 'IPD', Status
    FROM hospital.IPD_Admission
    WHERE IsDeleted = 0
      AND (p_StartDate IS NULL OR DATE(AdmissionDate) >= p_StartDate)
      AND (p_EndDate IS NULL OR DATE(AdmissionDate) <= p_EndDate);

    -- RESULT SET 1: KPIs
    SELECT 
        COUNT(Id) AS TotalRegistrations,
        SUM(CASE WHEN PatientType IN ('OP', 'Walk-In') THEN 1 ELSE 0 END) AS OpPatients,
        SUM(CASE WHEN PatientType = 'Emergency' THEN 1 ELSE 0 END) AS EmergencyPatients,
        SUM(CASE WHEN PatientType = 'IPD' THEN 1 ELSE 0 END) AS IpPatients
    FROM TempAllRegistrations;

    -- RESULT SET 2: Demographics
    SELECT 
        PatientType,
        COUNT(Id) AS PatientCount
    FROM TempAllRegistrations
    GROUP BY PatientType;

    -- RESULT SET 3: Trends
    SELECT 
        DATE(RegistrationDate) AS RegistrationDate,
        COUNT(Id) AS RegistrationCount
    FROM TempAllRegistrations
    GROUP BY DATE(RegistrationDate)
    ORDER BY DATE(RegistrationDate) ASC;

    -- RESULT SET 4: Recent Registrations
    SELECT 
        Uhid,
        PatientName,
        RegistrationDate,
        PatientType,
        Status
    FROM TempAllRegistrations
    ORDER BY CreatedDate DESC;
    
    DROP TEMPORARY TABLE IF EXISTS TempAllRegistrations;
END$$

DELIMITER ;
