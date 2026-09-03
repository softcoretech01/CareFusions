import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

with engine.connect() as con:
    sp_drop = "DROP PROCEDURE IF EXISTS SpMasterAppointmentStatus"
    sp_create = """
CREATE PROCEDURE SpMasterAppointmentStatus (
    IN p_Opt                    VARCHAR(20),
    IN p_StatusId               INT,

    IN p_StatusCode             VARCHAR(50),
    IN p_StatusName             VARCHAR(100),
    IN p_DisplayOrder           INT,
    IN p_Description            VARCHAR(255),
    IN p_IsDefault              TINYINT(1),
    IN p_IsFinal                TINYINT(1),
    IN p_AllowReschedule        TINYINT(1),
    IN p_AllowCancellation      TINYINT(1),

    IN p_Status                 VARCHAR(20),
    IN p_Remarks                TEXT,
    IN p_CreatedBy              VARCHAR(100),
    IN p_ModifiedBy             VARCHAR(100),

    IN p_Search                 VARCHAR(255)
)
BEGIN
    -- ==================================================================
    -- GET (All active)
    -- ==================================================================
    IF p_Opt = 'GET' THEN
        SELECT
            StatusId, StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_AppointmentStatus
        WHERE IsDeleted = 0
        ORDER BY DisplayOrder ASC;

    -- ==================================================================
    -- GETBYID
    -- ==================================================================
    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            StatusId, StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_AppointmentStatus
        WHERE StatusId = p_StatusId AND IsDeleted = 0;

    -- ==================================================================
    -- SEARCH
    -- ==================================================================
    ELSEIF p_Opt = 'SEARCH' THEN
        SELECT
            StatusId, StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks,
            CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
        FROM Master_AppointmentStatus
        WHERE IsDeleted = 0
          AND (
            StatusCode LIKE CONCAT('%', p_Search, '%') OR
            StatusName LIKE CONCAT('%', p_Search, '%')
          )
        ORDER BY DisplayOrder ASC;

    -- ==================================================================
    -- GETNEXTCODE
    -- ==================================================================
    ELSEIF p_Opt = 'GETNEXTCODE' THEN
        SELECT CONCAT('AST-', LPAD(COALESCE(MAX(StatusId), 0) + 1, 3, '0')) AS NextCode
        FROM Master_AppointmentStatus;

    -- ==================================================================
    -- INSERT
    -- ==================================================================
    ELSEIF p_Opt = 'INSERT' THEN
        SELECT COALESCE(MAX(StatusId), 0) + 1 INTO @v_NextId FROM Master_AppointmentStatus;
        SET @v_StatCode = CONCAT('AST-', LPAD(@v_NextId, 3, '0'));

        INSERT INTO Master_AppointmentStatus (
            StatusCode, StatusName, DisplayOrder, Description,
            IsDefault, IsFinal, AllowReschedule, AllowCancellation,
            Status, Remarks, CreatedBy, CreatedDate, IsDeleted
        ) VALUES (
            @v_StatCode, p_StatusName, p_DisplayOrder, p_Description,
            p_IsDefault, p_IsFinal, p_AllowReschedule, p_AllowCancellation,
            p_Status, p_Remarks, p_CreatedBy, CURRENT_TIMESTAMP, 0
        );

        SELECT LAST_INSERT_ID() AS StatusId;

    -- ==================================================================
    -- UPDATE
    -- ==================================================================
    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE Master_AppointmentStatus
        SET
            StatusCode          = p_StatusCode,
            StatusName          = p_StatusName,
            DisplayOrder        = p_DisplayOrder,
            Description         = p_Description,
            IsDefault           = p_IsDefault,
            IsFinal             = p_IsFinal,
            AllowReschedule     = p_AllowReschedule,
            AllowCancellation   = p_AllowCancellation,
            Status              = p_Status,
            Remarks             = p_Remarks,
            ModifiedDate        = CURRENT_TIMESTAMP,
            ModifiedBy          = p_ModifiedBy
        WHERE StatusId = p_StatusId;

    -- ==================================================================
    -- DELETE (Soft Delete)
    -- ==================================================================
    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_AppointmentStatus
        SET
            IsDeleted    = 1,
            ModifiedDate = CURRENT_TIMESTAMP,
            ModifiedBy   = p_ModifiedBy
        WHERE StatusId = p_StatusId;

    END IF;

END
    """
    con.execute(text(sp_drop))
    con.execute(text(sp_create))
    
    con.commit()
    print("SP Updated!")
