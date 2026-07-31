-- ==============================================================================
-- Laboratory Test Master Schema & Stored Procedure
-- ==============================================================================

-- 1. Master_LabTestCategory Table
CREATE TABLE IF NOT EXISTS Master_LabTestCategory (
    CategoryId INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE
);

INSERT IGNORE INTO Master_LabTestCategory (CategoryName) VALUES
('Hematology'), ('Biochemistry'), ('Microbiology'), 
('Immunology'), ('Clinical Pathology'), ('Serology');

-- 2. Master_SampleType Table
CREATE TABLE IF NOT EXISTS Master_SampleType (
    SampleTypeId INT AUTO_INCREMENT PRIMARY KEY,
    SampleTypeName VARCHAR(100) NOT NULL UNIQUE
);

INSERT IGNORE INTO Master_SampleType (SampleTypeName) VALUES
('Blood'), ('Urine'), ('Stool'), ('Saliva'), ('Sputum'), ('Tissue'), ('Swab');

-- 3. Master_Department Table (specifically for lab)
CREATE TABLE IF NOT EXISTS Master_Department (
    DepartmentId INT AUTO_INCREMENT PRIMARY KEY,
    DepartmentName VARCHAR(100) NOT NULL UNIQUE
);

INSERT IGNORE INTO Master_Department (DepartmentName) VALUES
('Pathology'), ('Microbiology'), ('Biochemistry');

-- 4. Master_LabTest Table
CREATE TABLE IF NOT EXISTS Master_LabTest (
    TestId INT AUTO_INCREMENT PRIMARY KEY,
    TestCode VARCHAR(50) NOT NULL UNIQUE,
    TestName VARCHAR(200) NOT NULL,
    TestCategory VARCHAR(100) NOT NULL,
    Department VARCHAR(100) NOT NULL,
    SampleType VARCHAR(100) NOT NULL,
    Description TEXT,
    NormalRange VARCHAR(100),
    Unit VARCHAR(50),
    TestMethod VARCHAR(200),
    TurnaroundTime VARCHAR(50) NOT NULL,
    TestPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Gst DECIMAL(5,2) DEFAULT 0.00,
    ReportTemplate VARCHAR(100),
    RequiresApproval TINYINT(1) DEFAULT 0,
    CriticalValueAlert TINYINT(1) DEFAULT 0,
    Status VARCHAR(20) DEFAULT 'Active',
    Remarks TEXT,
    CreatedBy VARCHAR(100),
    CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy VARCHAR(100),
    ModifiedDate DATETIME,
    IsDeleted TINYINT(1) DEFAULT 0
);

-- 5. Stored Procedure for CRUD
DELIMITER //

DROP PROCEDURE IF EXISTS SpMasterLabTest //

CREATE PROCEDURE SpMasterLabTest (
    IN p_Opt                VARCHAR(20),
    IN p_TestId             INT,

    IN p_TestCode           VARCHAR(50),
    IN p_TestName           VARCHAR(200),
    IN p_TestCategory       VARCHAR(100),
    IN p_Department         VARCHAR(100),
    IN p_SampleType         VARCHAR(100),
    IN p_Description        TEXT,
    IN p_NormalRange        VARCHAR(100),
    IN p_Unit               VARCHAR(50),
    IN p_TestMethod         VARCHAR(200),
    IN p_TurnaroundTime     VARCHAR(50),
    IN p_TestPrice          DECIMAL(10,2),
    IN p_Gst                DECIMAL(5,2),
    IN p_ReportTemplate     VARCHAR(100),
    IN p_RequiresApproval   TINYINT(1),
    IN p_CriticalValueAlert TINYINT(1),
    IN p_Status             VARCHAR(20),
    IN p_Remarks            TEXT,

    IN p_CreatedBy          VARCHAR(100),
    IN p_ModifiedBy         VARCHAR(100),

    IN p_Search             VARCHAR(255)
)
BEGIN
    IF p_Opt = 'GET' THEN
        SELECT 
            TestId, TestCode, TestName, TestCategory, Department, SampleType,
            Description, NormalRange, Unit, TestMethod, TurnaroundTime, TestPrice,
            Gst, ReportTemplate, RequiresApproval, CriticalValueAlert, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_LabTest 
        WHERE IsDeleted = 0 
        ORDER BY TestId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT 
            TestId, TestCode, TestName, TestCategory, Department, SampleType,
            Description, NormalRange, Unit, TestMethod, TurnaroundTime, TestPrice,
            Gst, ReportTemplate, RequiresApproval, CriticalValueAlert, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_LabTest 
        WHERE TestId = p_TestId AND IsDeleted = 0;

    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT 
            TestId, TestCode, TestName, TestCategory, Department, SampleType,
            Description, NormalRange, Unit, TestMethod, TurnaroundTime, TestPrice,
            Gst, ReportTemplate, RequiresApproval, CriticalValueAlert, Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_LabTest 
        WHERE IsDeleted = 0 
          AND (
            TestCode LIKE CONCAT('%', p_Search, '%') OR
            TestName LIKE CONCAT('%', p_Search, '%') OR
            TestCategory LIKE CONCAT('%', p_Search, '%') OR
            Department LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY TestId DESC;

    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO Master_LabTest (
            TestCode, TestName, TestCategory, Department, SampleType,
            Description, NormalRange, Unit, TestMethod, TurnaroundTime, TestPrice,
            Gst, ReportTemplate, RequiresApproval, CriticalValueAlert, Status, Remarks,
            CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            p_TestCode, p_TestName, p_TestCategory, p_Department, p_SampleType,
            p_Description, p_NormalRange, p_Unit, p_TestMethod, p_TurnaroundTime, p_TestPrice,
            p_Gst, p_ReportTemplate, p_RequiresApproval, p_CriticalValueAlert, p_Status, p_Remarks,
            p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS TestId;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_LabTest SET
            TestCode = p_TestCode,
            TestName = p_TestName,
            TestCategory = p_TestCategory,
            Department = p_Department,
            SampleType = p_SampleType,
            Description = p_Description,
            NormalRange = p_NormalRange,
            Unit = p_Unit,
            TestMethod = p_TestMethod,
            TurnaroundTime = p_TurnaroundTime,
            TestPrice = p_TestPrice,
            Gst = p_Gst,
            ReportTemplate = p_ReportTemplate,
            RequiresApproval = p_RequiresApproval,
            CriticalValueAlert = p_CriticalValueAlert,
            Status = p_Status,
            Remarks = p_Remarks,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy = p_ModifiedBy
        WHERE TestId = p_TestId;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_LabTest SET
            IsDeleted = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy = p_ModifiedBy
        WHERE TestId = p_TestId;

    END IF;
END //

DELIMITER ;
