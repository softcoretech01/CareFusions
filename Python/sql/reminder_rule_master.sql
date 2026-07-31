-- ============================================================
-- Reminder Rule Master - SQL Script
-- Database : admin
-- Table    : Master_ReminderRule
-- SP       : SpMasterReminderRule
-- Screen   : /admin/notification-masters/reminder-rules
--
-- NOTE: the code prefix "RR-" is 3 chars, so the numeric part starts at
--       position 4 (SUBSTRING(RuleCode, 4)) — unlike the 4-char prefixes elsewhere.
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_ReminderRule
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_ReminderRule (
    ReminderRuleId      INT           NOT NULL AUTO_INCREMENT,
    RuleCode            VARCHAR(20)   NOT NULL,          -- Auto-generated: RR-001
    RuleName            VARCHAR(150)  NOT NULL,
    Module              VARCHAR(100)  NOT NULL,
    Event               VARCHAR(100)  NOT NULL,
    TriggerBefore       VARCHAR(100)  NOT NULL,
    NotificationChannel VARCHAR(20)   NOT NULL DEFAULT 'SMS',
    RepeatReminder      TINYINT(1)    NOT NULL DEFAULT 0,
    RepeatFrequency     VARCHAR(100)  NULL,
    MaxRetryCount       INT           NOT NULL DEFAULT 1,
    RecipientPatient    TINYINT(1)    NOT NULL DEFAULT 1,
    RecipientDoctor     TINYINT(1)    NOT NULL DEFAULT 0,
    RecipientStaff      TINYINT(1)    NOT NULL DEFAULT 0,
    RecipientAttender   TINYINT(1)    NOT NULL DEFAULT 0,
    Status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks             VARCHAR(500)  NULL,

    -- Audit
    CreatedBy           VARCHAR(100)  NULL,
    CreatedDate         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100)  NULL,
    UpdatedDate         DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_ReminderRule PRIMARY KEY (ReminderRuleId),
    CONSTRAINT UQ_ReminderRule_Code   UNIQUE (RuleCode),
    -- NOTE: RuleName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_ReminderRule_Name     (RuleName),
    KEY IDX_ReminderRule_Module   (Module),
    KEY IDX_ReminderRule_Channel  (NotificationChannel),
    KEY IDX_ReminderRule_Status   (Status),
    KEY IDX_ReminderRule_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterReminderRule
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   RuleName -> 'DUPLICATE_RULE_NAME'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterReminderRule;

DELIMITER $$

CREATE PROCEDURE SpMasterReminderRule(
    IN  p_Opt                 VARCHAR(20),
    IN  p_ReminderRuleId      INT,
    IN  p_RuleName            VARCHAR(150),
    IN  p_Module              VARCHAR(100),
    IN  p_Event               VARCHAR(100),
    IN  p_TriggerBefore       VARCHAR(100),
    IN  p_NotificationChannel VARCHAR(20),
    IN  p_RepeatReminder      TINYINT,
    IN  p_RepeatFrequency     VARCHAR(100),
    IN  p_MaxRetryCount       INT,
    IN  p_RecipientPatient    TINYINT,
    IN  p_RecipientDoctor     TINYINT,
    IN  p_RecipientStaff      TINYINT,
    IN  p_RecipientAttender   TINYINT,
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             VARCHAR(500),
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_ModuleFilter        VARCHAR(100),
    IN  p_ChannelFilter       VARCHAR(20),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            ReminderRuleId, RuleCode, RuleName, Module, Event, TriggerBefore,
            NotificationChannel, RepeatReminder, RepeatFrequency, MaxRetryCount,
            RecipientPatient, RecipientDoctor, RecipientStaff, RecipientAttender,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_ReminderRule
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR RuleCode LIKE CONCAT('%', p_Search, '%')
            OR RuleName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_ModuleFilter  IS NULL OR p_ModuleFilter  = '' OR Module = p_ModuleFilter)
          AND (p_ChannelFilter IS NULL OR p_ChannelFilter = '' OR NotificationChannel = p_ChannelFilter)
          AND (p_StatusFilter  IS NULL OR p_StatusFilter  = '' OR Status = p_StatusFilter)
        ORDER BY ReminderRuleId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ReminderRuleId, RuleCode, RuleName, Module, Event, TriggerBefore,
            NotificationChannel, RepeatReminder, RepeatFrequency, MaxRetryCount,
            RecipientPatient, RecipientDoctor, RecipientStaff, RecipientAttender,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_ReminderRule
        WHERE ReminderRuleId = p_ReminderRuleId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('RR-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(RuleCode, 4) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS RuleCode
        FROM Master_ReminderRule;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_ReminderRule WHERE RuleName = p_RuleName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_RULE_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(RuleCode, 4) AS UNSIGNED)), 0) + 1 INTO v_NextNum FROM Master_ReminderRule;
            SET v_Code = CONCAT('RR-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_ReminderRule (
                RuleCode, RuleName, Module, Event, TriggerBefore, NotificationChannel,
                RepeatReminder, RepeatFrequency, MaxRetryCount,
                RecipientPatient, RecipientDoctor, RecipientStaff, RecipientAttender,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_RuleName, p_Module, p_Event, p_TriggerBefore, p_NotificationChannel,
                p_RepeatReminder, p_RepeatFrequency, p_MaxRetryCount,
                p_RecipientPatient, p_RecipientDoctor, p_RecipientStaff, p_RecipientAttender,
                p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS ReminderRuleId, v_Code AS RuleCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_ReminderRule WHERE RuleName = p_RuleName AND IsDeleted = 0 AND ReminderRuleId <> p_ReminderRuleId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_RULE_NAME';
        END IF;

        UPDATE Master_ReminderRule
        SET
            RuleName            = p_RuleName,
            Module              = p_Module,
            Event               = p_Event,
            TriggerBefore       = p_TriggerBefore,
            NotificationChannel = p_NotificationChannel,
            RepeatReminder      = p_RepeatReminder,
            RepeatFrequency     = p_RepeatFrequency,
            MaxRetryCount       = p_MaxRetryCount,
            RecipientPatient    = p_RecipientPatient,
            RecipientDoctor     = p_RecipientDoctor,
            RecipientStaff      = p_RecipientStaff,
            RecipientAttender   = p_RecipientAttender,
            Status              = p_Status,
            Remarks             = p_Remarks,
            UpdatedBy           = p_UpdatedBy,
            UpdatedDate         = CURRENT_TIMESTAMP
        WHERE ReminderRuleId = p_ReminderRuleId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_ReminderRule
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ReminderRuleId = p_ReminderRuleId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_ReminderRule
        SET
            IsDeleted   = 1,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ReminderRuleId = p_ReminderRuleId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
