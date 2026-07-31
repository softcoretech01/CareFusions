-- ============================================================
-- Branch Master - SQL Script
-- Database : admin
-- Table    : Master_Branch
-- SP       : SpMasterBranch
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Branch
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Branch (
    BranchId           INT              NOT NULL AUTO_INCREMENT,
    BranchCode         VARCHAR(50)      NOT NULL,
    BranchName         VARCHAR(255)     NOT NULL,
    HospitalId         INT              NOT NULL,
    BranchType         VARCHAR(100) NOT NULL DEFAULT 'Main Hospital',
    Address1           VARCHAR(500)     NOT NULL,
    Address2           VARCHAR(500)     NULL,
    Country            VARCHAR(100)     NOT NULL,
    State              VARCHAR(100)     NOT NULL,
    City               VARCHAR(100)     NOT NULL,
    PostalCode         VARCHAR(20)      NOT NULL,
    ContactNumber      VARCHAR(20)      NOT NULL,
    Email              VARCHAR(255)     NULL,
    BranchManager      VARCHAR(255)     NULL,
    WorkingHours       VARCHAR(100)     NOT NULL,
    EmergencyAvailable ENUM('Yes','No') NOT NULL DEFAULT 'Yes',
    NumberOfFloors     SMALLINT         NULL,
    NumberOfBeds       INT              NULL,
    Status             ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks            TEXT             NULL,
    CreatedDate        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedDate       DATETIME         NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted          TINYINT(1)       NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Branch         PRIMARY KEY (BranchId),
    CONSTRAINT UQ_Master_Branch_Code    UNIQUE (BranchCode),
    CONSTRAINT UQ_Branch_Name_Hospital  UNIQUE (BranchName, HospitalId),
    CONSTRAINT FK_Branch_Hospital       FOREIGN KEY (HospitalId)
        REFERENCES Master_Hospital (HospitalId)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS IDX_Master_Branch_HospitalId ON Master_Branch (HospitalId);
CREATE INDEX IF NOT EXISTS IDX_Master_Branch_City       ON Master_Branch (City);
CREATE INDEX IF NOT EXISTS IDX_Master_Branch_Status     ON Master_Branch (Status);
CREATE INDEX IF NOT EXISTS IDX_Master_Branch_IsDeleted  ON Master_Branch (IsDeleted);


-- ============================================================
-- STORED PROCEDURE: SpMasterBranch
-- p_Opt values:
--   'GET'      -> Fetch all active records (JOIN Hospital, optional search)
--   'GETBYID'  -> Fetch single record by BranchId (JOIN Hospital)
--   'INSERT'   -> Auto-generate BranchCode (BR-001 format), insert new record
--   'UPDATE'   -> Update existing record (BranchCode is immutable)
--   'DELETE'   -> Soft delete (IsDeleted=1, Status='Inactive')
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterBranch;

DELIMITER $$

CREATE PROCEDURE SpMasterBranch(
    IN  p_Opt               VARCHAR(20),
    IN  p_BranchId          INT,
    IN  p_BranchName        VARCHAR(255),
    IN  p_HospitalId        INT,
    IN  p_BranchType        VARCHAR(100),
    IN  p_Address1          VARCHAR(500),
    IN  p_Address2          VARCHAR(500),
    IN  p_Country           VARCHAR(100),
    IN  p_State             VARCHAR(100),
    IN  p_City              VARCHAR(100),
    IN  p_PostalCode        VARCHAR(20),
    IN  p_ContactNumber     VARCHAR(20),
    IN  p_Email             VARCHAR(255),
    IN  p_BranchManager     VARCHAR(255),
    IN  p_WorkingHours      VARCHAR(100),
    IN  p_EmergencyAvailable VARCHAR(10),
    IN  p_NumberOfFloors    SMALLINT,
    IN  p_NumberOfBeds      INT,
    IN  p_Status            VARCHAR(20),
    IN  p_Remarks           TEXT,
    IN  p_Search            VARCHAR(255)
)
BEGIN

    -- --------------------------------------------------------
    -- GET: Fetch all non-deleted branches with optional search
    --      JOINs Master_Hospital to return HospitalName
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            b.BranchId,
            b.BranchCode,
            b.BranchName,
            b.HospitalId,
            h.HospitalName,
            b.BranchType,
            b.Address1,
            b.Address2,
            b.Country,
            b.State,
            b.City,
            b.PostalCode,
            b.ContactNumber,
            b.Email,
            b.BranchManager,
            b.WorkingHours,
            b.EmergencyAvailable,
            b.NumberOfFloors,
            b.NumberOfBeds,
            b.Status,
            b.Remarks,
            b.CreatedDate,
            b.ModifiedDate
        FROM Master_Branch b
        INNER JOIN Master_Hospital h ON b.HospitalId = h.HospitalId
        WHERE b.IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR b.BranchCode  LIKE CONCAT('%', p_Search, '%')
            OR b.BranchName  LIKE CONCAT('%', p_Search, '%')
            OR h.HospitalName LIKE CONCAT('%', p_Search, '%')
            OR b.City        LIKE CONCAT('%', p_Search, '%')
            OR b.Status      LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY b.BranchId DESC;

    -- --------------------------------------------------------
    -- GETBYID: Fetch single branch by BranchId
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            b.BranchId,
            b.BranchCode,
            b.BranchName,
            b.HospitalId,
            h.HospitalName,
            b.BranchType,
            b.Address1,
            b.Address2,
            b.Country,
            b.State,
            b.City,
            b.PostalCode,
            b.ContactNumber,
            b.Email,
            b.BranchManager,
            b.WorkingHours,
            b.EmergencyAvailable,
            b.NumberOfFloors,
            b.NumberOfBeds,
            b.Status,
            b.Remarks,
            b.CreatedDate,
            b.ModifiedDate
        FROM Master_Branch b
        INNER JOIN Master_Hospital h ON b.HospitalId = h.HospitalId
        WHERE b.BranchId = p_BranchId
          AND b.IsDeleted = 0;

    -- --------------------------------------------------------
    -- INSERT: Auto-generate BranchCode (BR-001 format) and insert
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum   INT DEFAULT 1;
            DECLARE v_BranchCode VARCHAR(50);

            -- Determine next sequence number from existing codes
            SELECT COALESCE(
                MAX(CAST(SUBSTRING(BranchCode, 4) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_Branch;

            -- Format as BR-001, BR-002 ... BR-099, BR-100
            SET v_BranchCode = CONCAT('BR-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Branch (
                BranchCode, BranchName, HospitalId, BranchType,
                Address1, Address2, Country, State, City, PostalCode,
                ContactNumber, Email, BranchManager, WorkingHours,
                EmergencyAvailable, NumberOfFloors, NumberOfBeds,
                Status, Remarks
            ) VALUES (
                v_BranchCode, p_BranchName, p_HospitalId, p_BranchType,
                p_Address1, p_Address2, p_Country, p_State, p_City, p_PostalCode,
                p_ContactNumber, p_Email, p_BranchManager, p_WorkingHours,
                p_EmergencyAvailable, p_NumberOfFloors, p_NumberOfBeds,
                p_Status, p_Remarks
            );

            SELECT LAST_INSERT_ID() AS BranchId, v_BranchCode AS BranchCode;
        END;

    -- --------------------------------------------------------
    -- UPDATE: Update existing branch (BranchCode is immutable)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Branch
        SET
            BranchName         = p_BranchName,
            HospitalId         = p_HospitalId,
            BranchType         = p_BranchType,
            Address1           = p_Address1,
            Address2           = p_Address2,
            Country            = p_Country,
            State              = p_State,
            City               = p_City,
            PostalCode         = p_PostalCode,
            ContactNumber      = p_ContactNumber,
            Email              = p_Email,
            BranchManager      = p_BranchManager,
            WorkingHours       = p_WorkingHours,
            EmergencyAvailable = p_EmergencyAvailable,
            NumberOfFloors     = p_NumberOfFloors,
            NumberOfBeds       = p_NumberOfBeds,
            Status             = p_Status,
            Remarks            = p_Remarks,
            ModifiedDate       = CURRENT_TIMESTAMP
        WHERE BranchId = p_BranchId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE: Soft delete
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Branch
        SET
            IsDeleted    = 1,
            Status       = 'Inactive',
            ModifiedDate = CURRENT_TIMESTAMP
        WHERE BranchId = p_BranchId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
