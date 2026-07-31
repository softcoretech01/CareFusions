-- ============================================================
-- SMS Template Master - SQL Script
-- Database : admin
-- Table    : Master_SmsTemplate
-- SP       : SpMasterSmsTemplate
-- Screen   : /admin/notification-masters/sms
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_SmsTemplate
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_SmsTemplate (
    SmsTemplateId  INT           NOT NULL AUTO_INCREMENT,
    TemplateCode   VARCHAR(20)   NOT NULL,          -- Auto-generated: SMS-001
    TemplateName   VARCHAR(150)  NOT NULL,
    Module         VARCHAR(100)  NOT NULL,
    Event          VARCHAR(100)  NOT NULL,
    Description    VARCHAR(500)  NULL,
    SmsSubject     VARCHAR(200)  NULL,
    SmsContent     VARCHAR(1000) NOT NULL,
    Status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks        VARCHAR(500)  NULL,

    -- Audit
    CreatedBy      VARCHAR(100)  NULL,
    CreatedDate    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy      VARCHAR(100)  NULL,
    UpdatedDate    DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted      TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_SmsTemplate PRIMARY KEY (SmsTemplateId),
    CONSTRAINT UQ_SmsTemplate_Code   UNIQUE (TemplateCode),
    -- NOTE: TemplateName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_SmsTemplate_Name     (TemplateName),
    KEY IDX_SmsTemplate_Module   (Module),
    KEY IDX_SmsTemplate_Event    (Event),
    KEY IDX_SmsTemplate_Status   (Status),
    KEY IDX_SmsTemplate_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterSmsTemplate
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   TemplateName -> 'DUPLICATE_TEMPLATE_NAME'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterSmsTemplate;

DELIMITER $$

CREATE PROCEDURE SpMasterSmsTemplate(
    IN  p_Opt          VARCHAR(20),
    IN  p_SmsTemplateId INT,
    IN  p_TemplateName VARCHAR(150),
    IN  p_Module       VARCHAR(100),
    IN  p_Event        VARCHAR(100),
    IN  p_Description  VARCHAR(500),
    IN  p_SmsSubject   VARCHAR(200),
    IN  p_SmsContent   VARCHAR(1000),
    IN  p_Status       VARCHAR(20),
    IN  p_Remarks      VARCHAR(500),
    IN  p_CreatedBy    VARCHAR(100),
    IN  p_UpdatedBy    VARCHAR(100),
    IN  p_Search       VARCHAR(255),
    IN  p_ModuleFilter VARCHAR(100),
    IN  p_EventFilter  VARCHAR(100),
    IN  p_StatusFilter VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            SmsTemplateId, TemplateCode, TemplateName, Module, Event, Description,
            SmsSubject, SmsContent, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_SmsTemplate
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR TemplateCode LIKE CONCAT('%', p_Search, '%')
            OR TemplateName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_ModuleFilter IS NULL OR p_ModuleFilter = '' OR Module = p_ModuleFilter)
          AND (p_EventFilter  IS NULL OR p_EventFilter  = '' OR Event  = p_EventFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY SmsTemplateId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            SmsTemplateId, TemplateCode, TemplateName, Module, Event, Description,
            SmsSubject, SmsContent, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_SmsTemplate
        WHERE SmsTemplateId = p_SmsTemplateId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('SMS-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(TemplateCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS TemplateCode
        FROM Master_SmsTemplate;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_SmsTemplate WHERE TemplateName = p_TemplateName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TEMPLATE_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(TemplateCode, 5) AS UNSIGNED)), 0) + 1 INTO v_NextNum FROM Master_SmsTemplate;
            SET v_Code = CONCAT('SMS-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_SmsTemplate (
                TemplateCode, TemplateName, Module, Event, Description,
                SmsSubject, SmsContent, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_TemplateName, p_Module, p_Event, p_Description,
                p_SmsSubject, p_SmsContent, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS SmsTemplateId, v_Code AS TemplateCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_SmsTemplate WHERE TemplateName = p_TemplateName AND IsDeleted = 0 AND SmsTemplateId <> p_SmsTemplateId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TEMPLATE_NAME';
        END IF;

        UPDATE Master_SmsTemplate
        SET
            TemplateName = p_TemplateName,
            Module       = p_Module,
            Event        = p_Event,
            Description  = p_Description,
            SmsSubject   = p_SmsSubject,
            SmsContent   = p_SmsContent,
            Status       = p_Status,
            Remarks      = p_Remarks,
            UpdatedBy    = p_UpdatedBy,
            UpdatedDate  = CURRENT_TIMESTAMP
        WHERE SmsTemplateId = p_SmsTemplateId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_SmsTemplate
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SmsTemplateId = p_SmsTemplateId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_SmsTemplate
        SET
            IsDeleted   = 1,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SmsTemplateId = p_SmsTemplateId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
