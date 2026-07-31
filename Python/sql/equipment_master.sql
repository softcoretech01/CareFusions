-- ============================================================
-- Equipment Master - SQL Script
-- Database : admin
-- Table    : Master_Equipment
-- SP       : SpMasterEquipment
-- Screen   : /admin/masters/equipment
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Equipment
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Equipment (
    EquipmentId          INT           NOT NULL AUTO_INCREMENT,
    EquipmentCode        VARCHAR(20)   NOT NULL,               -- Auto-generated: EQP-001
    EquipmentName        VARCHAR(150)  NOT NULL,
    Manufacturer         VARCHAR(100)  NOT NULL,
    Model                VARCHAR(100)  NOT NULL,
    SerialNumber         VARCHAR(100)  NOT NULL,

    -- Purchase Details
    PurchaseDate         DATE          NOT NULL,
    WarrantyExpiryDate   DATE          NULL,
    Supplier             VARCHAR(150)  NULL,
    PurchaseCost         DECIMAL(14,2) NULL,

    -- Maintenance Details
    CalibrationSchedule  ENUM('Monthly','Quarterly','Bi-Annual','Annual') NOT NULL,
    NextMaintenanceDate  DATE          NOT NULL,
    MaintenanceVendor    VARCHAR(150)  NULL,
    LastServiceDate      DATE          NULL,

    -- Location Details
    Hospital             VARCHAR(100)  NOT NULL,
    Branch               VARCHAR(100)  NOT NULL,
    Department           VARCHAR(100)  NOT NULL,
    RoomNumber           VARCHAR(50)   NULL,

    -- System Information
    Status               ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks              TEXT          NULL,

    -- Audit
    CreatedBy            VARCHAR(100)  NULL,
    CreatedDate          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy            VARCHAR(100)  NULL,
    UpdatedDate          DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted            TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Equipment PRIMARY KEY (EquipmentId),
    CONSTRAINT UQ_Equipment_Code   UNIQUE (EquipmentCode),
    -- NOTE: SerialNumber is NOT a hard UNIQUE constraint. Uniqueness is enforced
    -- inside the SP for non-deleted rows only, so a soft-deleted serial can be
    -- reused. (See INSERT / UPDATE branches below.)

    KEY IDX_Equipment_Serial       (SerialNumber),
    KEY IDX_Equipment_Manufacturer (Manufacturer),
    KEY IDX_Equipment_Status       (Status),
    KEY IDX_Equipment_IsDeleted    (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterEquipment
-- p_Opt values:
--   'GET'          -> Fetch all non-deleted (optional search + manufacturer/status filters)
--   'GETBYID'      -> Fetch single record by EquipmentId
--   'NEXTCODE'     -> Preview the next auto-generated EQP code
--   'INSERT'       -> Auto-generate EQP-001 code, insert, return new id + code
--   'UPDATE'       -> Update existing record (EquipmentCode is immutable)
--   'TOGGLESTATUS' -> Flip Status (Active <-> Inactive)
--   'DELETE'       -> Soft delete (IsDeleted=1, Status='Inactive')
--
-- Uniqueness: SerialNumber must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_SERIAL_NUMBER'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterEquipment;

DELIMITER $$

CREATE PROCEDURE SpMasterEquipment(
    IN  p_Opt                 VARCHAR(20),
    IN  p_EquipmentId         INT,
    IN  p_EquipmentName       VARCHAR(150),
    IN  p_Manufacturer        VARCHAR(100),
    IN  p_Model               VARCHAR(100),
    IN  p_SerialNumber        VARCHAR(100),
    IN  p_PurchaseDate        DATE,
    IN  p_WarrantyExpiryDate  DATE,
    IN  p_Supplier            VARCHAR(150),
    IN  p_PurchaseCost        DECIMAL(14,2),
    IN  p_CalibrationSchedule VARCHAR(20),
    IN  p_NextMaintenanceDate DATE,
    IN  p_MaintenanceVendor   VARCHAR(150),
    IN  p_LastServiceDate     DATE,
    IN  p_Hospital            VARCHAR(100),
    IN  p_Branch              VARCHAR(100),
    IN  p_Department          VARCHAR(100),
    IN  p_RoomNumber          VARCHAR(50),
    IN  p_Status              VARCHAR(20),
    IN  p_Remarks             TEXT,
    IN  p_CreatedBy           VARCHAR(100),
    IN  p_UpdatedBy           VARCHAR(100),
    IN  p_Search              VARCHAR(255),
    IN  p_ManufacturerFilter  VARCHAR(100),
    IN  p_StatusFilter        VARCHAR(20)
)
BEGIN

    -- --------------------------------------------------------
    -- GET: Fetch all non-deleted equipment
    -- --------------------------------------------------------
    IF p_Opt = 'GET' THEN
        SELECT
            EquipmentId, EquipmentCode, EquipmentName, Manufacturer, Model,
            SerialNumber, PurchaseDate, WarrantyExpiryDate, Supplier, PurchaseCost,
            CalibrationSchedule, NextMaintenanceDate, MaintenanceVendor, LastServiceDate,
            Hospital, Branch, Department, RoomNumber, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Equipment
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR EquipmentCode LIKE CONCAT('%', p_Search, '%')
            OR EquipmentName LIKE CONCAT('%', p_Search, '%')
            OR Manufacturer  LIKE CONCAT('%', p_Search, '%')
            OR Model         LIKE CONCAT('%', p_Search, '%')
            OR SerialNumber  LIKE CONCAT('%', p_Search, '%')
          )
          AND (
            p_ManufacturerFilter IS NULL OR p_ManufacturerFilter = ''
            OR Manufacturer = p_ManufacturerFilter
          )
          AND (
            p_StatusFilter IS NULL OR p_StatusFilter = ''
            OR Status = p_StatusFilter
          )
        ORDER BY EquipmentId ASC;

    -- --------------------------------------------------------
    -- GETBYID
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            EquipmentId, EquipmentCode, EquipmentName, Manufacturer, Model,
            SerialNumber, PurchaseDate, WarrantyExpiryDate, Supplier, PurchaseCost,
            CalibrationSchedule, NextMaintenanceDate, MaintenanceVendor, LastServiceDate,
            Hospital, Branch, Department, RoomNumber, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Equipment
        WHERE EquipmentId = p_EquipmentId
          AND IsDeleted = 0;

    -- --------------------------------------------------------
    -- NEXTCODE: preview next EQP code (provisional)
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('EQP-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(EquipmentCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS EquipmentCode
        FROM Master_Equipment;

    -- --------------------------------------------------------
    -- INSERT: auto-generate EQP-001, reject duplicate active serial
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_Equipment
                WHERE SerialNumber = p_SerialNumber AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SERIAL_NUMBER';
            END IF;

            SELECT COALESCE(
                MAX(CAST(SUBSTRING(EquipmentCode, 5) AS UNSIGNED)), 0
            ) + 1
            INTO v_NextNum
            FROM Master_Equipment;

            SET v_Code = CONCAT('EQP-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Equipment (
                EquipmentCode, EquipmentName, Manufacturer, Model, SerialNumber,
                PurchaseDate, WarrantyExpiryDate, Supplier, PurchaseCost,
                CalibrationSchedule, NextMaintenanceDate, MaintenanceVendor, LastServiceDate,
                Hospital, Branch, Department, RoomNumber, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_EquipmentName, p_Manufacturer, p_Model, p_SerialNumber,
                p_PurchaseDate, p_WarrantyExpiryDate, p_Supplier, p_PurchaseCost,
                p_CalibrationSchedule, p_NextMaintenanceDate, p_MaintenanceVendor, p_LastServiceDate,
                p_Hospital, p_Branch, p_Department, p_RoomNumber, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS EquipmentId, v_Code AS EquipmentCode;
        END;

    -- --------------------------------------------------------
    -- UPDATE: reject a serial used by ANOTHER active row
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_Equipment
            WHERE SerialNumber = p_SerialNumber
              AND IsDeleted = 0
              AND EquipmentId <> p_EquipmentId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SERIAL_NUMBER';
        END IF;

        UPDATE Master_Equipment
        SET
            EquipmentName       = p_EquipmentName,
            Manufacturer        = p_Manufacturer,
            Model               = p_Model,
            SerialNumber        = p_SerialNumber,
            PurchaseDate        = p_PurchaseDate,
            WarrantyExpiryDate  = p_WarrantyExpiryDate,
            Supplier            = p_Supplier,
            PurchaseCost        = p_PurchaseCost,
            CalibrationSchedule = p_CalibrationSchedule,
            NextMaintenanceDate = p_NextMaintenanceDate,
            MaintenanceVendor   = p_MaintenanceVendor,
            LastServiceDate     = p_LastServiceDate,
            Hospital            = p_Hospital,
            Branch              = p_Branch,
            Department          = p_Department,
            RoomNumber          = p_RoomNumber,
            Status              = p_Status,
            Remarks             = p_Remarks,
            UpdatedBy           = p_UpdatedBy,
            UpdatedDate         = CURRENT_TIMESTAMP
        WHERE EquipmentId = p_EquipmentId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- TOGGLESTATUS
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Equipment
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE EquipmentId = p_EquipmentId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    -- --------------------------------------------------------
    -- DELETE: soft delete
    -- --------------------------------------------------------
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Equipment
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE EquipmentId = p_EquipmentId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
