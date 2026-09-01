from sqlalchemy import create_engine, text
from app.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
import urllib.parse

encoded_password = urllib.parse.quote_plus(DB_PASSWORD) if DB_PASSWORD else ''
url = f'mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
engine = create_engine(url)
with engine.connect() as conn:
    res = conn.execute(text("SELECT PARAMETER_NAME, DATA_TYPE FROM information_schema.parameters WHERE SPECIFIC_NAME = 'SpMasterMedicine' ORDER BY ORDINAL_POSITION;"))
    for row in res:
        print(row)
