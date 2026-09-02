import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "root")
DB_PORT = int(os.environ.get("DB_PORT", 3306))
DB_NAME = "hospital"

connection = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=True
)

def apply():
    with connection.cursor() as cursor:
        try:
            # Map existing 'Covered' to 'Insurance'
            print("Mapping existing InsuranceStatus to prevent data loss...")
            cursor.execute("UPDATE IPD_Admission SET InsuranceStatus = 'APPROVED' WHERE InsuranceStatus = 'Covered'")
            cursor.execute("UPDATE IPD_Admission SET InsuranceStatus = 'NOT_APPLICABLE' WHERE InsuranceStatus = 'Self Pay'")
            cursor.execute("UPDATE IPD_Admission SET InsuranceStatus = 'NOT_APPLICABLE' WHERE InsuranceStatus IS NULL OR InsuranceStatus = ''")
            # Update any other unknown values
            cursor.execute("UPDATE IPD_Admission SET InsuranceStatus = 'NOT_APPLICABLE' WHERE InsuranceStatus NOT IN ('APPROVED', 'NOT_APPLICABLE')")
            
            # Alter table
            print("Altering IPD_Admission table...")
            alter_query = """
            ALTER TABLE IPD_Admission 
            DROP COLUMN IF EXISTS FinancialCoverageType,
            DROP COLUMN IF EXISTS InsurancePolicyId,
            DROP COLUMN IF EXISTS InsuranceAuthorizationNumber,
            DROP COLUMN IF EXISTS InsuranceAuthStatus,
            DROP COLUMN IF EXISTS InsuranceApprovedAmount,
            DROP COLUMN IF EXISTS CoveragePercentage,
            DROP COLUMN IF EXISTS PatientCoPay,
            DROP COLUMN IF EXISTS Deductible,
            DROP COLUMN IF EXISTS NonCoveredAmount,
            CHANGE COLUMN InsuranceStatus InsuranceStatus ENUM('NOT_APPLICABLE','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NOT_APPLICABLE',
            ADD COLUMN CoverageType ENUM('Self Pay','Insurance') NOT NULL DEFAULT 'Self Pay' AFTER AdmissionReason,
            ADD COLUMN FinancialStatus ENUM('PENDING','ADVANCE_PENDING','PARTIALLY_PAID','READY_FOR_DISCHARGE','FULLY_PAID','REFUND_PENDING','CLEARED') NOT NULL DEFAULT 'PENDING' AFTER InsuranceStatus,
            ADD COLUMN InsuranceCompany VARCHAR(150) NULL AFTER FinancialStatus,
            ADD COLUMN TPA VARCHAR(150) NULL AFTER InsuranceCompany,
            ADD COLUMN PolicyNumber VARCHAR(100) NULL AFTER TPA,
            ADD COLUMN MemberID VARCHAR(100) NULL AFTER PolicyNumber,
            ADD COLUMN PolicyHolderName VARCHAR(150) NULL AFTER MemberID,
            ADD COLUMN Relationship VARCHAR(50) NULL AFTER PolicyHolderName,
            ADD COLUMN PolicyStartDate DATE NULL AFTER Relationship,
            ADD COLUMN PolicyEndDate DATE NULL AFTER PolicyStartDate,
            ADD COLUMN PreAuthNumber VARCHAR(100) NULL AFTER PolicyEndDate,
            ADD COLUMN AuthStatus VARCHAR(50) NULL AFTER PreAuthNumber,
            ADD COLUMN ApprovedAmount DECIMAL(10,2) NULL AFTER AuthStatus,
            ADD COLUMN CoveragePercentage DECIMAL(5,2) NULL AFTER ApprovedAmount,
            ADD COLUMN Deductible DECIMAL(10,2) NULL AFTER CoveragePercentage,
            ADD COLUMN CoPay DECIMAL(10,2) NULL AFTER Deductible,
            ADD COLUMN NonCoveredAmount DECIMAL(10,2) NULL AFTER CoPay,
            ADD COLUMN InsuranceRemarks TEXT NULL AFTER NonCoveredAmount;
            """
            cursor.execute(alter_query)
            
            # Ensure CoverageType matches old data
            cursor.execute("UPDATE IPD_Admission SET CoverageType = 'Insurance' WHERE InsuranceStatus != 'NOT_APPLICABLE'")
            print("Success!")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    apply()
