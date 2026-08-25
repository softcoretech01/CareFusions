import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "100.86.181.18")
DB_PORT = int(os.getenv("DB_PORT", 3320))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "H3s#2026#01")
DB_NAME = os.getenv("DB_NAME", "hospital")

connection = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    autocommit=True
)

cursor = connection.cursor()

minor_sql = """
CREATE TABLE IF NOT EXISTS Mst_MinorOperation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operationCode VARCHAR(50) UNIQUE NOT NULL,
    operationName VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    description VARCHAR(250),
    defaultCharge DECIMAL(10,2) DEFAULT 0.00,
    taxApplicable BOOLEAN DEFAULT TRUE,
    estimatedDuration INT DEFAULT 0,
    requiresConsent BOOLEAN DEFAULT FALSE,
    requiresAdmission BOOLEAN DEFAULT FALSE,
    otRequired BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Active',
    remarks VARCHAR(250),
    createdBy VARCHAR(50),
    createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy VARCHAR(50),
    modifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
"""

major_sql = """
CREATE TABLE IF NOT EXISTS Mst_MajorOperation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operationCode VARCHAR(50) UNIQUE NOT NULL,
    operationName VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    description VARCHAR(250),
    defaultCharge DECIMAL(10,2) DEFAULT 0.00,
    taxApplicable BOOLEAN DEFAULT TRUE,
    estimatedDuration INT DEFAULT 0,
    requiresConsent BOOLEAN DEFAULT FALSE,
    requiresAdmission BOOLEAN DEFAULT FALSE,
    otRequired BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Active',
    remarks VARCHAR(250),
    createdBy VARCHAR(50),
    createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy VARCHAR(50),
    modifiedDate DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
"""

cursor.execute(minor_sql)
cursor.execute(major_sql)

print("Tables Mst_MinorOperation and Mst_MajorOperation created successfully.")

cursor.close()
connection.close()
