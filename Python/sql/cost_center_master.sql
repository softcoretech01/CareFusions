-- ============================================================
-- Cost Center Master - SQL Script
-- Database : admin
-- Table    : Master_CostCenter
-- SP       : SpMasterCostCenter
-- Screen   : /admin/masters/cost-center
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_CostCenter
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_CostCenter (
    CostCenterId   INT           NOT NULL AUTO_INCREMENT,
    CostCenterCode VARCHAR(20)   NOT NULL,               -- Auto-generated: CST-001
    CostCenterName VARCHAR(150)  NOT NULL,
    Department     VARCHAR(100)  NOT NULL,
    Manager        VARCHAR(100)  NULL,
    Description    VARCHAR(500)  NULL,
    Status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks        TEXT          NULL,

    -- Audit
    CreatedBy      VARCHAR(100)  NULL,
    CreatedDate    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy      VARCHAR(100)  NULL,
    UpdatedDate    DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted      TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_CostCenter PRIMARY KEY (CostCenterId),
    CONSTRAINT UQ_CostCenter_Code   UNIQUE (CostCenterCode),
    -- NOTE: CostCenterName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_CostCenter_Name      (CostCenterName),
    KEY IDX_CostCenter_Department(Department),
    KEY IDX_CostCenter_Status    (Status),
    KEY IDX_CostCenter_IsDeleted (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterCostCenter
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: CostCenterName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_COSTCENTER_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterCostCenter;

DELIMITER $$

CREATE PROCEDURE SpMasterCostCenter(
    IN  p_Opt              VARCHAR(20),
    IN  p_CostCenterId     INT,
    IN  p_CostCenterName   VARCHAR(150),
    IN  p_Department       VARCHAR(100),
    IN  p_Manager          VARCHAR(100),
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
            CostCenterId, CostCenterCode, CostCenterName, Department, Manager, Description,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_CostCenter
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR CostCenterCode LIKE CONCAT('%', p_Search, '%')
            OR CostCenterName LIKE CONCAT('%', p_Search, '%')
            OR Manager        LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_DepartmentFilter IS NULL OR p_DepartmentFilter = '' OR Department = p_DepartmentFilter)
          AND (p_StatusFilter     IS NULL OR p_StatusFilter     = '' OR Status     = p_StatusFilter)
        ORDER BY CostCenterId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            CostCenterId, CostCenterCode, CostCenterName, Department, Manager, Description,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_CostCenter
        WHERE CostCenterId = p_CostCenterId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('CST-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(CostCenterCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS CostCenterCode
        FROM Master_CostCenter;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_CostCenter WHERE CostCenterName = p_CostCenterName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COSTCENTER_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(CostCenterCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_CostCenter;

            SET v_Code = CONCAT('CST-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_CostCenter (
                CostCenterCode, CostCenterName, Department, Manager, Description, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_CostCenterName, p_Department, p_Manager, p_Description, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS CostCenterId, v_Code AS CostCenterCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_CostCenter WHERE CostCenterName = p_CostCenterName AND IsDeleted = 0 AND CostCenterId <> p_CostCenterId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COSTCENTER_NAME';
        END IF;

        UPDATE Master_CostCenter
        SET
            CostCenterName = p_CostCenterName,
            Department     = p_Department,
            Manager        = p_Manager,
            Description    = p_Description,
            Status         = p_Status,
            Remarks        = p_Remarks,
            UpdatedBy      = p_UpdatedBy,
            UpdatedDate    = CURRENT_TIMESTAMP
        WHERE CostCenterId = p_CostCenterId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_CostCenter
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CostCenterId = p_CostCenterId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_CostCenter
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CostCenterId = p_CostCenterId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
