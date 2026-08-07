from dotenv import load_dotenv; import os
from sqlalchemy import create_engine, text
load_dotenv()
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASSWORD', 'root')
DB_NAME = 'admin'
DB_PORT = os.getenv('DB_PORT', '3306')

try:
    engine = create_engine(f'mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}')
    with engine.begin() as conn:
        print(conn.execute(text("CALL inventory.SpManageApprovals('UPDATE_STATUS', 'Purchase Requisition', 1, 'Approved', 'Admin')")).fetchall())
except Exception as e:
    print(e)
