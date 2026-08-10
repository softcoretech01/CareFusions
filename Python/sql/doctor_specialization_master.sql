-- ============================================================
-- Doctor Specialization Master - SQL Script
-- Database : admin
-- Table    : Master_DoctorSpecialization
-- SP       : SpMasterDoctorSpecialization
-- Screen   : /admin/masters/doctor-specialization
--
-- Doctor.Specialization was a free-text field, so "Cardiologist",
-- "cardiologist" and "Cardiology" all became separate values and the
-- specialization filter on Doctor Master listed whatever anyone had typed.
-- This master is the controlled list that field now picks from.
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_DoctorSpecialization
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_DoctorSpecialization (
    SpecializationId   INT           NOT NULL AUTO_INCREMENT,
    SpecializationCode VARCHAR(20)   NOT NULL,            -- Auto-generated: DS-001
    SpecializationName VARCHAR(100)  NOT NULL,
    -- Which clinical department this specialization normally sits under.
    -- Free text rather than an FK: Master_Department is per-branch, and a
    -- specialization is hospital-wide.
    DepartmentName     VARCHAR(100)  NULL,
    Description        VARCHAR(500)  NULL,
    Status             ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',

    -- Audit
    CreatedBy          VARCHAR(100)  NULL,
    CreatedDate        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy          VARCHAR(100)  NULL,
    UpdatedDate        DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted          TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_DoctorSpecialization PRIMARY KEY (SpecializationId),
    CONSTRAINT UQ_DoctorSpecialization_Code UNIQUE (SpecializationCode),
    -- NOTE: SpecializationName uniqueness is enforced in the SP for
    -- non-deleted rows only, so a deleted name can be reused.

    KEY IDX_DocSpec_Name      (SpecializationName),
    KEY IDX_DocSpec_Status    (Status),
    KEY IDX_DocSpec_IsDeleted (IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterDoctorSpecialization
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: SpecializationName must be unique among NON-DELETED rows.
--   duplicate -> SQLSTATE '45000' MESSAGE_TEXT = 'DUPLICATE_SPECIALIZATION_NAME'
-- Referential guard: a specialization still named by a non-deleted doctor
--   cannot be deleted or deactivated -> 'SPECIALIZATION_IN_USE'
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterDoctorSpecialization;

DELIMITER $$

CREATE PROCEDURE SpMasterDoctorSpecialization(
    IN  p_Opt                VARCHAR(20),
    IN  p_SpecializationId   INT,
    IN  p_SpecializationName VARCHAR(100),
    IN  p_DepartmentName     VARCHAR(100),
    IN  p_Description        VARCHAR(500),
    IN  p_Status             VARCHAR(20),
    IN  p_CreatedBy          VARCHAR(100),
    IN  p_UpdatedBy          VARCHAR(100),
    IN  p_Search             VARCHAR(255),
    IN  p_StatusFilter       VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            SpecializationId, SpecializationCode, SpecializationName,
            DepartmentName, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_DoctorSpecialization
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR SpecializationCode LIKE CONCAT('%', p_Search, '%')
            OR SpecializationName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status = p_StatusFilter)
        ORDER BY SpecializationName ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            SpecializationId, SpecializationCode, SpecializationName,
            DepartmentName, Description, Status,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_DoctorSpecialization
        WHERE SpecializationId = p_SpecializationId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('DS-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(SpecializationCode, 4) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS SpecializationCode
        FROM Master_DoctorSpecialization;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (
                SELECT 1 FROM Master_DoctorSpecialization
                WHERE SpecializationName = p_SpecializationName AND IsDeleted = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SPECIALIZATION_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(SpecializationCode, 4) AS UNSIGNED)), 0) + 1
              INTO v_NextNum
              FROM Master_DoctorSpecialization;

            SET v_Code = CONCAT('DS-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_DoctorSpecialization (
                SpecializationCode, SpecializationName, DepartmentName,
                Description, Status, CreatedBy
            ) VALUES (
                v_Code, p_SpecializationName, p_DepartmentName,
                p_Description, p_Status, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS SpecializationId, v_Code AS SpecializationCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM Master_DoctorSpecialization
            WHERE SpecializationName = p_SpecializationName
              AND IsDeleted = 0
              AND SpecializationId <> p_SpecializationId
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_SPECIALIZATION_NAME';
        END IF;

        UPDATE Master_DoctorSpecialization
        SET
            SpecializationName = p_SpecializationName,
            DepartmentName     = p_DepartmentName,
            Description        = p_Description,
            Status             = p_Status,
            UpdatedBy          = p_UpdatedBy,
            UpdatedDate        = CURRENT_TIMESTAMP
        WHERE SpecializationId = p_SpecializationId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        -- Retiring a specialization that doctors are still filed under would
        -- drop it out of the picker while their records still name it.
        IF EXISTS (
            SELECT 1
            FROM Master_DoctorProfessional_Detail p
            JOIN Master_Doctor_Header h        ON h.DoctorId = p.DoctorId
            JOIN Master_DoctorSpecialization s ON s.SpecializationName = p.Specialization
            WHERE s.SpecializationId = p_SpecializationId
              AND s.Status = 'Active'
              AND h.IsDeleted = 0
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SPECIALIZATION_IN_USE';
        END IF;

        UPDATE Master_DoctorSpecialization
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SpecializationId = p_SpecializationId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        IF EXISTS (
            SELECT 1
            FROM Master_DoctorProfessional_Detail p
            JOIN Master_Doctor_Header h        ON h.DoctorId = p.DoctorId
            JOIN Master_DoctorSpecialization s ON s.SpecializationName = p.Specialization
            WHERE s.SpecializationId = p_SpecializationId
              AND h.IsDeleted = 0
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SPECIALIZATION_IN_USE';
        END IF;

        UPDATE Master_DoctorSpecialization
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE SpecializationId = p_SpecializationId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;


-- ============================================================
-- SEED: the specializations already typed into Master_Doctor, so the
-- picker starts out able to represent every doctor on file.
-- ============================================================
INSERT INTO Master_DoctorSpecialization (SpecializationCode, SpecializationName, Status, CreatedBy)
SELECT
    CONCAT('DS-', LPAD(
        (SELECT COALESCE(MAX(CAST(SUBSTRING(SpecializationCode, 4) AS UNSIGNED)), 0)
           FROM Master_DoctorSpecialization) + ROW_NUMBER() OVER (ORDER BY d.Specialization),
        3, '0')),
    d.Specialization,
    'Active',
    'Seed'
FROM (
    SELECT DISTINCT TRIM(p.Specialization) AS Specialization
    FROM Master_DoctorProfessional_Detail p
    JOIN Master_Doctor_Header h ON h.DoctorId = p.DoctorId
    WHERE h.IsDeleted = 0
      AND p.Specialization IS NOT NULL
      AND TRIM(p.Specialization) <> ''
) d
WHERE NOT EXISTS (
    SELECT 1 FROM Master_DoctorSpecialization s
    WHERE s.SpecializationName = d.Specialization
);
