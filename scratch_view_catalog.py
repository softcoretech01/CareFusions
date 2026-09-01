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

try:
    with engine.connect() as conn:
        result = conn.execute(text("SHOW CREATE VIEW inventory.Vw_CatalogItem")).fetchone()
        if result:
            print(result[1])
        else:
            print("View not found.")
except Exception as e:
    print(f"Error: {e}")
