-- Remove Service Category / Estimated Duration / Report TAT from the
-- Radiology Service master. Backup: Python/backups/radiology_service_before_removal.sql
-- Run against the admin schema.

DROP PROCEDURE IF EXISTS SpMasterRadiologyService;

DELIMITER //

CREATE DEFINER=`root`@`%` PROCEDURE `SpMasterRadiologyService`(
    IN  p_Opt                  VARCHAR(20),
    IN  p_RadiologyServiceId   INT,
    IN  p_ServiceName          VARCHAR(255),
    IN  p_Description          VARCHAR(500),
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
    IN  p_StatusFilter         VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            RadiologyServiceId,
            ServiceCode,
            ServiceName,
            Description,
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
          )
          AND (
            p_StatusFilter IS NULL OR p_StatusFilter = ''
            OR Status = p_StatusFilter
          )
        ORDER BY RadiologyServiceId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            RadiologyServiceId,
            ServiceCode,
            ServiceName,
            Description,
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

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('RAD-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(ServiceCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS ServiceCode
        FROM Master_RadiologyService;

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
                ServiceCode, ServiceName, Description,
                RequiresAppointment, RequiresContrast, RequiresFasting,
                ServicePrice, Gst,
                ReportTemplate, RequiresApproval, CriticalFindingAlert,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_ServiceName, p_Description,
                p_RequiresAppointment, p_RequiresContrast, p_RequiresFasting,
                p_ServicePrice, p_Gst,
                p_ReportTemplate, p_RequiresApproval, p_CriticalFindingAlert,
                p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS RadiologyServiceId, v_Code AS ServiceCode;
        END;

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
            Description          = p_Description,
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

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_RadiologyService
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE RadiologyServiceId = p_RadiologyServiceId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

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

END //

DELIMITER ;

-- Idempotent: this is a one-way migration, but init_db.py replays every .sql in
-- the folder, so a second run used to fail with "Can't DROP ...; check that
-- column/key exists" and abort the rest of the deployment.
DROP PROCEDURE IF EXISTS SpTmpDropRadiologyServiceCols;
DELIMITER $$
CREATE PROCEDURE SpTmpDropRadiologyServiceCols()
BEGIN
    DECLARE v_schema VARCHAR(64);
    SET v_schema = DATABASE();

    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_RadiologyService'
                 AND COLUMN_NAME = 'ServiceCategory') THEN
        ALTER TABLE Master_RadiologyService DROP COLUMN ServiceCategory;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_RadiologyService'
                 AND COLUMN_NAME = 'EstimatedDuration') THEN
        ALTER TABLE Master_RadiologyService DROP COLUMN EstimatedDuration;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = v_schema AND TABLE_NAME = 'Master_RadiologyService'
                 AND COLUMN_NAME = 'ReportTat') THEN
        ALTER TABLE Master_RadiologyService DROP COLUMN ReportTat;
    END IF;
END$$
DELIMITER ;
CALL SpTmpDropRadiologyServiceCols();
DROP PROCEDURE IF EXISTS SpTmpDropRadiologyServiceCols;
