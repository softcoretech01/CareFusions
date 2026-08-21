-- ======================================================================
-- Doctor Master Tables and Stored Procedure
-- ======================================================================

-- 1. Master_Doctor_Header (Header Table)
CREATE TABLE IF NOT EXISTS Master_Doctor_Header (
    DoctorId            INT AUTO_INCREMENT PRIMARY KEY,
    DoctorCode          VARCHAR(20) NOT NULL UNIQUE,
    DoctorName          VARCHAR(255) NOT NULL,
    Gender              ENUM('Male', 'Female', 'Other') NOT NULL,
    DateOfBirth         DATE NULL,
    Mobile              VARCHAR(20) NOT NULL,
    AlternateMobile     VARCHAR(20) NULL,
    Email               VARCHAR(255) NOT NULL UNIQUE,
    Address1            VARCHAR(500) NULL,
    Address2            VARCHAR(500) NULL,
    City                VARCHAR(100) NULL,
    State               VARCHAR(100) NULL,
    Country             VARCHAR(100) NULL,
    PostalCode          VARCHAR(20) NULL,
    Status              ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    Remarks             TEXT NULL,
    CreatedDate         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CreatedBy           VARCHAR(100) NOT NULL DEFAULT 'System',
    ModifiedDate        DATETIME NULL,
    ModifiedBy          VARCHAR(100) NULL,
    IsDeleted           TINYINT(1) NOT NULL DEFAULT 0
);

-- 2. Master_DoctorProfessional_Detail (Detail Table)
CREATE TABLE IF NOT EXISTS Master_DoctorProfessional_Detail (
    DoctorId            INT PRIMARY KEY,
    Qualification       VARCHAR(255) NOT NULL,
    Specialization      VARCHAR(255) NOT NULL,
    HospitalName        VARCHAR(255) NOT NULL,
    BranchName          VARCHAR(255) NOT NULL,
    DepartmentName      VARCHAR(255) NOT NULL,
    Designation         VARCHAR(100) NULL,
    Experience          INT NULL,
    Languages           VARCHAR(500) NULL,
    JoiningDate         DATE NULL,
    FOREIGN KEY (DoctorId) REFERENCES Master_Doctor_Header(DoctorId) ON DELETE CASCADE
);

-- 3. Master_DoctorConsultation_Detail (Detail Table)
CREATE TABLE IF NOT EXISTS Master_DoctorConsultation_Detail (
    DoctorId            INT PRIMARY KEY,
    ConsultationFee     DECIMAL(10,2) NOT NULL,
    FollowUpFee         DECIMAL(10,2) NULL,
    EmergencyFee        DECIMAL(10,2) NULL,
    TeleConsultationFee DECIMAL(10,2) NULL,
    OpDuration          SMALLINT NOT NULL,
    MaxPatients         SMALLINT NULL,
    AllowOnlineBooking  TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (DoctorId) REFERENCES Master_Doctor_Header(DoctorId) ON DELETE CASCADE
);

-- 4. Master_DoctorSchedule_Detail (Detail Table)
CREATE TABLE IF NOT EXISTS Master_DoctorSchedule_Detail (
    DoctorId            INT PRIMARY KEY,
    AvailableDays       VARCHAR(100) NOT NULL,
    FromTime            TIME NOT NULL,
    ToTime              TIME NOT NULL,
    BreakFrom           TIME NULL,
    BreakTo             TIME NULL,
    SlotDuration        SMALLINT NOT NULL,
    AvailableEmergency  TINYINT(1) NOT NULL DEFAULT 0,
    AvailableTele       TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (DoctorId) REFERENCES Master_Doctor_Header(DoctorId) ON DELETE CASCADE
);

-- 5. Master_DoctorDocument_Detail
CREATE TABLE IF NOT EXISTS Master_DoctorDocument_Detail (
    DoctorId                INT PRIMARY KEY,
    DoctorPhoto             VARCHAR(500) NULL,
    SignatureImage          VARCHAR(500) NULL,
    DigitalSignature        VARCHAR(500) NULL,
    RegistrationCertificate VARCHAR(500) NULL,
    FOREIGN KEY (DoctorId) REFERENCES Master_Doctor_Header(DoctorId) ON DELETE CASCADE
);

DELIMITER $$

