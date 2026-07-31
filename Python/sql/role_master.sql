-- ============================================================
-- Role Master - SQL Script  (global roles + their permissions)
-- Database : admin
-- Table    : Master_Role
-- SP       : SpMasterRole
-- Screen   : /admin/masters/roles
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Role
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Role (
    RoleId               INT           NOT NULL AUTO_INCREMENT,
    RoleCode             VARCHAR(20)   NOT NULL,          -- Auto-generated: ROL-001
    RoleName             VARCHAR(100)  NOT NULL,
    Description          VARCHAR(500)  NULL,
    DefaultRole          TINYINT(1)    NOT NULL DEFAULT 0,
    CanCreateUsers       TINYINT(1)    NOT NULL DEFAULT 0,
    CanAssignPermissions TINYINT(1)    NOT NULL DEFAULT 0,
    Status               ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks              TEXT          NULL,

    -- Audit
    CreatedBy            VARCHAR(100)  NULL,
    CreatedDate          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy            VARCHAR(100)  NULL,
    UpdatedDate          DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted            TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Role PRIMARY KEY (RoleId),
    CONSTRAINT UQ_Role_Code   UNIQUE (RoleCode),
    -- NOTE: RoleName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Role_Name     (RoleName),
    KEY IDX_Role_Status   (Status),
    KEY IDX_Role_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterRole
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: RoleName unique among NON-DELETED rows (this also guarantees a
-- single "Super Admin"). Violations -> SQLSTATE '45000' 'DUPLICATE_ROLE_NAME'.
-- Single default: setting DefaultRole=1 clears it on all other non-deleted rows.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterRole;

DELIMITER $$

CREATE PROCEDURE SpMasterRole(
    IN  p_Opt                  VARCHAR(20),
    IN  p_RoleId               INT,
    IN  p_RoleName             VARCHAR(100),
    IN  p_Description          VARCHAR(500),
    IN  p_DefaultRole          TINYINT,
    IN  p_CanCreateUsers       TINYINT,
    IN  p_CanAssignPermissions TINYINT,
    IN  p_Status               VARCHAR(20),
    IN  p_Remarks              TEXT,
    IN  p_CreatedBy            VARCHAR(100),
    IN  p_UpdatedBy            VARCHAR(100),
    IN  p_Search               VARCHAR(255),
    IN  p_StatusFilter         VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            RoleId, RoleCode, RoleName, Description, DefaultRole, CanCreateUsers,
            CanAssignPermissions, Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Role
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR RoleCode LIKE CONCAT('%', p_Search, '%')
            OR RoleName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY RoleId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            RoleId, RoleCode, RoleName, Description, DefaultRole, CanCreateUsers,
            CanAssignPermissions, Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Role
        WHERE RoleId = p_RoleId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('ROL-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(RoleCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS RoleCode
        FROM Master_Role;

    ELSEIF p_Opt = 'INSERT' THEN
        IF EXISTS (SELECT 1 FROM Master_Role WHERE RoleName = p_RoleName AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ROLE_NAME';
        END IF;

        IF p_DefaultRole = 1 THEN
            UPDATE Master_Role SET DefaultRole = 0 WHERE IsDeleted = 0;
        END IF;

        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);
            SELECT COALESCE(MAX(CAST(SUBSTRING(RoleCode, 5) AS UNSIGNED)), 0) + 1 INTO v_NextNum FROM Master_Role;
            SET v_Code = CONCAT('ROL-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Role (
                RoleCode, RoleName, Description, DefaultRole, CanCreateUsers,
                CanAssignPermissions, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_RoleName, p_Description, p_DefaultRole, p_CanCreateUsers,
                p_CanAssignPermissions, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS RoleId, v_Code AS RoleCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Role WHERE RoleName = p_RoleName AND IsDeleted = 0 AND RoleId <> p_RoleId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ROLE_NAME';
        END IF;

        IF p_DefaultRole = 1 THEN
            UPDATE Master_Role SET DefaultRole = 0 WHERE IsDeleted = 0 AND RoleId <> p_RoleId;
        END IF;

        UPDATE Master_Role
        SET
            RoleName             = p_RoleName,
            Description          = p_Description,
            DefaultRole          = p_DefaultRole,
            CanCreateUsers       = p_CanCreateUsers,
            CanAssignPermissions = p_CanAssignPermissions,
            Status               = p_Status,
            Remarks              = p_Remarks,
            UpdatedBy            = p_UpdatedBy,
            UpdatedDate          = CURRENT_TIMESTAMP
        WHERE RoleId = p_RoleId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Role
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE RoleId = p_RoleId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Role
        SET
            IsDeleted   = 1,
            DefaultRole = 0,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE RoleId = p_RoleId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
