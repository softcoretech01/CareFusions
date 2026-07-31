-- ============================================================
-- Service Master (Billing) - SQL Script
-- Database : admin
-- Table    : Master_Service
-- SP       : SpMasterService
-- Screen   : /admin/masters/service
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Service
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Service (
    ServiceId              INT           NOT NULL AUTO_INCREMENT,
    ServiceCode            VARCHAR(20)   NOT NULL,               -- Auto-generated: SRV-001
    ServiceName            VARCHAR(150)  NOT NULL,
    ServiceCategory        VARCHAR(100)  NOT NULL,
    Department             VARCHAR(100)  NOT NULL,
    Description            VARCHAR(500)  NULL,

    -- Pricing Information
    StandardPrice          DECIMAL(12,2) NOT NULL,               -- > 0
    CostPrice              DECIMAL(12,2) NULL,                   -- >= 0
    TaxApplicable          TINYINT(1)    NOT NULL DEFAULT 0,
    Tax                    VARCHAR(20)   NULL,                   -- e.g. 'GST 18%'

    -- Configuration
    AllowDiscount          TINYINT(1)    NOT NULL DEFAULT 0,
    RequiresDoctorApproval TINYINT(1)    NOT NULL DEFAULT 0,
    AvailableForOp         TINYINT(1)    NOT NULL DEFAULT 0,
    AvailableForIp         TINYINT(1)    NOT NULL DEFAULT 0,
    AvailableForEmergency  TINYINT(1)    NOT NULL DEFAULT 0,

    -- System Information
    Status                 ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks                TEXT          NULL,

    -- Audit
    CreatedBy              VARCHAR(100)  NULL,
    CreatedDate            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy              VARCHAR(100)  NULL,
    UpdatedDate            DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted              TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Service PRIMARY KEY (ServiceId),
    CONSTRAINT UQ_Service_Code   UNIQUE (ServiceCode),
    -- NOTE: ServiceName is NOT a hard UNIQUE constraint. Uniqueness is enforced
    -- inside the SP for non-deleted rows only, so a soft-deleted name can be reused.

    KEY IDX_Service_Name       (ServiceName),
    KEY IDX_Service_Category   (ServiceCategory),
    KEY IDX_Service_Department (Department),
    KEY IDX_Service_Status     (Status),
    KEY IDX_Service_IsDeleted  (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterService
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: ServiceName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_SERVICE_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterService;

DELIMITER $$

CREATE PROCEDURE SpMasterService(
    IN  p_Opt                    VARCHAR(20),
    IN  p_ServiceId              INT,
    IN  p_ServiceName            VARCHAR(150),
    IN  p_ServiceCategory        VARCHAR(100),
    IN  p_Department             VARCHAR(100),
    IN  p_Description            VARCHAR(500),
    IN  p_StandardPrice          DECIMAL(12,2),
    IN  p_CostPrice              DECIMAL(12,2),
    IN  p_TaxApplicable          TINYINT,
    IN  p_Tax                    VARCHAR(20),
    IN  p_AllowDiscount          TINYINT,
    IN  p_RequiresDoctorApproval TINYINT,
    IN  p_AvailableForOp         TINYINT,
    IN  p_AvailableForIp         TINYINT,
    IN  p_AvailableForEmergency  TINYINT,
    IN  p_Status                 VARCHAR(20),
    IN  p_Remarks                TEXT,
    IN  p_CreatedBy              VARCHAR(100),
    IN  p_UpdatedBy              VARCHAR(100),
    IN  p_Search                 VARCHAR(255),
    IN  p_DepartmentFilter       VARCHAR(100),
    IN  p_CategoryFilter         VARCHAR(100),
    IN  p_StatusFilter           VARCHAR(20)
)
BEGIN

    -- --------------------------------------------------------
    -- GET
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            ServiceId, ServiceCode, ServiceName, ServiceCategory, Department, Description,
            StandardPrice, CostPrice, TaxApplicable, Tax,
            AllowDiscount, RequiresDoctorApproval, AvailableForOp, AvailableForIp, AvailableForEmergency,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Service
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR ServiceCode     LIKE CONCAT('%', p_Search, '%')
            OR ServiceName     LIKE CONCAT('%', p_Search, '%')
            OR ServiceCategory LIKE CONCAT('%', p_Search, '%')
            OR Department      LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_DepartmentFilter IS NULL OR p_DepartmentFilter = '' OR Department      = p_DepartmentFilter)
          AND (p_CategoryFilter   IS NULL OR p_CategoryFilter   = '' OR ServiceCategory = p_CategoryFilter)
          AND (p_StatusFilter     IS NULL OR p_StatusFilter     = '' OR Status          = p_StatusFilter)
        ORDER BY ServiceId ASC;

    -- --------------------------------------------------------
    -- GETBYID
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            ServiceId, ServiceCode, ServiceName, ServiceCategory, Department, Description,
            StandardPrice, CostPrice, TaxApplicable, Tax,
            AllowDiscount, RequiresDoctorApproval, AvailableForOp, AvailableForIp, AvailableForEmergency,
            Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Service
        WHERE ServiceId = p_ServiceId
          AND IsDeleted = 0;

    -- --------------------------------------------------------
    -- NEXTCODE
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('SRV-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(ServiceCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS ServiceCode
        FROM Master_Service;

    -- --------------------------------------------------------
    -- INSERT (auto SRV-001, reject duplicate active name)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_Service
                WHERE ServiceName = p_ServiceName AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SERVICE_NAME';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(ServiceCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_Service;

            SET v_Code = CONCAT('SRV-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Service (
                ServiceCode, ServiceName, ServiceCategory, Department, Description,
                StandardPrice, CostPrice, TaxApplicable, Tax,
                AllowDiscount, RequiresDoctorApproval, AvailableForOp, AvailableForIp, AvailableForEmergency,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_ServiceName, p_ServiceCategory, p_Department, p_Description,
                p_StandardPrice, p_CostPrice, p_TaxApplicable, p_Tax,
                p_AllowDiscount, p_RequiresDoctorApproval, p_AvailableForOp, p_AvailableForIp, p_AvailableForEmergency,
                p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS ServiceId, v_Code AS ServiceCode;
        END;

    -- --------------------------------------------------------
    -- UPDATE (reject a name used by ANOTHER active row)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Service
            WHERE ServiceName = p_ServiceName
              AND IsDeleted = 0
              AND ServiceId <> p_ServiceId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SERVICE_NAME';
        END IF;

        UPDATE Master_Service
        SET
            ServiceName            = p_ServiceName,
            ServiceCategory        = p_ServiceCategory,
            Department             = p_Department,
            Description            = p_Description,
            StandardPrice          = p_StandardPrice,
            CostPrice              = p_CostPrice,
            TaxApplicable          = p_TaxApplicable,
            Tax                    = p_Tax,
            AllowDiscount          = p_AllowDiscount,
            RequiresDoctorApproval = p_RequiresDoctorApproval,
            AvailableForOp         = p_AvailableForOp,
            AvailableForIp         = p_AvailableForIp,
            AvailableForEmergency  = p_AvailableForEmergency,
            Status                 = p_Status,
            Remarks                = p_Remarks,
            UpdatedBy              = p_UpdatedBy,
            UpdatedDate            = CURRENT_TIMESTAMP
        WHERE ServiceId = p_ServiceId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- TOGGLESTATUS
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Service
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ServiceId = p_ServiceId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE (soft)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Service
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE ServiceId = p_ServiceId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
