-- ============================================================
-- Email Template Master - SQL Script
-- Database : admin
-- Table    : Master_EmailTemplate
-- SP       : SpMasterEmailTemplate
-- Screen   : /admin/notification-masters/email
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_EmailTemplate
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_EmailTemplate (
    EmailTemplateId   INT           NOT NULL AUTO_INCREMENT,
    TemplateCode      VARCHAR(20)   NOT NULL,          -- Auto-generated: EML-001
    TemplateName      VARCHAR(150)  NOT NULL,
    Module            VARCHAR(100)  NOT NULL,
    Event             VARCHAR(100)  NOT NULL,
    EmailSubject      VARCHAR(300)  NOT NULL,
    EmailBody         TEXT          NOT NULL,          -- HTML supported
    AttachmentAllowed TINYINT(1)    NOT NULL DEFAULT 0,
    AttachmentType    VARCHAR(100)  NULL,
    Status            ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks           VARCHAR(500)  NULL,

    -- Audit
    CreatedBy         VARCHAR(100)  NULL,
    CreatedDate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy         VARCHAR(100)  NULL,
    UpdatedDate       DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted         TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_EmailTemplate PRIMARY KEY (EmailTemplateId),
    CONSTRAINT UQ_EmailTemplate_Code   UNIQUE (TemplateCode),
    -- NOTE: TemplateName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_EmailTemplate_Name     (TemplateName),
    KEY IDX_EmailTemplate_Module   (Module),
    KEY IDX_EmailTemplate_Event    (Event),
    KEY IDX_EmailTemplate_Status   (Status),
    KEY IDX_EmailTemplate_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterEmailTemplate
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   TemplateName -> 'DUPLICATE_TEMPLATE_NAME'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterEmailTemplate;

DELIMITER $$

CREATE PROCEDURE SpMasterEmailTemplate(
    IN  p_Opt               VARCHAR(20),
    IN  p_EmailTemplateId   INT,
    IN  p_TemplateName      VARCHAR(150),
    IN  p_Module            VARCHAR(100),
    IN  p_Event             VARCHAR(100),
    IN  p_EmailSubject      VARCHAR(300),
    IN  p_EmailBody         TEXT,
    IN  p_AttachmentAllowed TINYINT,
    IN  p_AttachmentType    VARCHAR(100),
    IN  p_Status            VARCHAR(20),
    IN  p_Remarks           VARCHAR(500),
    IN  p_CreatedBy         VARCHAR(100),
    IN  p_UpdatedBy         VARCHAR(100),
    IN  p_Search            VARCHAR(255),
    IN  p_ModuleFilter      VARCHAR(100),
    IN  p_EventFilter       VARCHAR(100),
    IN  p_StatusFilter      VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            EmailTemplateId, TemplateCode, TemplateName, Module, Event, EmailSubject,
            EmailBody, AttachmentAllowed, AttachmentType, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_EmailTemplate
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR TemplateCode LIKE CONCAT('%', p_Search, '%')
            OR TemplateName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_ModuleFilter IS NULL OR p_ModuleFilter = '' OR Module = p_ModuleFilter)
          AND (p_EventFilter  IS NULL OR p_EventFilter  = '' OR Event  = p_EventFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY EmailTemplateId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            EmailTemplateId, TemplateCode, TemplateName, Module, Event, EmailSubject,
            EmailBody, AttachmentAllowed, AttachmentType, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_EmailTemplate
        WHERE EmailTemplateId = p_EmailTemplateId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('EML-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(TemplateCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS TemplateCode
        FROM Master_EmailTemplate;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_EmailTemplate WHERE TemplateName = p_TemplateName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TEMPLATE_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(TemplateCode, 5) AS UNSIGNED)), 0) + 1 INTO v_NextNum FROM Master_EmailTemplate;
            SET v_Code = CONCAT('EML-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_EmailTemplate (
                TemplateCode, TemplateName, Module, Event, EmailSubject, EmailBody,
                AttachmentAllowed, AttachmentType, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_TemplateName, p_Module, p_Event, p_EmailSubject, p_EmailBody,
                p_AttachmentAllowed, p_AttachmentType, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS EmailTemplateId, v_Code AS TemplateCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_EmailTemplate WHERE TemplateName = p_TemplateName AND IsDeleted = 0 AND EmailTemplateId <> p_EmailTemplateId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TEMPLATE_NAME';
        END IF;

        UPDATE Master_EmailTemplate
        SET
            TemplateName      = p_TemplateName,
            Module            = p_Module,
            Event             = p_Event,
            EmailSubject      = p_EmailSubject,
            EmailBody         = p_EmailBody,
            AttachmentAllowed = p_AttachmentAllowed,
            AttachmentType    = p_AttachmentType,
            Status            = p_Status,
            Remarks           = p_Remarks,
            UpdatedBy         = p_UpdatedBy,
            UpdatedDate       = CURRENT_TIMESTAMP
        WHERE EmailTemplateId = p_EmailTemplateId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_EmailTemplate
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE EmailTemplateId = p_EmailTemplateId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_EmailTemplate
        SET
            IsDeleted   = 1,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE EmailTemplateId = p_EmailTemplateId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
