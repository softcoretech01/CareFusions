-- ============================================================
-- Profit Center Master - SQL Script
-- Database : admin
-- Table    : Master_ProfitCenter
-- SP       : SpMasterProfitCenter
-- Screen   : /admin/masters/profit-center
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_ProfitCenter
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_ProfitCenter (
    ProfitCenterId   INT           NOT NULL AUTO_INCREMENT,
    ProfitCenterCode VARCHAR(20)   NOT NULL,               -- Auto-generated: PFT-001
    ProfitCenterName VARCHAR(150)  NOT NULL,
    Department       VARCHAR(100)  NOT NULL,
    Description      VARCHAR(500)  NULL,
    Status           ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks          TEXT          NULL,

    -- Audit
    CreatedBy        VARCHAR(100)  NULL,
    CreatedDate      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy        VARCHAR(100)  NULL,
    UpdatedDate      DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted        TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_ProfitCenter PRIMARY KEY (ProfitCenterId),
    CONSTRAINT UQ_ProfitCenter_Code   UNIQUE (ProfitCenterCode),
    -- NOTE: ProfitCenterName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_ProfitCenter_Name      (ProfitCenterName),
    KEY IDX_ProfitCenter_Department(Department),
    KEY IDX_ProfitCenter_Status    (Status),
    KEY IDX_ProfitCenter_IsDeleted (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterProfitCenter
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: ProfitCenterName must be unique among NON-DELETED rows.
-- Violations raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_PROFITCENTER_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterProfitCenter;

DELIMITER $$

CREATE PROCEDURE SpMasterProfitCenter(
    IN  p_Opt              VARCHAR(20),
    IN  p_ProfitCenterId   INT,
    IN  p_ProfitCenterName VARCHAR(150),
    IN  p_Department       VARCHAR(100),
    IN  p_Description       VARCHAR(500),
    IN  p_Status           VARCHAR(20),
    IN  p_Remarks          TEXT,
    IN  p_CreatedBy        VARCHAR(100),
    IN  p_UpdatedBy        VARCHAR(100),
    IN  p_Search           VARCHAR(255),
    IN  p_DepartmentFilter VARCHAR(100),
    IN  p_StatusFilter     VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            ProfitCenterId, ProfitCenterCode, ProfitCenterName, Department, Description,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_ProfitCenter
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR ProfitCenterCode LIKE CONCAT('%', p_Search, '%')
            OR ProfitCenterName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_DepartmentFilter IS NULL OR p_DepartmentFilter = '' OR Department = p_DepartmentFilter)
          AND (p_StatusFilter     IS NULL OR p_StatusFilter     = '' OR Status     = p_StatusFilter)
        ORDER BY ProfitCenterId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ProfitCenterId, ProfitCenterCode, ProfitCenterName, Department, Description,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_ProfitCenter
        WHERE ProfitCenterId = p_ProfitCenterId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('PFT-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(ProfitCenterCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS ProfitCenterCode
        FROM Master_ProfitCenter;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_ProfitCenter WHERE ProfitCenterName = p_ProfitCenterName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PROFITCENTER_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(ProfitCenterCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_ProfitCenter;

            SET v_Code = CONCAT('PFT-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_ProfitCenter (
                ProfitCenterCode, ProfitCenterName, Department, Description, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_ProfitCenterName, p_Department, p_Description, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS ProfitCenterId, v_Code AS ProfitCenterCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_ProfitCenter WHERE ProfitCenterName = p_ProfitCenterName AND IsDeleted = 0 AND ProfitCenterId <> p_ProfitCenterId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_PROFITCENTER_NAME';
        END IF;

        UPDATE Master_ProfitCenter
        SET
            ProfitCenterName = p_ProfitCenterName,
            Department       = p_Department,
            Description      = p_Description,
            Status           = p_Status,
            Remarks          = p_Remarks,
            UpdatedBy        = p_UpdatedBy,
            UpdatedDate      = CURRENT_TIMESTAMP
        WHERE ProfitCenterId = p_ProfitCenterId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_ProfitCenter
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ProfitCenterId = p_ProfitCenterId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_ProfitCenter
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ProfitCenterId = p_ProfitCenterId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
