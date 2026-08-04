USE registration;

CREATE TABLE IF NOT EXISTS PatientRegistration (
    PatientId INT AUTO_INCREMENT PRIMARY KEY,
    Uhid VARCHAR(20) UNIQUE,
    RegistrationDate DATE,
    Title VARCHAR(10),
    PatientName VARCHAR(50),
    Gender VARCHAR(10),
    DateOfBirth DATE,
    Age INT,
    MaritalStatus VARCHAR(20),
    BloodGroup VARCHAR(10),
    Nationality VARCHAR(50),
    Religion VARCHAR(50),
    Occupation VARCHAR(50),
    MobileNumber VARCHAR(10),
    AlternateMobile VARCHAR(10),
    Email VARCHAR(50),
    Address1 VARCHAR(250),
    Address2 VARCHAR(250),
    Country VARCHAR(50),
    State VARCHAR(50),
    District VARCHAR(50),
    City VARCHAR(50),
    PinCode VARCHAR(20),
    AadhaarNumber VARCHAR(20),
    PassportNumber VARCHAR(20),
    PanNumber VARCHAR(20),
    DrivingLicense VARCHAR(20),
    NationalIdType VARCHAR(50),
    NationalIdNumber VARCHAR(50),
    EmergencyContactName VARCHAR(50),
    EmergencyRelationship VARCHAR(50),
    EmergencyMobile VARCHAR(10),
    EmergencyAlternateMobile VARCHAR(10),
    EmergencyAddress VARCHAR(250),
    Allergies VARCHAR(250),
    ChronicDiseases VARCHAR(250),
    CurrentMedication VARCHAR(250),
    OrganDonor VARCHAR(10),
    Disability VARCHAR(50),
    InsuranceRequired VARCHAR(10),
    InsuranceProvider VARCHAR(50),
    Tpa VARCHAR(50),
    PolicyNumber VARCHAR(50),
    ValidTill DATE,
    PatientType VARCHAR(50),
    ReferredBy VARCHAR(50),
    PrimaryDoctor VARCHAR(50),
    Department VARCHAR(50),
    RegistrationSource VARCHAR(50),
    PrivacyConsent BOOLEAN,
    SmsConsent BOOLEAN,
    EmailConsent BOOLEAN,
    WhatsappConsent BOOLEAN,
    Status VARCHAR(20),
    Remarks VARCHAR(250),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DELIMITER //

CREATE PROCEDURE SpPatientRegistration(
    IN p_Opt VARCHAR(20),
    IN p_PatientId INT,
    IN p_RegistrationDate DATE,
    IN p_Title VARCHAR(10),
    IN p_PatientName VARCHAR(50),
    IN p_Gender VARCHAR(10),
    IN p_DateOfBirth DATE,
    IN p_Age INT,
    IN p_MaritalStatus VARCHAR(20),
    IN p_BloodGroup VARCHAR(10),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Occupation VARCHAR(50),
    IN p_MobileNumber VARCHAR(10),
    IN p_AlternateMobile VARCHAR(10),
    IN p_Email VARCHAR(50),
    IN p_Address1 VARCHAR(250),
    IN p_Address2 VARCHAR(250),
    IN p_Country VARCHAR(50),
    IN p_State VARCHAR(50),
    IN p_District VARCHAR(50),
    IN p_City VARCHAR(50),
    IN p_PinCode VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_PassportNumber VARCHAR(20),
    IN p_PanNumber VARCHAR(20),
    IN p_DrivingLicense VARCHAR(20),
    IN p_NationalIdType VARCHAR(50),
    IN p_NationalIdNumber VARCHAR(50),
    IN p_EmergencyContactName VARCHAR(50),
    IN p_EmergencyRelationship VARCHAR(50),
    IN p_EmergencyMobile VARCHAR(10),
    IN p_EmergencyAlternateMobile VARCHAR(10),
    IN p_EmergencyAddress VARCHAR(250),
    IN p_Allergies VARCHAR(250),
    IN p_ChronicDiseases VARCHAR(250),
    IN p_CurrentMedication VARCHAR(250),
    IN p_OrganDonor VARCHAR(10),
    IN p_Disability VARCHAR(50),
    IN p_InsuranceRequired VARCHAR(10),
    IN p_InsuranceProvider VARCHAR(50),
    IN p_Tpa VARCHAR(50),
    IN p_PolicyNumber VARCHAR(50),
    IN p_ValidTill DATE,
    IN p_PatientType VARCHAR(50),
    IN p_ReferredBy VARCHAR(50),
    IN p_PrimaryDoctor VARCHAR(50),
    IN p_Department VARCHAR(50),
    IN p_RegistrationSource VARCHAR(50),
    IN p_PrivacyConsent BOOLEAN,
    IN p_SmsConsent BOOLEAN,
    IN p_EmailConsent BOOLEAN,
    IN p_WhatsappConsent BOOLEAN,
    IN p_Status VARCHAR(20),
    IN p_Remarks VARCHAR(250)
)
BEGIN
    IF p_Opt = 'SELECT_ALL' THEN
        SELECT * FROM PatientRegistration ORDER BY PatientId DESC;
        
    ELSEIF p_Opt = 'SELECT_BY_ID' THEN
        SELECT * FROM PatientRegistration WHERE PatientId = p_PatientId;
        
    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO PatientRegistration (
            RegistrationDate, Title, PatientName, Gender, DateOfBirth, Age,
            MaritalStatus, BloodGroup, Nationality, Religion, Occupation,
            MobileNumber, AlternateMobile, Email, Address1, Address2,
            Country, State, District, City, PinCode, AadhaarNumber,
            PassportNumber, PanNumber, DrivingLicense, NationalIdType, NationalIdNumber,
            EmergencyContactName, EmergencyRelationship, EmergencyMobile, EmergencyAlternateMobile, EmergencyAddress,
            Allergies, ChronicDiseases, CurrentMedication, OrganDonor, Disability,
            InsuranceRequired, InsuranceProvider, Tpa, PolicyNumber, ValidTill,
            PatientType, ReferredBy, PrimaryDoctor, Department, RegistrationSource,
            PrivacyConsent, SmsConsent, EmailConsent, WhatsappConsent, Status, Remarks
        ) VALUES (
            p_RegistrationDate, p_Title, p_PatientName, p_Gender, p_DateOfBirth, p_Age,
            p_MaritalStatus, p_BloodGroup, p_Nationality, p_Religion, p_Occupation,
            p_MobileNumber, p_AlternateMobile, p_Email, p_Address1, p_Address2,
            p_Country, p_State, p_District, p_City, p_PinCode, p_AadhaarNumber,
            p_PassportNumber, p_PanNumber, p_DrivingLicense, p_NationalIdType, p_NationalIdNumber,
            p_EmergencyContactName, p_EmergencyRelationship, p_EmergencyMobile, p_EmergencyAlternateMobile, p_EmergencyAddress,
            p_Allergies, p_ChronicDiseases, p_CurrentMedication, p_OrganDonor, p_Disability,
            p_InsuranceRequired, p_InsuranceProvider, p_Tpa, p_PolicyNumber, p_ValidTill,
            p_PatientType, p_ReferredBy, p_PrimaryDoctor, p_Department, p_RegistrationSource,
            p_PrivacyConsent, p_SmsConsent, p_EmailConsent, p_WhatsappConsent, p_Status, p_Remarks
        );
        
        SET @new_id = LAST_INSERT_ID();
        SET @new_uhid = CONCAT('UHID-', YEAR(CURDATE()), '-', LPAD(@new_id, 4, '0'));
        
        UPDATE PatientRegistration SET Uhid = @new_uhid WHERE PatientId = @new_id;
        
        SELECT * FROM PatientRegistration WHERE PatientId = @new_id;
        
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE PatientRegistration SET
            RegistrationDate = p_RegistrationDate,
            Title = p_Title,
            PatientName = p_PatientName,
            Gender = p_Gender,
            DateOfBirth = p_DateOfBirth,
            Age = p_Age,
            MaritalStatus = p_MaritalStatus,
            BloodGroup = p_BloodGroup,
            Nationality = p_Nationality,
            Religion = p_Religion,
            Occupation = p_Occupation,
            MobileNumber = p_MobileNumber,
            AlternateMobile = p_AlternateMobile,
            Email = p_Email,
            Address1 = p_Address1,
            Address2 = p_Address2,
            Country = p_Country,
            State = p_State,
            District = p_District,
            City = p_City,
            PinCode = p_PinCode,
            AadhaarNumber = p_AadhaarNumber,
            PassportNumber = p_PassportNumber,
            PanNumber = p_PanNumber,
            DrivingLicense = p_DrivingLicense,
            NationalIdType = p_NationalIdType,
            NationalIdNumber = p_NationalIdNumber,
            EmergencyContactName = p_EmergencyContactName,
            EmergencyRelationship = p_EmergencyRelationship,
            EmergencyMobile = p_EmergencyMobile,
            EmergencyAlternateMobile = p_EmergencyAlternateMobile,
            EmergencyAddress = p_EmergencyAddress,
            Allergies = p_Allergies,
            ChronicDiseases = p_ChronicDiseases,
            CurrentMedication = p_CurrentMedication,
            OrganDonor = p_OrganDonor,
            Disability = p_Disability,
            InsuranceRequired = p_InsuranceRequired,
            InsuranceProvider = p_InsuranceProvider,
            Tpa = p_Tpa,
            PolicyNumber = p_PolicyNumber,
            ValidTill = p_ValidTill,
            PatientType = p_PatientType,
            ReferredBy = p_ReferredBy,
            PrimaryDoctor = p_PrimaryDoctor,
            Department = p_Department,
            RegistrationSource = p_RegistrationSource,
            PrivacyConsent = p_PrivacyConsent,
            SmsConsent = p_SmsConsent,
            EmailConsent = p_EmailConsent,
            WhatsappConsent = p_WhatsappConsent,
            Status = p_Status,
            Remarks = p_Remarks
        WHERE PatientId = p_PatientId;
        
        SELECT * FROM PatientRegistration WHERE PatientId = p_PatientId;
        
    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM PatientRegistration WHERE PatientId = p_PatientId;
        SELECT ROW_COUNT() as affected_rows;
    END IF;
END //
DELIMITER ;
