-- ============================================================
-- Audit Log Master - SQL Script
-- Database : admin
-- Table    : Audit_Log
-- SP       : SpAuditLog
-- Screen   : /admin/audit-logs
--
-- DESIGN: an audit trail is APPEND-ONLY and IMMUTABLE. The SP deliberately
-- exposes only GET / GETBYID / INSERT — there is NO UPDATE, TOGGLE or DELETE.
-- AuditId (ADT-YYYYMMDD-NNN, resets daily) and the timestamp are server-generated.
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Audit_Log
-- ============================================================
CREATE TABLE IF NOT EXISTS Audit_Log (
    AuditLogId        INT           NOT NULL AUTO_INCREMENT,
    AuditId           VARCHAR(30)   NOT NULL,          -- Auto: ADT-YYYYMMDD-NNN
    AuditTimestamp    DATETIME      NOT NULL,          -- Server-set moment of the action
    UserName          VARCHAR(100)  NOT NULL,
    EmployeeName      VARCHAR(150)  NULL,
    Role              VARCHAR(100)  NULL,
    Department        VARCHAR(100)  NULL,
    Module            VARCHAR(100)  NOT NULL,
    ScreenName        VARCHAR(150)  NULL,
    Action            VARCHAR(50)   NOT NULL,
    RecordId          VARCHAR(50)   NULL,
    TransactionNumber VARCHAR(50)   NULL,
    IpAddress         VARCHAR(45)   NULL,              -- IPv4 / IPv6
    Device            VARCHAR(50)   NULL,
    Browser           VARCHAR(100)  NULL,
    OperatingSystem   VARCHAR(100)  NULL,
    SessionId         VARCHAR(100)  NULL,
    OldValues         TEXT          NULL,
    NewValues         TEXT          NULL,
    ChangeSummary     VARCHAR(1000) NULL,
    Status            ENUM('Success','Failed') NOT NULL DEFAULT 'Success',
    FailureReason     VARCHAR(500)  NULL,
    CreatedDate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT PK_Audit_Log PRIMARY KEY (AuditLogId),
    CONSTRAINT UQ_Audit_Id  UNIQUE (AuditId),

    KEY IDX_Audit_Timestamp (AuditTimestamp),
    KEY IDX_Audit_UserName  (UserName),
    KEY IDX_Audit_Module    (Module),
    KEY IDX_Audit_Action    (Action),
    KEY IDX_Audit_Status    (Status),
    KEY IDX_Audit_Role      (Role)
);


-- ============================================================
-- STORED PROCEDURE: SpAuditLog
-- p_Opt: GET | GETBYID | INSERT     (no UPDATE / DELETE — append-only trail)
-- ============================================================
DROP PROCEDURE IF EXISTS SpAuditLog;

DELIMITER $$

CREATE PROCEDURE SpAuditLog(
    IN  p_Opt               VARCHAR(20),
    IN  p_AuditLogId        INT,
    IN  p_UserName          VARCHAR(100),
    IN  p_EmployeeName      VARCHAR(150),
    IN  p_Role              VARCHAR(100),
    IN  p_Department        VARCHAR(100),
    IN  p_Module            VARCHAR(100),
    IN  p_ScreenName        VARCHAR(150),
    IN  p_Action            VARCHAR(50),
    IN  p_RecordId          VARCHAR(50),
    IN  p_TransactionNumber VARCHAR(50),
    IN  p_IpAddress         VARCHAR(45),
    IN  p_Device            VARCHAR(50),
    IN  p_Browser           VARCHAR(100),
    IN  p_OperatingSystem   VARCHAR(100),
    IN  p_SessionId         VARCHAR(100),
    IN  p_OldValues         TEXT,
    IN  p_NewValues         TEXT,
    IN  p_ChangeSummary     VARCHAR(1000),
    IN  p_Status            VARCHAR(20),
    IN  p_FailureReason     VARCHAR(500),
    IN  p_Search            VARCHAR(255),
    IN  p_ModuleFilter      VARCHAR(100),
    IN  p_ActionFilter      VARCHAR(50),
    IN  p_StatusFilter      VARCHAR(20),
    IN  p_RoleFilter        VARCHAR(100),
    IN  p_FromDate          VARCHAR(20),
    IN  p_ToDate            VARCHAR(20),
    IN  p_Limit             INT,
    IN  p_Offset            INT
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            AuditLogId, AuditId, AuditTimestamp, UserName, EmployeeName, Role, Department,
            Module, ScreenName, Action, RecordId, TransactionNumber, IpAddress, Device,
            Browser, OperatingSystem, SessionId, OldValues, NewValues, ChangeSummary,
            Status, FailureReason
        FROM Audit_Log
        WHERE (
            p_Search IS NULL OR p_Search = ''
            OR AuditId  LIKE CONCAT('%', p_Search, '%')
            OR UserName LIKE CONCAT('%', p_Search, '%')
            OR RecordId LIKE CONCAT('%', p_Search, '%')
            OR IpAddress LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_ModuleFilter IS NULL OR p_ModuleFilter = '' OR Module = p_ModuleFilter)
          AND (p_ActionFilter IS NULL OR p_ActionFilter = '' OR Action = p_ActionFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
          AND (p_RoleFilter   IS NULL OR p_RoleFilter   = '' OR Role   = p_RoleFilter)
          AND (p_FromDate IS NULL OR p_FromDate = '' OR AuditTimestamp >= CONCAT(p_FromDate, ' 00:00:00'))
          AND (p_ToDate   IS NULL OR p_ToDate   = '' OR AuditTimestamp <= CONCAT(p_ToDate, ' 23:59:59'))
        ORDER BY AuditTimestamp DESC, AuditLogId DESC
        LIMIT p_Limit OFFSET p_Offset;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            AuditLogId, AuditId, AuditTimestamp, UserName, EmployeeName, Role, Department,
            Module, ScreenName, Action, RecordId, TransactionNumber, IpAddress, Device,
            Browser, OperatingSystem, SessionId, OldValues, NewValues, ChangeSummary,
            Status, FailureReason
        FROM Audit_Log
        WHERE AuditLogId = p_AuditLogId;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_DateStr CHAR(8);
            DECLARE v_Seq     INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(30);

            SET v_DateStr = DATE_FORMAT(NOW(), '%Y%m%d');
            SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(AuditId, '-', -1) AS UNSIGNED)), 0) + 1
              INTO v_Seq
              FROM Audit_Log
             WHERE AuditId LIKE CONCAT('ADT-', v_DateStr, '-%') FOR UPDATE;
            SET v_Code = CONCAT('ADT-', v_DateStr, '-', LPAD(v_Seq, 3, '0'));

            INSERT INTO Audit_Log (
                AuditId, AuditTimestamp, UserName, EmployeeName, Role, Department,
                Module, ScreenName, Action, RecordId, TransactionNumber, IpAddress, Device,
                Browser, OperatingSystem, SessionId, OldValues, NewValues, ChangeSummary,
                Status, FailureReason
            ) VALUES (
                v_Code, NOW(), p_UserName, p_EmployeeName, p_Role, p_Department,
                p_Module, p_ScreenName, p_Action, p_RecordId, p_TransactionNumber, p_IpAddress, p_Device,
                p_Browser, p_OperatingSystem, p_SessionId, p_OldValues, p_NewValues, p_ChangeSummary,
                p_Status, p_FailureReason
            );

            SELECT LAST_INSERT_ID() AS AuditLogId, v_Code AS AuditId;
        END;

    END IF;

END$$

DELIMITER ;
