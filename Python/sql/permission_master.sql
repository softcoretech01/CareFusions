-- ============================================================
-- Permission Master - SQL Script
-- Database : admin
-- Table    : Master_Permission
-- SP       : SpMasterPermission
-- Screen   : /admin/masters/permissions
--
-- A permission grants a Role a set of actions on a Module (menu section).
-- Uniqueness: one row per (Role, Module) among non-deleted rows.
-- Used at login: GETBYROLE returns every active permission for a role so the
-- frontend can gate the sidebar / routes.
-- ============================================================

USE admin;

CREATE TABLE IF NOT EXISTS Master_Permission (
    PermissionId        INT           NOT NULL AUTO_INCREMENT,
    PermissionCode      VARCHAR(20)   NOT NULL,          -- Auto: PRM-001
    Role                VARCHAR(100)  NOT NULL,
    Module              VARCHAR(100)  NOT NULL,          -- menu-section key
    SubModule           VARCHAR(100)  NULL,
    CanView             TINYINT(1)    NOT NULL DEFAULT 1,
    CanCreate           TINYINT(1)    NOT NULL DEFAULT 0,
    CanEdit             TINYINT(1)    NOT NULL DEFAULT 0,
    CanDelete           TINYINT(1)    NOT NULL DEFAULT 0,
    CanPrint            TINYINT(1)    NOT NULL DEFAULT 0,
    CanExport           TINYINT(1)    NOT NULL DEFAULT 0,
    CanImport           TINYINT(1)    NOT NULL DEFAULT 0,
    CanApprove          TINYINT(1)    NOT NULL DEFAULT 0,
    AllowApiAccess      TINYINT(1)    NOT NULL DEFAULT 0,
    AllowDataExport     TINYINT(1)    NOT NULL DEFAULT 0,
    AllowBulkOperations TINYINT(1)    NOT NULL DEFAULT 0,
    AllowAuditLogAccess TINYINT(1)    NOT NULL DEFAULT 0,
    Status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks             VARCHAR(500)  NULL,

    CreatedBy           VARCHAR(100)  NULL,
    CreatedDate         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy           VARCHAR(100)  NULL,
    UpdatedDate         DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted           TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Permission PRIMARY KEY (PermissionId),
    CONSTRAINT UQ_Permission_Code   UNIQUE (PermissionCode),
    -- (Role, Module) uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Perm_Role   (Role),
    KEY IDX_Perm_Module (Module),
    KEY IDX_Perm_Status (Status),
    KEY IDX_Perm_Deleted(IsDeleted)
);


DROP PROCEDURE IF EXISTS SpMasterPermission;

DELIMITER $$

CREATE PROCEDURE SpMasterPermission(
    IN  p_Opt                 VARCHAR(20),
    IN  p_PermissionId        INT,
    IN  p_Role                VARCHAR(100),
    IN  p_Module              VARCHAR(100),
    IN  p_SubModule           VARCHAR(100),
    IN  p_CanView             TINYINT,
    IN  p_CanCreate           TINYINT,
    IN  p_CanEdit             TINYINT,
    IN  p_CanDelete           TINYINT,
    IN  p_CanPrint            TINYINT,
    IN  p_CanExport           TINYINT,
    IN  p_CanImport           TINYINT,
    IN  p_CanApprove          TINYINT,
    IN  p_AllowApiAccess      TINYINT,
    IN  p_AllowDataExport     TINYINT,
    IN  p_AllowBulkOperations TINYINT,
    IN  p_AllowAuditLogAccess TINYINT,
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             VARCHAR(500),
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_RoleFilter          VARCHAR(100),
    IN  p_ModuleFilter        VARCHAR(100),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT * FROM Master_Permission
        WHERE IsDeleted = 0
          AND (p_Search IS NULL OR p_Search = ''
               OR PermissionCode LIKE CONCAT('%', p_Search, '%')
               OR Role   LIKE CONCAT('%', p_Search, '%')
               OR Module LIKE CONCAT('%', p_Search, '%'))
          AND (p_RoleFilter   IS NULL OR p_RoleFilter   = '' OR Role   = p_RoleFilter)
          AND (p_ModuleFilter IS NULL OR p_ModuleFilter = '' OR Module = p_ModuleFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY PermissionId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT * FROM Master_Permission WHERE PermissionId = p_PermissionId AND IsDeleted = 0;

    ELSEIF p_Opt = 'GETBYROLE' THEN
        SELECT * FROM Master_Permission
        WHERE IsDeleted = 0 AND Status = 'Active' AND Role = p_Role
        ORDER BY Module ASC;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('PRM-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(PermissionCode, 5) AS UNSIGNED)), 0) + 1, 3, '0'
        )) AS PermissionCode
        FROM Master_Permission;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_Num INT DEFAULT 1;
            DECLARE v_Code VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_Permission WHERE Role = p_Role AND Module = p_Module AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ROLE_MODULE';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(PermissionCode, 5) AS UNSIGNED)), 0) + 1 INTO v_Num FROM Master_Permission;
            SET v_Code = CONCAT('PRM-', LPAD(v_Num, 3, '0'));

            INSERT INTO Master_Permission (
                PermissionCode, Role, Module, SubModule, CanView, CanCreate, CanEdit, CanDelete,
                CanPrint, CanExport, CanImport, CanApprove, AllowApiAccess, AllowDataExport,
                AllowBulkOperations, AllowAuditLogAccess, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_Role, p_Module, p_SubModule, p_CanView, p_CanCreate, p_CanEdit, p_CanDelete,
                p_CanPrint, p_CanExport, p_CanImport, p_CanApprove, p_AllowApiAccess, p_AllowDataExport,
                p_AllowBulkOperations, p_AllowAuditLogAccess, p_Status, p_Remarks, p_CreatedBy
            );
            SELECT LAST_INSERT_ID() AS PermissionId, v_Code AS PermissionCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Permission WHERE Role = p_Role AND Module = p_Module AND IsDeleted = 0 AND PermissionId <> p_PermissionId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ROLE_MODULE';
        END IF;
        UPDATE Master_Permission SET
            Role = p_Role, Module = p_Module, SubModule = p_SubModule,
            CanView = p_CanView, CanCreate = p_CanCreate, CanEdit = p_CanEdit, CanDelete = p_CanDelete,
            CanPrint = p_CanPrint, CanExport = p_CanExport, CanImport = p_CanImport, CanApprove = p_CanApprove,
            AllowApiAccess = p_AllowApiAccess, AllowDataExport = p_AllowDataExport,
            AllowBulkOperations = p_AllowBulkOperations, AllowAuditLogAccess = p_AllowAuditLogAccess,
            Status = p_Status, Remarks = p_Remarks, UpdatedBy = p_UpdatedBy, UpdatedDate = CURRENT_TIMESTAMP
        WHERE PermissionId = p_PermissionId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Permission
        SET Status = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy = p_UpdatedBy, UpdatedDate = CURRENT_TIMESTAMP
        WHERE PermissionId = p_PermissionId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Permission
        SET IsDeleted = 1, UpdatedBy = p_UpdatedBy, UpdatedDate = CURRENT_TIMESTAMP
        WHERE PermissionId = p_PermissionId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
