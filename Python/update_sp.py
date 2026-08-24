from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
sql = """
CREATE OR REPLACE PROCEDURE admin.SpDoctorSchedule(
    IN p_Opt          VARCHAR(20),
    IN p_DoctorId     INT,
    IN p_AvailableDays VARCHAR(100),
    IN p_FromTime     VARCHAR(8),
    IN p_ToTime       VARCHAR(8),
    IN p_BreakFrom    VARCHAR(8),
    IN p_BreakTo      VARCHAR(8),
    IN p_SlotDuration INT,
    IN p_MaxPatients  INT,
    IN p_LeaveDate    DATE,
    IN p_Reason       VARCHAR(255)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT
            h.DoctorId,
            h.DoctorName,
            COALESCE(p.DepartmentName, '') AS Department,
            s.AvailableDays,
            s.FromTime,
            s.ToTime,
            s.BreakFrom,
            s.BreakTo,
            s.SlotDuration,
            s.MaxPatients
        FROM Master_Doctor_Header h
        LEFT JOIN Master_DoctorProfessional_Detail p ON p.DoctorId = h.DoctorId
        LEFT JOIN Master_DoctorSchedule_Detail     s ON s.DoctorId = h.DoctorId
        WHERE h.IsDeleted = 0 AND h.Status = 'Active'
        ORDER BY h.DoctorName;

    ELSEIF p_Opt = 'LEAVES' THEN
        SELECT LeaveId, DoctorId, LeaveDate, Reason
        FROM Master_DoctorLeave_Detail
        ORDER BY DoctorId, LeaveDate;

    ELSEIF p_Opt = 'SAVE' THEN
        INSERT INTO Master_DoctorSchedule_Detail (
            DoctorId, AvailableDays, FromTime, ToTime,
            BreakFrom, BreakTo, SlotDuration, MaxPatients,
            AvailableEmergency, AvailableTele
        ) VALUES (
            p_DoctorId, p_AvailableDays, p_FromTime, p_ToTime,
            NULLIF(p_BreakFrom, ''), NULLIF(p_BreakTo, ''), p_SlotDuration, p_MaxPatients,
            0, 0
        )
        ON DUPLICATE KEY UPDATE
            AvailableDays = VALUES(AvailableDays),
            FromTime      = VALUES(FromTime),
            ToTime        = VALUES(ToTime),
            BreakFrom     = VALUES(BreakFrom),
            BreakTo       = VALUES(BreakTo),
            SlotDuration  = VALUES(SlotDuration),
            MaxPatients   = VALUES(MaxPatients);
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELLEAVESALL' THEN
        DELETE FROM Master_DoctorLeave_Detail WHERE DoctorId = p_DoctorId;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'ADDLEAVE' THEN
        INSERT INTO Master_DoctorLeave_Detail (DoctorId, LeaveDate, Reason)
        VALUES (p_DoctorId, p_LeaveDate, p_Reason)
        ON DUPLICATE KEY UPDATE Reason = VALUES(Reason);
        SELECT LAST_INSERT_ID() AS LeaveId;
    END IF;
END
"""
db.execute(text(sql))
db.commit()
print('Success')
