-- ============================================================
-- Appointment (transaction) - SQL Script
-- Database : registration
-- Table    : registration.Trn_Appointment
-- SP       : registration.SpAppointment
-- Screens  : /appointments/online-booking, /appointments (list, queue, waiting…)
--
-- The server owns AppointmentNumber (APT-YYYYMMNNN, resets monthly) and the
-- department-based QueueToken (e.g. CAR-001) — both generated at INSERT.
--
-- NOTE: object names are fully qualified with `registration.` so this script
-- deploys to the registration DB even when the connection's default schema is
-- admin. The stored-procedure body uses unqualified table names, which MySQL
-- resolves to the procedure's own schema (registration).
-- ============================================================

USE registration;

-- ============================================================
-- TABLE: registration.Trn_Appointment
-- ============================================================
CREATE TABLE IF NOT EXISTS registration.Trn_Appointment (
    AppointmentId     INT           NOT NULL AUTO_INCREMENT,
    AppointmentNumber VARCHAR(20)   NOT NULL,           -- Auto: APT-YYYYMMNNN
    Uhid              VARCHAR(30)    NOT NULL,
    PatientName       VARCHAR(150)  NOT NULL,
    MobileNumber      VARCHAR(20)    NULL,
    Department        VARCHAR(100)  NOT NULL,
    Doctor            VARCHAR(150)   NULL,
    AppointmentDate   DATE          NOT NULL,
    TimeSlot          VARCHAR(20)    NULL,
    DurationMinutes   INT           NOT NULL DEFAULT 15,
    Type              VARCHAR(30)   NOT NULL DEFAULT 'Standard',
    Priority          VARCHAR(20)   NOT NULL DEFAULT 'Normal',
    Status            VARCHAR(20)   NOT NULL DEFAULT 'Scheduled',
    QueueToken        VARCHAR(20)    NULL,
    Notes             TEXT           NULL,

    -- Audit
    CreatedBy         VARCHAR(100)   NULL,
    CreatedDate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy         VARCHAR(100)   NULL,
    UpdatedDate       DATETIME       NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted         TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Trn_Appointment PRIMARY KEY (AppointmentId),
    CONSTRAINT UQ_Appointment_Number UNIQUE (AppointmentNumber),

    KEY IDX_Appt_Uhid    (Uhid),
    KEY IDX_Appt_Date    (AppointmentDate),
    KEY IDX_Appt_Dept    (Department),
    KEY IDX_Appt_Doctor  (Doctor),
    KEY IDX_Appt_Status  (Status),
    KEY IDX_Appt_Type    (Type),
    KEY IDX_Appt_Deleted (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpAppointment
-- p_Opt: GET | GETBYID | NEXTNUMBER | INSERT | UPDATE | UPDATESTATUS | SETTOKEN | DELETE
-- ============================================================
DROP PROCEDURE IF EXISTS registration.SpAppointment;

DELIMITER $$

CREATE PROCEDURE registration.SpAppointment(
    IN  p_Opt             VARCHAR(20),
    IN  p_AppointmentId   INT,
    IN  p_Uhid            VARCHAR(30),
    IN  p_PatientName     VARCHAR(150),
    IN  p_MobileNumber    VARCHAR(20),
    IN  p_Department      VARCHAR(100),
    IN  p_Doctor          VARCHAR(150),
    IN  p_AppointmentDate DATE,
    IN  p_TimeSlot        VARCHAR(20),
    IN  p_DurationMinutes INT,
    IN  p_Type            VARCHAR(30),
    IN  p_Priority        VARCHAR(20),
    IN  p_Status          VARCHAR(20),
    IN  p_QueueToken      VARCHAR(20),
    IN  p_Notes           TEXT,
    IN  p_CreatedBy       VARCHAR(100),
    IN  p_UpdatedBy       VARCHAR(100),
    IN  p_Search          VARCHAR(255),
    IN  p_DeptFilter      VARCHAR(100),
    IN  p_StatusFilter    VARCHAR(20),
    IN  p_TypeFilter      VARCHAR(30),
    IN  p_DateFilter      VARCHAR(20),
    IN  p_DateFrom        VARCHAR(20),
    IN  p_DateTo          VARCHAR(20),
    IN  p_ExcludeType     VARCHAR(30)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            AppointmentId, AppointmentNumber, Uhid, PatientName, MobileNumber, Department,
            Doctor, AppointmentDate, TimeSlot, DurationMinutes, Type, Priority, Status,
            QueueToken, Notes, CreatedDate, UpdatedDate
        FROM Trn_Appointment
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR AppointmentNumber LIKE CONCAT('%', p_Search, '%')
            OR Uhid              LIKE CONCAT('%', p_Search, '%')
            OR PatientName       LIKE CONCAT('%', p_Search, '%')
            OR MobileNumber      LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_DeptFilter   IS NULL OR p_DeptFilter   = '' OR Department = p_DeptFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status     = p_StatusFilter)
          AND (p_TypeFilter   IS NULL OR p_TypeFilter   = '' OR Type       = p_TypeFilter)
          AND (p_ExcludeType  IS NULL OR p_ExcludeType  = '' OR Type      <> p_ExcludeType)
          AND (p_DateFilter   IS NULL OR p_DateFilter   = '' OR AppointmentDate = p_DateFilter)
          AND (p_DateFrom     IS NULL OR p_DateFrom     = '' OR AppointmentDate >= p_DateFrom)
          AND (p_DateTo       IS NULL OR p_DateTo       = '' OR AppointmentDate <= p_DateTo)
        ORDER BY AppointmentId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            AppointmentId, AppointmentNumber, Uhid, PatientName, MobileNumber, Department,
            Doctor, AppointmentDate, TimeSlot, DurationMinutes, Type, Priority, Status,
            QueueToken, Notes, CreatedDate, UpdatedDate
        FROM Trn_Appointment
        WHERE AppointmentId = p_AppointmentId AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTNUMBER' THEN
        SELECT CONCAT('APT-', DATE_FORMAT(NOW(), '%Y%m'), LPAD(
            COALESCE(MAX(CAST(SUBSTRING(AppointmentNumber, 11) AS UNSIGNED)), 0) + 1, 3, '0'
        )) AS AppointmentNumber
        FROM Trn_Appointment
        WHERE AppointmentNumber LIKE CONCAT('APT-', DATE_FORMAT(NOW(), '%Y%m'), '%');

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_Prefix   VARCHAR(6);
            DECLARE v_MonStr   CHAR(6);
            DECLARE v_Seq      INT DEFAULT 1;
            DECLARE v_Number   VARCHAR(20);
            DECLARE v_TokSeq   INT DEFAULT 1;
            DECLARE v_Token    VARCHAR(20);

            -- Appointment number: APT-YYYYMM + monthly sequence
            SET v_MonStr = DATE_FORMAT(NOW(), '%Y%m');
            SELECT COALESCE(MAX(CAST(SUBSTRING(AppointmentNumber, 11) AS UNSIGNED)), 0) + 1
              INTO v_Seq
              FROM Trn_Appointment
             WHERE AppointmentNumber LIKE CONCAT('APT-', v_MonStr, '%');
            SET v_Number = CONCAT('APT-', v_MonStr, LPAD(v_Seq, 3, '0'));

            -- Department-based queue token
            SET v_Prefix = CASE p_Department
                WHEN 'Cardiology'       THEN 'CAR'
                WHEN 'General Medicine' THEN 'GEN'
                WHEN 'Orthopedics'      THEN 'ORT'
                WHEN 'Pediatrics'       THEN 'PED'
                WHEN 'Dermatology'      THEN 'DER'
                WHEN 'Neurology'        THEN 'NEU'
                WHEN 'Emergency'        THEN 'EMR'
                WHEN 'Ophthalmology'    THEN 'OPH'
                WHEN 'ENT'              THEN 'ENT'
                WHEN 'Gynecology'       THEN 'GYN'
                ELSE UPPER(LEFT(COALESCE(p_Department, 'GEN'), 3))
            END;
            SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(QueueToken, '-', -1) AS UNSIGNED)), 0) + 1
              INTO v_TokSeq
              FROM Trn_Appointment
             WHERE QueueToken LIKE CONCAT(v_Prefix, '-%') AND IsDeleted = 0;
            SET v_Token = CONCAT(v_Prefix, '-', LPAD(v_TokSeq, 3, '0'));

            INSERT INTO Trn_Appointment (
                AppointmentNumber, Uhid, PatientName, MobileNumber, Department, Doctor,
                AppointmentDate, TimeSlot, DurationMinutes, Type, Priority, Status,
                QueueToken, Notes, CreatedBy
            ) VALUES (
                v_Number, p_Uhid, p_PatientName, p_MobileNumber, p_Department, p_Doctor,
                p_AppointmentDate, p_TimeSlot, p_DurationMinutes, p_Type, p_Priority, p_Status,
                v_Token, p_Notes, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS AppointmentId, v_Number AS AppointmentNumber, v_Token AS QueueToken;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Trn_Appointment
        SET
            PatientName     = p_PatientName,
            MobileNumber    = p_MobileNumber,
            Department      = p_Department,
            Doctor          = p_Doctor,
            AppointmentDate = p_AppointmentDate,
            TimeSlot        = p_TimeSlot,
            DurationMinutes = COALESCE(p_DurationMinutes, DurationMinutes),
            Type            = p_Type,
            Priority        = p_Priority,
            Status          = p_Status,
            Notes           = p_Notes,
            UpdatedBy       = p_UpdatedBy,
            UpdatedDate     = CURRENT_TIMESTAMP
        WHERE AppointmentId = p_AppointmentId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'UPDATESTATUS' THEN
        UPDATE Trn_Appointment
        SET Status = p_Status, UpdatedBy = p_UpdatedBy, UpdatedDate = CURRENT_TIMESTAMP
        WHERE AppointmentId = p_AppointmentId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'SETTOKEN' THEN
        UPDATE Trn_Appointment
        SET QueueToken = p_QueueToken, UpdatedBy = p_UpdatedBy, UpdatedDate = CURRENT_TIMESTAMP
        WHERE AppointmentId = p_AppointmentId AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Trn_Appointment
        SET IsDeleted = 1, UpdatedBy = p_UpdatedBy, UpdatedDate = CURRENT_TIMESTAMP
        WHERE AppointmentId = p_AppointmentId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
