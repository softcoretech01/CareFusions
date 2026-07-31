-- ============================================================
-- User Master - SQL Script  (login accounts + global role)
-- Database : admin
-- Table    : Master_User
-- SP       : SpMasterUser
-- Screen   : /admin/masters/users
--
-- SECURITY: PasswordHash stores a SALTED PBKDF2 hash (never plaintext) computed
-- by the API layer. It is NEVER returned by GET/GETBYID. On UPDATE, a NULL hash
-- means "keep the existing password".
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_User
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_User (
    UserId              INT           NOT NULL AUTO_INCREMENT,
    UserCode            VARCHAR(20)   NOT NULL,          -- Auto-generated: USR-001
    Employee            VARCHAR(150)  NOT NULL,
    Username            VARCHAR(100)  NOT NULL,
    PasswordHash        VARCHAR(255)  NOT NULL,
    Role                VARCHAR(100)  NOT NULL,          -- Global role (Master_Role)
    Department          VARCHAR(100)  NULL,
    Hospital            VARCHAR(150)  NULL,
    Branch              VARCHAR(150)  NULL,
    Email               VARCHAR(150)  NOT NULL,
    MobileNumber        VARCHAR(20)   NULL,
    ForcePasswordChange TINYINT(1)    NOT NULL DEFAULT 1,
    PasswordExpiry      INT           NOT NULL DEFAULT 90,   -- Days
    TwoFactorAuth       TINYINT(1)    NOT NULL DEFAULT 0,
    LoginAllowedFrom    VARCHAR(5)    NOT NULL DEFAULT '00:00',
    LoginAllowedTo      VARCHAR(5)    NOT NULL DEFAULT '23:59',
    Status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks             TEXT          NULL,

    -- Audit
    CreatedBy           VARCHAR(100)  NULL,
    CreatedDate         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100)  NULL,
    UpdatedDate         DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_User PRIMARY KEY (UserId),
    CONSTRAINT UQ_User_Code   UNIQUE (UserCode),
    -- NOTE: Username/Email uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_User_Username (Username),
    KEY IDX_User_Email    (Email),
    KEY IDX_User_Role     (Role),
    KEY IDX_User_Status   (Status),
    KEY IDX_User_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterUser
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   Username -> 'DUPLICATE_USERNAME'
--   Email    -> 'DUPLICATE_EMAIL'
-- Business rule: an employee may have only ONE active account
--                -> 'DUPLICATE_ACTIVE_EMPLOYEE'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterUser;

DELIMITER $$

CREATE PROCEDURE SpMasterUser(
    IN  p_Opt                 VARCHAR(20),
    IN  p_UserId              INT,
    IN  p_Employee            VARCHAR(150),
    IN  p_Username            VARCHAR(100),
    IN  p_PasswordHash        VARCHAR(255),
    IN  p_Role                VARCHAR(100),
    IN  p_Department          VARCHAR(100),
    IN  p_Hospital            VARCHAR(150),
    IN  p_Branch              VARCHAR(150),
    IN  p_Email               VARCHAR(150),
    IN  p_MobileNumber        VARCHAR(20),
    IN  p_ForcePasswordChange TINYINT,
    IN  p_PasswordExpiry      INT,
    IN  p_TwoFactorAuth       TINYINT,
    IN  p_LoginAllowedFrom    VARCHAR(5),
    IN  p_LoginAllowedTo      VARCHAR(5),
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             TEXT,
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_RoleFilter          VARCHAR(100),
    IN  p_DepartmentFilter    VARCHAR(100),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            UserId, UserCode, Employee, Username, Role, Department, Hospital, Branch,
            Email, MobileNumber, ForcePasswordChange, PasswordExpiry, TwoFactorAuth,
            LoginAllowedFrom, LoginAllowedTo, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_User
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR UserCode LIKE CONCAT('%', p_Search, '%')
            OR Employee LIKE CONCAT('%', p_Search, '%')
            OR Username LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_RoleFilter       IS NULL OR p_RoleFilter       = '' OR Role       = p_RoleFilter)
          AND (p_DepartmentFilter IS NULL OR p_DepartmentFilter = '' OR Department = p_DepartmentFilter)
          AND (p_StatusFilter     IS NULL OR p_StatusFilter     = '' OR Status     = p_StatusFilter)
        ORDER BY UserId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            UserId, UserCode, Employee, Username, Role, Department, Hospital, Branch,
            Email, MobileNumber, ForcePasswordChange, PasswordExpiry, TwoFactorAuth,
            LoginAllowedFrom, LoginAllowedTo, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_User
        WHERE UserId = p_UserId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('USR-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(UserCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS UserCode
        FROM Master_User;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_User WHERE Username = p_Username AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_USERNAME';
            END IF;
            IF EXISTS (SELECT 1 FROM Master_User WHERE Email = p_Email AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_EMAIL';
            END IF;
            IF p_Status = 'Active' AND EXISTS (
                SELECT 1 FROM Master_User WHERE Employee = p_Employee AND Status = 'Active' AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ACTIVE_EMPLOYEE';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(UserCode, 5) AS UNSIGNED)), 0) + 1 INTO v_NextNum FROM Master_User;
            SET v_Code = CONCAT('USR-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_User (
                UserCode, Employee, Username, PasswordHash, Role, Department, Hospital, Branch,
                Email, MobileNumber, ForcePasswordChange, PasswordExpiry, TwoFactorAuth,
                LoginAllowedFrom, LoginAllowedTo, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_Employee, p_Username, p_PasswordHash, p_Role, p_Department, p_Hospital, p_Branch,
                p_Email, p_MobileNumber, p_ForcePasswordChange, p_PasswordExpiry, p_TwoFactorAuth,
                p_LoginAllowedFrom, p_LoginAllowedTo, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS UserId, v_Code AS UserCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_User WHERE Username = p_Username AND IsDeleted = 0 AND UserId <> p_UserId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_USERNAME';
        END IF;
        IF EXISTS (SELECT 1 FROM Master_User WHERE Email = p_Email AND IsDeleted = 0 AND UserId <> p_UserId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_EMAIL';
        END IF;
        IF p_Status = 'Active' AND EXISTS (
            SELECT 1 FROM Master_User WHERE Employee = p_Employee AND Status = 'Active' AND IsDeleted = 0 AND UserId <> p_UserId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ACTIVE_EMPLOYEE';
        END IF;

        UPDATE Master_User
        SET
            Employee            = p_Employee,
            Username            = p_Username,
            PasswordHash        = COALESCE(p_PasswordHash, PasswordHash),
            Role                = p_Role,
            Department          = p_Department,
            Hospital            = p_Hospital,
            Branch              = p_Branch,
            Email               = p_Email,
            MobileNumber        = p_MobileNumber,
            ForcePasswordChange = p_ForcePasswordChange,
            PasswordExpiry      = p_PasswordExpiry,
            TwoFactorAuth       = p_TwoFactorAuth,
            LoginAllowedFrom    = p_LoginAllowedFrom,
            LoginAllowedTo      = p_LoginAllowedTo,
            Status              = p_Status,
            Remarks             = p_Remarks,
            UpdatedBy           = p_UpdatedBy,
            UpdatedDate         = CURRENT_TIMESTAMP
        WHERE UserId = p_UserId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_User
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE UserId = p_UserId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_User
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE UserId = p_UserId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
