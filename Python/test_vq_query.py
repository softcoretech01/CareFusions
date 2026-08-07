from dotenv import load_dotenv; import os
from sqlalchemy import create_engine, text
load_dotenv()
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASSWORD', 'root')
DB_NAME = 'inventory'
DB_PORT = os.getenv('DB_PORT', '3306')
engine = create_engine(f'mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}')
with engine.begin() as conn:
    conn.execute(text("UPDATE RequestForQuotationItem SET ItemCode = NULL WHERE ItemCode = 'null'"))
    conn.execute(text("UPDATE RequestForQuotationItem SET ItemName = NULL WHERE ItemName = 'null'"))
    conn.execute(text("UPDATE RequestForQuotationItem SET Category = NULL WHERE Category = 'null'"))
    conn.execute(text("UPDATE RequestForQuotationItem SET Uom = NULL WHERE Uom = 'null'"))
    conn.execute(text("UPDATE RequestForQuotationItem SET Remarks = NULL WHERE Remarks = 'null'"))
    print("Cleaned up nulls")
