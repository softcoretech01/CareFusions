-- Master_RadiologyService + SpMasterRadiologyService, before removing
-- ServiceCategory / EstimatedDuration / ReportTat.

CREATE TABLE `Master_RadiologyService` (
  `RadiologyServiceId` int(11) NOT NULL AUTO_INCREMENT,
  `ServiceCode` varchar(20) NOT NULL,
  `ServiceName` varchar(255) NOT NULL,
  `Department` varchar(100) NOT NULL,
  `Description` varchar(500) DEFAULT NULL,
  `ServiceCategory` enum('X-Ray','CT Scan','MRI','Ultrasound','Mammogram','ECG','Echo','PET Scan') NOT NULL,
  `EstimatedDuration` int(11) NOT NULL,
  `ReportTat` int(11) NOT NULL,
  `RequiresAppointment` tinyint(1) NOT NULL DEFAULT 1,
  `RequiresContrast` tinyint(1) NOT NULL DEFAULT 0,
  `RequiresFasting` tinyint(1) NOT NULL DEFAULT 0,
  `ServicePrice` decimal(12,2) NOT NULL,
  `Gst` decimal(5,2) DEFAULT NULL,
  `ReportTemplate` varchar(255) DEFAULT NULL,
  `RequiresApproval` tinyint(1) NOT NULL DEFAULT 1,
  `CriticalFindingAlert` tinyint(1) NOT NULL DEFAULT 0,
  `Status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `Remarks` text DEFAULT NULL,
  `CreatedBy` varchar(100) DEFAULT NULL,
  `CreatedDate` datetime NOT NULL DEFAULT current_timestamp(),
  `UpdatedBy` varchar(100) DEFAULT NULL,
  `UpdatedDate` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`RadiologyServiceId`),
  KEY `IDX_RadiologyService_Department` (`Department`),
  KEY `IDX_RadiologyService_Category` (`ServiceCategory`),
  KEY `IDX_RadiologyService_Status` (`Status`),
  KEY `IDX_RadiologyService_IsDeleted` (`IsDeleted`),
  KEY `IDX_RadiologyService_Name` (`ServiceName`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO admin.Master_RadiologyService (RadiologyServiceId, ServiceCode, ServiceName, Department, Description, ServiceCategory, EstimatedDuration, ReportTat, RequiresAppointment, RequiresContrast, RequiresFasting, ServicePrice, Gst, ReportTemplate, RequiresApproval, CriticalFindingAlert, Status, Remarks, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate, IsDeleted) VALUES (1, 'RAD-001', 'CT', 'Cardiology', NULL, 'Ultrasound', 1, 5, 1, 0, 0, '1999.97', NULL, NULL, 1, 0, 'Active', NULL, 'Admin', '2026-08-01 08:05:36', 'Admin', '2026-08-21 13:49:48', 0);

-- stored procedure --
DELIMITER //
CREATE DEFINER=`root`@`%` PROCEDURE `SpMasterRadiologyService`(
    IN  p_Opt                  VARCHAR(20),
    IN  p_RadiologyServiceId   INT,
    IN  p_ServiceName          VARCHAR(255),
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
    IN  p_CategoryFilter       VARCHAR(20),
    IN  p_StatusFilter         VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            RadiologyServiceId,
            ServiceCode,
            ServiceName,
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
            OR ServiceCategory LIKE CONCAT('%', p_Search, '%')
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

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            RadiologyServiceId,
            ServiceCode,
            ServiceName,
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
                ServiceCategory, EstimatedDuration, ReportTat,
                RequiresAppointment, RequiresContrast, RequiresFasting,
                ServicePrice, Gst,
                ReportTemplate, RequiresApproval, CriticalFindingAlert,
                Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_ServiceName, p_Description,
                p_ServiceCategory, p_EstimatedDuration, p_ReportTat,
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
