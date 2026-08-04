-- ============================================================
-- Doctor Schedule (appointment side) - SQL Script
-- Database : admin
-- Tables   : admin.Master_DoctorSchedule_Detail  (extended: Session2 + MaxPatients)
--            admin.Master_DoctorLeave_Detail     (new: per-doctor leaves)
-- SP       : admin.SpDoctorSchedule
-- Screen   : /appointments/schedules  (Doctor Schedules)
--
-- Doctor identity + department come from the Doctor master:
--   Master_Doctor_Header (name)  +  Master_DoctorProfessional_Detail (DepartmentName)
--
-- NOTE: the Session2From / Session2To / MaxPatients columns are added to
-- Master_DoctorSchedule_Detail by init_db.py / the migration (MySQL has no
-- ADD COLUMN IF NOT EXISTS), so they exist before this SP is created.
-- ============================================================

USE admin;

-- ── Per-doctor leaves / exceptions ───────────────────────────
CREATE TABLE IF NOT EXISTS Master_DoctorLeave_Detail (
    LeaveId    INT          NOT NULL AUTO_INCREMENT,
    DoctorId   INT          NOT NULL,
    LeaveDate  DATE         NOT NULL,
    Reason     VARCHAR(255) NULL,
    CreatedDate DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT PK_DoctorLeave PRIMARY KEY (LeaveId),
    CONSTRAINT UQ_DoctorLeave UNIQUE (DoctorId, LeaveDate),
    KEY IDX_DoctorLeave_Doctor (DoctorId)
);


-- ============================================================
-- STORED PROCEDURE: SpDoctorSchedule
-- p_Opt: LIST | LEAVES | SAVE | DELLEAVESALL | ADDLEAVE
-- ============================================================
DROP PROCEDURE IF EXISTS SpDoctorSchedule;

DELIMITER $$

CREATE PROCEDURE SpDoctorSchedule(
    IN p_Opt          VARCHAR(20),
    IN p_DoctorId     INT,
    IN p_AvailableDays VARCHAR(100),
    IN p_FromTime     VARCHAR(8),
    IN p_ToTime       VARCHAR(8),
    IN p_Session2From VARCHAR(8),
    IN p_Session2To   VARCHAR(8),
    IN p_SlotDuration INT,
    IN p_MaxPatients  INT,
    IN p_LeaveDate    DATE,
    IN p_Reason       VARCHAR(255)
)
BEGIN

    -- All active doctors + department + their schedule (if any).
    IF p_Opt = 'LIST' THEN
        SELECT
            h.DoctorId,
            h.DoctorName,
            COALESCE(p.DepartmentName, '') AS Department,
            s.AvailableDays,
            s.FromTime,
            s.ToTime,
            s.Session2From,
            s.Session2To,
            s.SlotDuration,
            s.MaxPatients
        FROM Master_Doctor_Header h
        LEFT JOIN Master_DoctorProfessional_Detail p ON p.DoctorId = h.DoctorId
        LEFT JOIN Master_DoctorSchedule_Detail     s ON s.DoctorId = h.DoctorId
        WHERE h.IsDeleted = 0 AND h.Status = 'Active'
        ORDER BY h.DoctorName;

    -- All leaves (router merges them into each doctor by id).
    ELSEIF p_Opt = 'LEAVES' THEN
        SELECT LeaveId, DoctorId, LeaveDate, Reason
        FROM Master_DoctorLeave_Detail
        ORDER BY DoctorId, LeaveDate;

    -- Upsert the schedule row for one doctor.
    ELSEIF p_Opt = 'SAVE' THEN
        INSERT INTO Master_DoctorSchedule_Detail (
            DoctorId, AvailableDays, FromTime, ToTime,
            Session2From, Session2To, SlotDuration, MaxPatients,
            AvailableEmergency, AvailableTele
        ) VALUES (
            p_DoctorId, p_AvailableDays, p_FromTime, p_ToTime,
            NULLIF(p_Session2From, ''), NULLIF(p_Session2To, ''), p_SlotDuration, p_MaxPatients,
            0, 0
        )
        ON DUPLICATE KEY UPDATE
            AvailableDays = VALUES(AvailableDays),
            FromTime      = VALUES(FromTime),
            ToTime        = VALUES(ToTime),
            Session2From  = VALUES(Session2From),
            Session2To    = VALUES(Session2To),
            SlotDuration  = VALUES(SlotDuration),
            MaxPatients   = VALUES(MaxPatients);
        SELECT ROW_COUNT() AS AffectedRows;

    -- Replace-all helper: clear a doctor's leaves before re-inserting.
    ELSEIF p_Opt = 'DELLEAVESALL' THEN
        DELETE FROM Master_DoctorLeave_Detail WHERE DoctorId = p_DoctorId;
        SELECT ROW_COUNT() AS AffectedRows;

    -- Add one leave for a doctor.
    ELSEIF p_Opt = 'ADDLEAVE' THEN
        INSERT INTO Master_DoctorLeave_Detail (DoctorId, LeaveDate, Reason)
        VALUES (p_DoctorId, p_LeaveDate, p_Reason)
        ON DUPLICATE KEY UPDATE Reason = VALUES(Reason);
        SELECT LAST_INSERT_ID() AS LeaveId;

    END IF;

END$$

DELIMITER ;
