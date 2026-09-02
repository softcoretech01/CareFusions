import os
from dotenv import load_dotenv
load_dotenv(r'd:\project\CareFusions\Python\.env')
import pymysql

conn = pymysql.connect(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME')
)
cursor = conn.cursor()
cursor.execute("SELECT PARAMETER_NAME FROM information_schema.parameters WHERE SPECIFIC_NAME = 'SpPatientRegistration' ORDER BY ORDINAL_POSITION")
for i, row in enumerate(cursor.fetchall()):
    print(f"{i+1}. {row[0]}")
