import os
from dotenv import load_dotenv
load_dotenv(r'd:\project\CareFusions\Python\.env')
import pymysql

conn = pymysql.connect(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD')
)
cursor = conn.cursor()
cursor.execute("SELECT TABLE_SCHEMA FROM information_schema.tables WHERE TABLE_NAME = 'Service_Order'")
print('Schemas with Service_Order:', cursor.fetchall())
