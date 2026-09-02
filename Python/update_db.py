import urllib.parse
from sqlalchemy import create_engine, text
from app.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD

# The ipd.sql uses 'hospital' database explicitly
url = f'mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD) if DB_PASSWORD else ""}@{DB_HOST}:{DB_PORT}/hospital'
engine = create_engine(url)

alter_sql = """
ALTER TABLE hospital.IPD_AdmissionRequest
ADD COLUMN AdmissionReason VARCHAR(500) NULL AFTER ProvisionalDiagnosis;
"""

sp_sql = """
DROP PROCEDURE IF EXISTS hospital.SpIpdAdmissionRequest;
"""

create_sp_sql = """
CREATE PROCEDURE hospital.SpIpdAdmissionRequest(
    IN p_Opt VARCHAR(20),
    IN p_RequestId INT,
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_Specialty VARCHAR(100),
    IN p_AdmissionType VARCHAR(50),
    IN p_Priority VARCHAR(20),
    IN p_ProvisionalDiagnosis VARCHAR(500),
    IN p_AdmissionReason VARCHAR(500),
    IN p_RequestedBy VARCHAR(150),
    IN p_Status VARCHAR(20),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT RequestId, RequestDate, Uhid, PatientName, Specialty, AdmissionType, Priority,
               ProvisionalDiagnosis, AdmissionReason, RequestedBy, Status
        FROM IPD_AdmissionRequest
        WHERE IsDeleted = 0
        ORDER BY CASE Status WHEN 'Pending' THEN 1 WHEN 'Admitted' THEN 2 ELSE 3 END, RequestId DESC;

    ELSEIF p_Opt = 'INSERT' THEN
        INSERT INTO IPD_AdmissionRequest (Uhid, PatientName, Specialty, AdmissionType, Priority,
                                          ProvisionalDiagnosis, AdmissionReason, RequestedBy, Status, CreatedBy)
        VALUES (p_Uhid, p_PatientName, p_Specialty, p_AdmissionType, p_Priority,
                p_ProvisionalDiagnosis, p_AdmissionReason, p_RequestedBy, 'Pending', p_User);
        SELECT LAST_INSERT_ID() AS RequestId;

    ELSEIF p_Opt = 'UPDATESTATUS' THEN
        UPDATE IPD_AdmissionRequest SET Status = p_Status, UpdatedBy = p_User
        WHERE RequestId = p_RequestId;
        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END
"""

with engine.connect() as conn:
    try:
        conn.execute(text(alter_sql))
        print("ALTER TABLE SUCCESS")
    except Exception as e:
        print("ALTER TABLE ERROR (might already exist):", e)
    
    conn.execute(text(sp_sql))
    print("DROP SP SUCCESS")
    
    conn.execute(text(create_sp_sql))
    print("CREATE SP SUCCESS")
    conn.commit()
