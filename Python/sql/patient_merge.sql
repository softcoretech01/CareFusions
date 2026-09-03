-- ==============================================================================
-- Patient Merge
-- ==============================================================================
-- "Merge duplicate patients" did not merge anything. The screen ran a single
--
--     DELETE /{source}/{id}      ->      DELETE FROM PatientRegistration WHERE PatientId = ?
--
-- and reported success. That is a HARD delete — no IsDeleted flag existed on the
-- table — and nothing re-pointed the duplicate's records at the surviving UHID.
-- Nothing in the database prevented it either: no foreign key references
-- PatientRegistration, so appointments, lab orders, admissions, bills and
-- documents were simply left pointing at a registration that no longer existed.
--
-- This replaces it with a real merge:
--   * every child record is moved onto the primary UHID, in one transaction;
--   * the secondary registration is SOFT deleted and stamped with the UHID it
--     was merged into, so an old reference or a printed card can still be
--     resolved instead of hitting a dead end;
--   * the caller is told exactly how many rows moved, per table.
--
-- Safe to re-run.

-- ── 1. Soft-delete + merge-trail columns on the three registration sources ────
DROP PROCEDURE IF EXISTS SpTmpAddMergeColumns;
DELIMITER $$
CREATE PROCEDURE SpTmpAddMergeColumns()
BEGIN
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_tbl VARCHAR(64);

    WHILE v_i < 3 DO
        SET v_tbl = ELT(v_i + 1, 'PatientRegistration', 'QuickRegistration', 'EmergencyRegistration');

        IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = 'registration' AND TABLE_NAME = v_tbl
                         AND COLUMN_NAME = 'IsDeleted') THEN
            SET @s = CONCAT('ALTER TABLE registration.`', v_tbl,
                            '` ADD COLUMN IsDeleted TINYINT(1) NOT NULL DEFAULT 0');
            PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                       WHERE TABLE_SCHEMA = 'registration' AND TABLE_NAME = v_tbl
                         AND COLUMN_NAME = 'MergedIntoUhid') THEN
            SET @s = CONCAT('ALTER TABLE registration.`', v_tbl,
                            '` ADD COLUMN MergedIntoUhid VARCHAR(50) NULL',
                            ', ADD COLUMN MergedDate DATETIME NULL',
                            ', ADD COLUMN MergedBy VARCHAR(100) NULL');
            PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
        END IF;

        SET v_i = v_i + 1;
    END WHILE;
END$$
DELIMITER ;
CALL SpTmpAddMergeColumns();
DROP PROCEDURE IF EXISTS SpTmpAddMergeColumns;


