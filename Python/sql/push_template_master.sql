-- ============================================================
-- Push Notification Template Master - SQL Script
-- Database : admin
-- Table    : Master_PushTemplate
-- SP       : SpMasterPushTemplate
-- Screen   : /admin/notification-masters/push
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_PushTemplate
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_PushTemplate (
    PushTemplateId      INT           NOT NULL AUTO_INCREMENT,
    TemplateCode        VARCHAR(20)   NOT NULL,          -- Auto-generated: PNT-001
    TemplateName        VARCHAR(150)  NOT NULL,
    Module              VARCHAR(100)  NOT NULL,
    Event               VARCHAR(100)  NOT NULL,
    NotificationTitle   VARCHAR(150)  NOT NULL,
    NotificationMessage VARCHAR(500)  NOT NULL,
    ClickAction         VARCHAR(100)  NULL,
    DeepLinkUrl         VARCHAR(255)  NULL,
    Priority            VARCHAR(10)   NOT NULL DEFAULT 'Medium',
    Status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks             VARCHAR(500)  NULL,

    -- Audit
    CreatedBy           VARCHAR(100)  NULL,
    CreatedDate         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100)  NULL,
    UpdatedDate         DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_PushTemplate PRIMARY KEY (PushTemplateId),
    CONSTRAINT UQ_PushTemplate_Code   UNIQUE (TemplateCode),
    -- NOTE: TemplateName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_PushTemplate_Name     (TemplateName),
    KEY IDX_PushTemplate_Module   (Module),
    KEY IDX_PushTemplate_Event    (Event),
    KEY IDX_PushTemplate_Status   (Status),
    KEY IDX_PushTemplate_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterPushTemplate
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness (non-deleted rows only):
--   TemplateName -> 'DUPLICATE_TEMPLATE_NAME'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterPushTemplate;

DELIMITER $$

CREATE PROCEDURE SpMasterPushTemplate(
    IN  p_Opt                 VARCHAR(20),
    IN  p_PushTemplateId      INT,
    IN  p_TemplateName        VARCHAR(150),
    IN  p_Module              VARCHAR(100),
    IN  p_Event               VARCHAR(100),
    IN  p_NotificationTitle   VARCHAR(150),
    IN  p_NotificationMessage VARCHAR(500),
    IN  p_ClickAction         VARCHAR(100),
    IN  p_DeepLinkUrl         VARCHAR(255),
    IN  p_Priority            VARCHAR(10),
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             VARCHAR(500),
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_ModuleFilter        VARCHAR(100),
    IN  p_EventFilter         VARCHAR(100),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            PushTemplateId, TemplateCode, TemplateName, Module, Event, NotificationTitle,
            NotificationMessage, ClickAction, DeepLinkUrl, Priority, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_PushTemplate
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR TemplateCode LIKE CONCAT('%', p_Search, '%')
            OR TemplateName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_ModuleFilter IS NULL OR p_ModuleFilter = '' OR Module = p_ModuleFilter)
          AND (p_EventFilter  IS NULL OR p_EventFilter  = '' OR Event  = p_EventFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY PushTemplateId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            PushTemplateId, TemplateCode, TemplateName, Module, Event, NotificationTitle,
            NotificationMessage, ClickAction, DeepLinkUrl, Priority, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_PushTemplate
        WHERE PushTemplateId = p_PushTemplateId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('PNT-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(TemplateCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS TemplateCode
        FROM Master_PushTemplate;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_PushTemplate WHERE TemplateName = p_TemplateName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TEMPLATE_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(TemplateCode, 5) AS UNSIGNED)), 0) + 1 INTO v_NextNum FROM Master_PushTemplate;
            SET v_Code = CONCAT('PNT-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_PushTemplate (
                TemplateCode, TemplateName, Module, Event, NotificationTitle, NotificationMessage,
                ClickAction, DeepLinkUrl, Priority, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_TemplateName, p_Module, p_Event, p_NotificationTitle, p_NotificationMessage,
                p_ClickAction, p_DeepLinkUrl, p_Priority, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS PushTemplateId, v_Code AS TemplateCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_PushTemplate WHERE TemplateName = p_TemplateName AND IsDeleted = 0 AND PushTemplateId <> p_PushTemplateId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_TEMPLATE_NAME';
        END IF;

        UPDATE Master_PushTemplate
        SET
            TemplateName        = p_TemplateName,
            Module              = p_Module,
            Event               = p_Event,
            NotificationTitle   = p_NotificationTitle,
            NotificationMessage = p_NotificationMessage,
            ClickAction         = p_ClickAction,
            DeepLinkUrl         = p_DeepLinkUrl,
            Priority            = p_Priority,
            Status              = p_Status,
            Remarks             = p_Remarks,
            UpdatedBy           = p_UpdatedBy,
            UpdatedDate         = CURRENT_TIMESTAMP
        WHERE PushTemplateId = p_PushTemplateId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_PushTemplate
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE PushTemplateId = p_PushTemplateId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_PushTemplate
        SET
            IsDeleted   = 1,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE PushTemplateId = p_PushTemplateId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
