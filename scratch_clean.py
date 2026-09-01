import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(r'd:\project\CareFusions\Python\.env')
user = os.environ.get('DB_USER')
password = os.environ.get('DB_PASSWORD')
host = os.environ.get('DB_HOST')
port = os.environ.get('DB_PORT')
dbname = os.environ.get('DB_NAME')

url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}"
engine = create_engine(url)
with engine.begin() as conn:
    conn.execute(text('UPDATE Master_Medicine SET CategoryId = 11 WHERE CategoryId IS NULL OR CategoryId = 0'))
    conn.execute(text('UPDATE Master_SubCategory SET CategoryId = 11 WHERE CategoryId IS NULL OR CategoryId = 0'))
print('Cleaned up NULL CategoryIds')
