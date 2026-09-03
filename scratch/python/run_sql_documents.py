import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def execute_sql_file():
    part1 = """
    CREATE TABLE IF NOT EXISTS registration.PatientDocument (
        DocumentId INT AUTO_INCREMENT PRIMARY KEY,
        Uhid VARCHAR(20),
        DocumentType VARCHAR(50),
        DocumentName VARCHAR(250),
        FilePath VARCHAR(500),
        Size VARCHAR(20),
        UploadedBy VARCHAR(50),
        UploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_uhid (Uhid)
    );
    """
    
    part2 = """
    DROP PROCEDURE IF EXISTS registration.SpPatientDocument;
    """

    part3 = """
    CREATE PROCEDURE registration.SpPatientDocument(
        IN p_Opt VARCHAR(20),
        IN p_DocumentId INT,
        IN p_Uhid VARCHAR(20),
        IN p_DocumentType VARCHAR(50),
        IN p_DocumentName VARCHAR(250),
        IN p_FilePath VARCHAR(500),
        IN p_Size VARCHAR(20),
        IN p_UploadedBy VARCHAR(50)
    )
    BEGIN
        IF p_Opt = 'SELECT_BY_UHID' THEN
            SELECT * FROM registration.PatientDocument WHERE Uhid = p_Uhid ORDER BY DocumentId DESC;
            
        ELSEIF p_Opt = 'INSERT' THEN
            INSERT INTO registration.PatientDocument (
                Uhid, DocumentType, DocumentName, FilePath, Size, UploadedBy
            ) VALUES (
                p_Uhid, p_DocumentType, p_DocumentName, p_FilePath, p_Size, p_UploadedBy
            );
            
            SELECT * FROM registration.PatientDocument WHERE DocumentId = LAST_INSERT_ID();
            
        ELSEIF p_Opt = 'DELETE' THEN
            DELETE FROM registration.PatientDocument WHERE DocumentId = p_DocumentId;
            SELECT ROW_COUNT() as affected_rows;
        END IF;
    END;
    """

    with engine.begin() as conn:
        print("Executing Table Creation...")
        conn.execute(text(part1))
        
        print("Executing Drop Procedure...")
        conn.execute(text(part2))
        
        print("Executing Create Procedure...")
        conn.execute(text(part3))
        
        print("Successfully created PatientDocument table and SpPatientDocument in `registration` DB!")

if __name__ == '__main__':
    execute_sql_file()
