-- ============================================================
-- Department Master - SQL Script
-- Database : admin
-- Table    : Master_Department
-- SP       : SpMasterDepartment
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Department
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Department (
    DepartmentId   INT          NOT NULL AUTO_INCREMENT,
    DepartmentCode VARCHAR(20)  NOT NULL,
    DepartmentName VARCHAR(255) NOT NULL,
    DepartmentType ENUM('Clinical','Non-Clinical') NOT NULL DEFAULT 'Clinical',
    Description    TEXT         NULL,
    DepartmentHead VARCHAR(255) NULL,
    Status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    CreatedBy      VARCHAR(100) NULL,
    CreatedDate    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy      VARCHAR(100) NULL,
    UpdatedDate    DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted      TINYINT(1)   NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Department      PRIMARY KEY (DepartmentId),
    CONSTRAINT UQ_Department_Code        UNIQUE (DepartmentCode),
    CONSTRAINT UQ_Department_Name        UNIQUE (DepartmentName)
);

-- Indexes
CREATE INDEX IF NOT EXISTS IDX_Department_Type      ON Master_Department (DepartmentType);
CREATE INDEX IF NOT EXISTS IDX_Department_Status    ON Master_Department (Status);
CREATE INDEX IF NOT EXISTS IDX_Department_IsDeleted ON Master_Department (IsDeleted);


-- ============================================================
-- STORED PROCEDURE: SpMasterDepartment
-- p_Opt values:
--   'GET'          -> Fetch all non-deleted (optional search + status filter)
--   'GETBYID'      -> Fetch single record by DepartmentId
--   'INSERT'       -> Auto-generate DPT-001 code, insert, return new id + code
--   'UPDATE'       -> Update existing record (code is immutable)
--   'TOGGLESTATUS' -> Flip Status (Active <-> Inactive)
--   'DELETE'       -> Soft delete (IsDeleted=1)
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterDepartment;

DELIMITER $$

CREATE PROCEDURE SpMasterDepartment(
    IN  p_Opt            VARCHAR(20),
    IN  p_DepartmentId   INT,
    IN  p_DepartmentName VARCHAR(255),
    IN  p_DepartmentType VARCHAR(20),
    IN  p_Description    TEXT,
    IN  p_DepartmentHead VARCHAR(255),
    IN  p_Status         VARCHAR(20),
    IN  p_CreatedBy      VARCHAR(100),
    IN  p_UpdatedBy      VARCHAR(100),
    IN  p_Search         VARCHAR(255),
    IN  p_StatusFilter   VARCHAR(20)
)
BEGIN

    -- --------------------------------------------------------
    -- GET: Fetch all non-deleted departments
    --      Optional: p_Search (code/name/type/head)
    --                p_StatusFilter ('Active' | 'Inactive' | NULL)
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            DepartmentId,
            DepartmentCode,
            DepartmentName,
            DepartmentType,
            Description,
            DepartmentHead,
            Status,
            CreatedBy,
            CreatedDate,
            UpdatedBy,
            UpdatedDate
        FROM Master_Department
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR DepartmentCode LIKE CONCAT('%', p_Search, '%')
            OR DepartmentName LIKE CONCAT('%', p_Search, '%')
            OR DepartmentType LIKE CONCAT('%', p_Search, '%')
            OR DepartmentHead LIKE CONCAT('%', p_Search, '%')
          )
          AND (
            p_StatusFilter IS NULL OR p_StatusFilter = ''
            OR Status = p_StatusFilter
          )
        ORDER BY DepartmentId ASC;

    -- --------------------------------------------------------
    -- GETBYID: Fetch single department by DepartmentId
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            DepartmentId,
            DepartmentCode,
            DepartmentName,
            DepartmentType,
            Description,
            DepartmentHead,
            Status,
            CreatedBy,
            CreatedDate,
            UpdatedBy,
            UpdatedDate
        FROM Master_Department
        WHERE DepartmentId = p_DepartmentId
          AND IsDeleted = 0;

    -- --------------------------------------------------------
    -- INSERT: Auto-generate DPT-001 code, insert new department
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(DepartmentCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_Department;

            SET v_Code = CONCAT('DPT-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Department (
                DepartmentCode, DepartmentName, DepartmentType,
                Description, DepartmentHead, Status, CreatedBy
            ) VALUES (
                v_Code, p_DepartmentName, p_DepartmentType,
                p_Description, p_DepartmentHead, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS DepartmentId, v_Code AS DepartmentCode;
        END;

    -- --------------------------------------------------------
    -- UPDATE: Update department (DepartmentCode is immutable)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_Department
        SET
            DepartmentName = p_DepartmentName,
            DepartmentType = p_DepartmentType,
            Description    = p_Description,
            DepartmentHead = p_DepartmentHead,
            Status         = p_Status,
            UpdatedBy      = p_UpdatedBy,
            UpdatedDate    = CURRENT_TIMESTAMP
        WHERE DepartmentId = p_DepartmentId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- TOGGLESTATUS: Flip Active <-> Inactive
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Department
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE DepartmentId = p_DepartmentId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE: Soft delete
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Department
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE DepartmentId = p_DepartmentId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
