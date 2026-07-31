-- ============================================================
-- Radiology Service Master - SQL Script
-- Database : admin
-- Table    : Master_RadiologyService
-- SP       : SpMasterRadiologyService
-- Screen   : /admin/masters/radiology-service
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_RadiologyService
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_RadiologyService (
    RadiologyServiceId   INT           NOT NULL AUTO_INCREMENT,
    ServiceCode          VARCHAR(20)   NOT NULL,               -- Auto-generated: RAD-001
    ServiceName          VARCHAR(255)  NOT NULL,
    Department           VARCHAR(100)  NOT NULL,
    Description          VARCHAR(500)  NULL,

    -- Service Details
    ServiceCategory      ENUM('X-Ray','CT Scan','MRI','Ultrasound',
                              'Mammogram','ECG','Echo','PET Scan') NOT NULL,
    EstimatedDuration    INT           NOT NULL,                -- Minutes  (> 0)
    ReportTat            INT           NOT NULL,                -- Hours    (> 0)
    RequiresAppointment  TINYINT(1)    NOT NULL DEFAULT 1,
    RequiresContrast     TINYINT(1)    NOT NULL DEFAULT 0,
    RequiresFasting      TINYINT(1)    NOT NULL DEFAULT 0,

    -- Billing Information
    ServicePrice         DECIMAL(12,2) NOT NULL,                -- > 0
    Gst                  DECIMAL(5,2)  NULL,                    -- 0 - 100 (%)

    -- Report Configuration
    ReportTemplate       VARCHAR(255)  NULL,
    RequiresApproval     TINYINT(1)    NOT NULL DEFAULT 1,
    CriticalFindingAlert TINYINT(1)    NOT NULL DEFAULT 0,

    -- System Information
    Status               ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks              TEXT          NULL,

    -- Audit
    CreatedBy            VARCHAR(100)  NULL,
    CreatedDate          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy            VARCHAR(100)  NULL,
    UpdatedDate          DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted            TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_RadiologyService PRIMARY KEY (RadiologyServiceId),
    CONSTRAINT UQ_RadiologyService_Code   UNIQUE (ServiceCode),
    -- NOTE: ServiceName is intentionally NOT a hard UNIQUE constraint.
    -- Uniqueness is enforced inside the SP for non-deleted rows only, so a
    -- soft-deleted name can be reused. (See INSERT / UPDATE branches below.)

    -- Indexes (declared inline so re-running this script is safe)
    KEY IDX_RadiologyService_Name       (ServiceName),
    KEY IDX_RadiologyService_Department (Department),
    KEY IDX_RadiologyService_Category   (ServiceCategory),
    KEY IDX_RadiologyService_Status     (Status),
    KEY IDX_RadiologyService_IsDeleted  (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterRadiologyService
-- p_Opt values:
--   'GET'          -> Fetch all non-deleted (optional search + department/category/status filters)
--   'GETBYID'      -> Fetch single record by RadiologyServiceId
--   'INSERT'       -> Auto-generate RAD-001 code, insert, return new id + code
--   'UPDATE'       -> Update existing record (ServiceCode is immutable)
--   'TOGGLESTATUS' -> Flip Status (Active <-> Inactive)
--   'DELETE'       -> Soft delete (IsDeleted=1, Status='Inactive')
--
-- Uniqueness: ServiceName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_SERVICE_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterRadiologyService;

DELIMITER $$

CREATE PROCEDURE SpMasterRadiologyService(
    IN  p_Opt                  VARCHAR(20),
    IN  p_RadiologyServiceId   INT,
    IN  p_ServiceName          VARCHAR(255),
    IN  p_Department           VARCHAR(100),
    IN  p_Description          VARCHAR(500),
    IN  p_ServiceCategory      VARCHAR(20),
    IN  p_EstimatedDuration    INT,
    IN  p_ReportTat            INT,
    IN  p_RequiresAppointment  TINYINT,
    IN  p_RequiresContrast     TINYINT,
    IN  p_RequiresFasting      TINYINT,
    IN  p_ServicePrice         DECIMAL(12,2),
    IN  p_Gst                  DECIMAL(5,2),
    IN  p_ReportTemplate       VARCHAR(255),
    IN  p_RequiresApproval     TINYINT,
    IN  p_CriticalFindingAlert TINYINT,
    IN  p_Status               VARCHAR(20),
    IN  p_Remarks              TEXT,
    IN  p_CreatedBy            VARCHAR(100),
    IN  p_UpdatedBy            VARCHAR(100),
    IN  p_Search               VARCHAR(255),
    IN  p_DepartmentFilter     VARCHAR(100),
    IN  p_CategoryFilter       VARCHAR(20),
    IN  p_StatusFilter         VARCHAR(20)
)
BEGIN

    -- --------------------------------------------------------
    -- GET: Fetch all non-deleted radiology services
    --      Optional: p_Search          (code / name / department / category)
    --                p_DepartmentFilter
    --                p_CategoryFilter
    --                p_StatusFilter    ('Active' | 'Inactive' | NULL)
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            RadiologyServiceId,
            ServiceCode,
            ServiceName,
            Department,
            Description,
            ServiceCategory,
            EstimatedDuration,
            ReportTat,
            RequiresAppointment,
            RequiresContrast,
            RequiresFasting,
            ServicePrice,
            Gst,
            ReportTemplate,
            RequiresApproval,
            CriticalFindingAlert,
            Status,
            Remarks,
            CreatedBy,
            CreatedDate,
            UpdatedBy,
            UpdatedDate
        FROM Master_RadiologyService
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR ServiceCode     LIKE CONCAT('%', p_Search, '%')
            OR ServiceName     LIKE CONCAT('%', p_Search, '%')
            OR Department      LIKE CONCAT('%', p_Search, '%')
            OR ServiceCategory LIKE CONCAT('%', p_Search, '%')
          )
          AND (
            p_DepartmentFilter IS NULL OR p_DepartmentFilter = ''
            OR Department = p_DepartmentFilter
          )
          AND (
            p_CategoryFilter IS NULL OR p_CategoryFilter = ''
            OR ServiceCategory = p_CategoryFilter
          )
          AND (
            p_StatusFilter IS NULL OR p_StatusFilter = ''
            OR Status = p_StatusFilter
          )
        ORDER BY RadiologyServiceId ASC;

    -- --------------------------------------------------------
    -- GETBYID: Fetch single record by RadiologyServiceId
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            RadiologyServiceId,
            ServiceCode,
            ServiceName,
            Department,
            Description,
            ServiceCategory,
            EstimatedDuration,
            ReportTat,
            RequiresAppointment,
            RequiresContrast,
            RequiresFasting,
            ServicePrice,
            Gst,
            ReportTemplate,
            RequiresApproval,
            CriticalFindingAlert,
            Status,
            Remarks,
            CreatedBy,
            CreatedDate,
            UpdatedBy,
            UpdatedDate
        FROM Master_RadiologyService
        WHERE RadiologyServiceId = p_RadiologyServiceId
          AND IsDeleted = 0;

    -- --------------------------------------------------------
    -- NEXTCODE: Preview the code the NEXT insert would generate.
    --           (Same rule as INSERT: MAX across ALL rows + 1.)
    --           Provisional only — the definitive code is assigned
    --           at INSERT time.
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('RAD-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(ServiceCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS ServiceCode
        FROM Master_RadiologyService;

    -- --------------------------------------------------------
    -- INSERT: Auto-generate RAD-001 code, insert new service
    --         Rejects a name already used by a non-deleted row.
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_RadiologyService
                WHERE ServiceName = p_ServiceName AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SERVICE_NAME';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(ServiceCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_RadiologyService;

            SET v_Code = CONCAT('RAD-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_RadiologyService (
                ServiceCode, ServiceName, Department, Description,
                ServiceCategory, EstimatedDuration, ReportTat,
                RequiresAppointment, RequiresContrast, RequiresFasting,
                ServicePrice, Gst,
                ReportTemplate, RequiresApproval, CriticalFindingAlert,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_ServiceName, p_Department, p_Description,
                p_ServiceCategory, p_EstimatedDuration, p_ReportTat,
                p_RequiresAppointment, p_RequiresContrast, p_RequiresFasting,
                p_ServicePrice, p_Gst,
                p_ReportTemplate, p_RequiresApproval, p_CriticalFindingAlert,
                p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS RadiologyServiceId, v_Code AS ServiceCode;
        END;

    -- --------------------------------------------------------
    -- UPDATE: Update service (ServiceCode is immutable)
    --         Rejects a name used by ANOTHER non-deleted row.
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_RadiologyService
            WHERE ServiceName = p_ServiceName
              AND IsDeleted = 0
              AND RadiologyServiceId <> p_RadiologyServiceId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SERVICE_NAME';
        END IF;

        UPDATE Master_RadiologyService
        SET
            ServiceName          = p_ServiceName,
            Department           = p_Department,
            Description          = p_Description,
            ServiceCategory      = p_ServiceCategory,
            EstimatedDuration    = p_EstimatedDuration,
            ReportTat            = p_ReportTat,
            RequiresAppointment  = p_RequiresAppointment,
            RequiresContrast     = p_RequiresContrast,
            RequiresFasting      = p_RequiresFasting,
            ServicePrice         = p_ServicePrice,
            Gst                  = p_Gst,
            ReportTemplate       = p_ReportTemplate,
            RequiresApproval     = p_RequiresApproval,
            CriticalFindingAlert = p_CriticalFindingAlert,
            Status               = p_Status,
            Remarks              = p_Remarks,
            UpdatedBy            = p_UpdatedBy,
            UpdatedDate          = CURRENT_TIMESTAMP
        WHERE RadiologyServiceId = p_RadiologyServiceId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- TOGGLESTATUS: Flip Active <-> Inactive
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_RadiologyService
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE RadiologyServiceId = p_RadiologyServiceId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE: Soft delete
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_RadiologyService
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE RadiologyServiceId = p_RadiologyServiceId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