-- ── 2. The merge itself ──────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS registration.SpPatientMerge;
DELIMITER $$
CREATE PROCEDURE registration.SpPatientMerge(
    IN p_PrimaryUhid   VARCHAR(50),
    IN p_SecondaryUhid VARCHAR(50),
    IN p_User          VARCHAR(100)
)
BEGIN
    DECLARE v_primaryExists   INT DEFAULT 0;
    DECLARE v_secondaryExists INT DEFAULT 0;
    DECLARE v_moved           INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_PrimaryUhid IS NULL OR p_SecondaryUhid IS NULL
       OR TRIM(p_PrimaryUhid) = '' OR TRIM(p_SecondaryUhid) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MERGE_INVALID: both UHIDs are required';
    END IF;

    IF p_PrimaryUhid = p_SecondaryUhid COLLATE utf8mb4_general_ci THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MERGE_INVALID: cannot merge a patient into itself';
    END IF;

    -- A UHID can live in any of the three registration sources.
    SELECT
        (SELECT COUNT(*) FROM registration.PatientRegistration   WHERE Uhid = p_PrimaryUhid COLLATE utf8mb4_general_ci AND COALESCE(IsDeleted,0)=0)
      + (SELECT COUNT(*) FROM registration.QuickRegistration     WHERE Uhid = p_PrimaryUhid COLLATE utf8mb4_general_ci AND COALESCE(IsDeleted,0)=0)
      + (SELECT COUNT(*) FROM registration.EmergencyRegistration WHERE Uhid = p_PrimaryUhid COLLATE utf8mb4_general_ci AND COALESCE(IsDeleted,0)=0)
    INTO v_primaryExists;

    SELECT
        (SELECT COUNT(*) FROM registration.PatientRegistration   WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci AND COALESCE(IsDeleted,0)=0)
      + (SELECT COUNT(*) FROM registration.QuickRegistration     WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci AND COALESCE(IsDeleted,0)=0)
      + (SELECT COUNT(*) FROM registration.EmergencyRegistration WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci AND COALESCE(IsDeleted,0)=0)
    INTO v_secondaryExists;

    IF v_primaryExists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MERGE_INVALID: primary UHID not found';
    END IF;
    IF v_secondaryExists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MERGE_INVALID: secondary UHID not found';
    END IF;

    START TRANSACTION;

    -- ── Re-point every clinical, financial and administrative record ─────────
    -- These reference the patient by UHID string with no foreign key, which is
    -- precisely why the old delete orphaned them silently.
    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_merge_log (
        TableName VARCHAR(64), RowsMoved INT
    );
    DELETE FROM tmp_merge_log;

    UPDATE registration.Trn_Appointment    SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('registration.Trn_Appointment', ROW_COUNT());

    UPDATE registration.PatientDocument    SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('registration.PatientDocument', ROW_COUNT());

    UPDATE registration.PatientVisit       SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('registration.PatientVisit', ROW_COUNT());

    UPDATE hospital.Trn_OpdVisit           SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.Trn_OpdVisit', ROW_COUNT());

    UPDATE hospital.Lab_Order              SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.Lab_Order', ROW_COUNT());

    UPDATE hospital.Rad_Order              SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.Rad_Order', ROW_COUNT());

    UPDATE hospital.IPD_Admission          SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.IPD_Admission', ROW_COUNT());

    UPDATE hospital.IPD_AdmissionRequest   SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.IPD_AdmissionRequest', ROW_COUNT());

    UPDATE hospital.Ins_Policy             SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.Ins_Policy', ROW_COUNT());

    UPDATE hospital.Ins_PreAuth            SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.Ins_PreAuth', ROW_COUNT());

    UPDATE hospital.Ins_Claim              SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.Ins_Claim', ROW_COUNT());

    UPDATE hospital.OpBill                 SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.OpBill', ROW_COUNT());

    UPDATE hospital.IpBill                 SET Uhid = p_PrimaryUhid WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.IpBill', ROW_COUNT());

    -- Pharmacy bills identify the patient by PatientRef rather than Uhid.
    UPDATE hospital.Pharmacy_Sale          SET PatientRef = p_PrimaryUhid WHERE PatientRef = p_SecondaryUhid COLLATE utf8mb4_general_ci;
    INSERT INTO tmp_merge_log VALUES ('hospital.Pharmacy_Sale', ROW_COUNT());

    -- ── Retire the duplicate, keeping a trail back to the survivor ───────────
    UPDATE registration.PatientRegistration
    SET IsDeleted = 1, MergedIntoUhid = p_PrimaryUhid, MergedDate = NOW(), MergedBy = p_User
    WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;

    UPDATE registration.QuickRegistration
    SET IsDeleted = 1, MergedIntoUhid = p_PrimaryUhid, MergedDate = NOW(), MergedBy = p_User,
        Status = 'Merged'
    WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;

    UPDATE registration.EmergencyRegistration
    SET IsDeleted = 1, MergedIntoUhid = p_PrimaryUhid, MergedDate = NOW(), MergedBy = p_User,
        Status = 'Merged'
    WHERE Uhid = p_SecondaryUhid COLLATE utf8mb4_general_ci;

    COMMIT;

    SELECT SUM(RowsMoved) INTO v_moved FROM tmp_merge_log;

    SELECT p_PrimaryUhid AS PrimaryUhid,
           p_SecondaryUhid AS SecondaryUhid,
           COALESCE(v_moved, 0) AS RecordsMoved;
    SELECT TableName, RowsMoved FROM tmp_merge_log WHERE RowsMoved > 0 ORDER BY TableName;

    DROP TEMPORARY TABLE IF EXISTS tmp_merge_log;
END$$
DELIMITER ;