DROP PROCEDURE IF EXISTS SpMasterDoctor$$

CREATE PROCEDURE SpMasterDoctor(
    IN p_Opt                VARCHAR(10),
    IN p_DoctorId           INT,
    
    -- General
    IN p_DoctorName         VARCHAR(255),
    IN p_Gender             VARCHAR(20),
    IN p_DateOfBirth        DATE,
    IN p_Mobile             VARCHAR(20),
    IN p_AlternateMobile    VARCHAR(20),
    IN p_Email              VARCHAR(255),
    IN p_Address1           VARCHAR(500),
    IN p_Address2           VARCHAR(500),
    IN p_City               VARCHAR(100),
    IN p_State              VARCHAR(100),
    IN p_Country            VARCHAR(100),
    IN p_PostalCode         VARCHAR(20),
    
    -- Professional
    IN p_Qualification      VARCHAR(255),
    IN p_Specialization     VARCHAR(255),
    IN p_HospitalName       VARCHAR(255),
    IN p_BranchName         VARCHAR(255),
    IN p_DepartmentName     VARCHAR(255),
    IN p_Designation        VARCHAR(100),
    IN p_Experience         INT,
    IN p_Languages          VARCHAR(500),
    IN p_JoiningDate        DATE,
    
    -- Consultation & Billing
    IN p_ConsultationFee    DECIMAL(10,2),
    IN p_FollowUpFee        DECIMAL(10,2),
    IN p_EmergencyFee       DECIMAL(10,2),
    IN p_TeleConsultationFee DECIMAL(10,2),
    IN p_OpDuration         SMALLINT,
    IN p_MaxPatients        SMALLINT,
    IN p_AllowOnlineBooking TINYINT(1),
    
    -- Schedule
    IN p_AvailableDays      VARCHAR(100),
    IN p_FromTime           TIME,
    IN p_ToTime             TIME,
    IN p_BreakFrom          TIME,
    IN p_BreakTo            TIME,
    IN p_SlotDuration       SMALLINT,
    IN p_AvailableEmergency TINYINT(1),
    IN p_AvailableTele      TINYINT(1),
    
    -- Documents
    IN p_DoctorPhoto             VARCHAR(500),
    IN p_SignatureImage          VARCHAR(500),
    IN p_DigitalSignature        VARCHAR(500),
    IN p_RegistrationCertificate VARCHAR(500),
    
    -- Audit
    IN p_Status             VARCHAR(20),
    IN p_Remarks            TEXT,
    IN p_CreatedBy          VARCHAR(100),
    IN p_ModifiedBy         VARCHAR(100),
    
    -- Search
    IN p_Search             VARCHAR(255)
)
BEGIN
    DECLARE v_DoctorCode VARCHAR(20);
    DECLARE v_NextId INT;
    DECLARE v_DoctorId INT;

    -- ==================================================================
    -- GET (All)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT 
            m.DoctorId, m.DoctorCode, m.DoctorName, m.Gender, m.DateOfBirth,
            m.Mobile, m.AlternateMobile, m.Email, m.Address1, m.Address2, m.City, m.State, m.Country, m.PostalCode,
            m.Status, m.Remarks, m.CreatedDate, m.CreatedBy, m.ModifiedDate, m.ModifiedBy,
            p.Qualification, p.Specialization, p.HospitalName, p.BranchName, p.DepartmentName, p.Designation,
            p.Experience, p.Languages, p.JoiningDate,
            c.ConsultationFee, c.FollowUpFee, c.EmergencyFee, c.TeleConsultationFee, c.OpDuration, c.MaxPatients, c.AllowOnlineBooking,
            s.AvailableDays, s.FromTime, s.ToTime, s.BreakFrom, s.BreakTo, s.SlotDuration, s.AvailableEmergency, s.AvailableTele,
            d.DoctorPhoto, d.SignatureImage, d.DigitalSignature, d.RegistrationCertificate
        FROM Master_Doctor_Header m
        LEFT JOIN Master_DoctorProfessional_Detail p ON m.DoctorId = p.DoctorId
        LEFT JOIN Master_DoctorConsultation_Detail c ON m.DoctorId = c.DoctorId
        LEFT JOIN Master_DoctorSchedule_Detail s ON m.DoctorId = s.DoctorId
        LEFT JOIN Master_DoctorDocument_Detail d ON m.DoctorId = d.DoctorId
        WHERE m.IsDeleted = 0
          AND (
              p_Search IS NULL OR p_Search = '' 
              OR m.DoctorCode LIKE CONCAT('%', p_Search, '%')
              OR m.DoctorName LIKE CONCAT('%', p_Search, '%')
              OR m.Mobile LIKE CONCAT('%', p_Search, '%')
              OR p.Specialization LIKE CONCAT('%', p_Search, '%')
              OR p.DepartmentName LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY m.DoctorId DESC;

    -- ==================================================================
    -- GETBYID (Single)
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT 
            m.DoctorId, m.DoctorCode, m.DoctorName, m.Gender, m.DateOfBirth,
            m.Mobile, m.AlternateMobile, m.Email, m.Address1, m.Address2, m.City, m.State, m.Country, m.PostalCode,
            m.Status, m.Remarks, m.CreatedDate, m.CreatedBy, m.ModifiedDate, m.ModifiedBy,
            p.Qualification, p.Specialization, p.HospitalName, p.BranchName, p.DepartmentName, p.Designation,
            p.Experience, p.Languages, p.JoiningDate,
            c.ConsultationFee, c.FollowUpFee, c.EmergencyFee, c.TeleConsultationFee, c.OpDuration, c.MaxPatients, c.AllowOnlineBooking,
            s.AvailableDays, s.FromTime, s.ToTime, s.BreakFrom, s.BreakTo, s.SlotDuration, s.AvailableEmergency, s.AvailableTele,
            d.DoctorPhoto, d.SignatureImage, d.DigitalSignature, d.RegistrationCertificate
        FROM Master_Doctor_Header m
        LEFT JOIN Master_DoctorProfessional_Detail p ON m.DoctorId = p.DoctorId
        LEFT JOIN Master_DoctorConsultation_Detail c ON m.DoctorId = c.DoctorId
        LEFT JOIN Master_DoctorSchedule_Detail s ON m.DoctorId = s.DoctorId
        LEFT JOIN Master_DoctorDocument_Detail d ON m.DoctorId = d.DoctorId
        WHERE m.DoctorId = p_DoctorId
          AND m.IsDeleted = 0;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        -- Generate Code DOC-001
        SELECT COALESCE(MAX(DoctorId), 0) + 1 INTO v_NextId FROM Master_Doctor_Header;
        SET v_DoctorCode = CONCAT('DOC-', LPAD(v_NextId, 3, '0'));

        START TRANSACTION;

        -- 1. Insert Header
        INSERT INTO Master_Doctor_Header (
            DoctorCode, DoctorName, Gender, DateOfBirth, Mobile, AlternateMobile, Email,
            Address1, Address2, City, State, Country, PostalCode, Status, Remarks, CreatedDate, CreatedBy, IsDeleted
        ) VALUES (
            v_DoctorCode, p_DoctorName, p_Gender, p_DateOfBirth, p_Mobile, p_AlternateMobile, p_Email,
            p_Address1, p_Address2, p_City, p_State, p_Country, p_PostalCode, p_Status, p_Remarks, CURRENT_TIMESTAMP, p_CreatedBy, 0
        );
        
        SET v_DoctorId = LAST_INSERT_ID();

        -- 2. Insert Professional
        INSERT INTO Master_DoctorProfessional_Detail (
            DoctorId, Qualification, Specialization, HospitalName, BranchName, DepartmentName, Designation,
            Experience, Languages, JoiningDate
        ) VALUES (
            v_DoctorId, p_Qualification, p_Specialization, p_HospitalName, p_BranchName, p_DepartmentName, p_Designation,
            p_Experience, p_Languages, p_JoiningDate
        );

        -- 3. Insert Consultation
        INSERT INTO Master_DoctorConsultation_Detail (
            DoctorId, ConsultationFee, FollowUpFee, EmergencyFee, TeleConsultationFee, OpDuration, MaxPatients, AllowOnlineBooking
        ) VALUES (
            v_DoctorId, p_ConsultationFee, p_FollowUpFee, p_EmergencyFee, p_TeleConsultationFee, p_OpDuration, p_MaxPatients, p_AllowOnlineBooking
        );

        -- 4. Insert Schedule
        INSERT INTO Master_DoctorSchedule_Detail (
            DoctorId, AvailableDays, FromTime, ToTime, BreakFrom, BreakTo, SlotDuration, AvailableEmergency, AvailableTele
        ) VALUES (
            v_DoctorId, p_AvailableDays, p_FromTime, p_ToTime, p_BreakFrom, p_BreakTo, p_SlotDuration, p_AvailableEmergency, p_AvailableTele
        );

        -- 5. Insert Documents
        INSERT INTO Master_DoctorDocument_Detail (
            DoctorId, DoctorPhoto, SignatureImage, DigitalSignature, RegistrationCertificate
        ) VALUES (
            v_DoctorId, p_DoctorPhoto, p_SignatureImage, p_DigitalSignature, p_RegistrationCertificate
        );

        COMMIT;

        SELECT v_DoctorId AS DoctorId, v_DoctorCode AS DoctorCode;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        START TRANSACTION;

        -- 1. Update Header
        UPDATE Master_Doctor_Header
        SET
            DoctorName         = p_DoctorName,
            Gender             = p_Gender,
            DateOfBirth        = p_DateOfBirth,
            Mobile             = p_Mobile,
            AlternateMobile    = p_AlternateMobile,
            Email              = p_Email,
            Address1           = p_Address1,
            Address2           = p_Address2,
            City               = p_City,
            State              = p_State,
            Country            = p_Country,
            PostalCode         = p_PostalCode,
            Status             = p_Status,
            Remarks            = p_Remarks,
            ModifiedDate       = CURRENT_TIMESTAMP,
            ModifiedBy         = p_ModifiedBy
        WHERE DoctorId = p_DoctorId AND IsDeleted = 0;

        -- 2. Update Professional
        UPDATE Master_DoctorProfessional_Detail
        SET
            Qualification      = p_Qualification,
            Specialization     = p_Specialization,
            HospitalName       = p_HospitalName,
            BranchName         = p_BranchName,
            DepartmentName     = p_DepartmentName,
            Designation        = p_Designation,
            Experience         = p_Experience,
            Languages          = p_Languages,
            JoiningDate        = p_JoiningDate
        WHERE DoctorId = p_DoctorId;

        -- 3. Update Consultation
        UPDATE Master_DoctorConsultation_Detail
        SET
            ConsultationFee     = p_ConsultationFee,
            FollowUpFee         = p_FollowUpFee,
            EmergencyFee        = p_EmergencyFee,
            TeleConsultationFee = p_TeleConsultationFee,
            OpDuration          = p_OpDuration,
            MaxPatients         = p_MaxPatients,
            AllowOnlineBooking  = p_AllowOnlineBooking
        WHERE DoctorId = p_DoctorId;

        -- 4. Update Schedule
        UPDATE Master_DoctorSchedule_Detail
        SET
            AvailableDays       = p_AvailableDays,
            FromTime            = p_FromTime,
            ToTime              = p_ToTime,
            BreakFrom           = p_BreakFrom,
            BreakTo             = p_BreakTo,
            SlotDuration        = p_SlotDuration,
            AvailableEmergency  = p_AvailableEmergency,
            AvailableTele       = p_AvailableTele
        WHERE DoctorId = p_DoctorId;

        -- 5. Update Documents
        INSERT INTO Master_DoctorDocument_Detail (
            DoctorId, DoctorPhoto, SignatureImage, DigitalSignature, RegistrationCertificate
        ) VALUES (
            p_DoctorId, p_DoctorPhoto, p_SignatureImage, p_DigitalSignature, p_RegistrationCertificate
        )
        ON DUPLICATE KEY UPDATE 
            DoctorPhoto = VALUES(DoctorPhoto),
            SignatureImage = VALUES(SignatureImage),
            DigitalSignature = VALUES(DigitalSignature),
            RegistrationCertificate = VALUES(RegistrationCertificate);

        COMMIT;

        SELECT ROW_COUNT() AS AffectedRows;

    -- ==================================================================
    -- DELETE
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Doctor_Header
        SET
            IsDeleted    = 1,
            Status       = 'Inactive',
            ModifiedDate = CURRENT_TIMESTAMP
        WHERE DoctorId = p_DoctorId;
        
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
