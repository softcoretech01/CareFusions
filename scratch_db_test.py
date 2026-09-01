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
try:
    engine = create_engine(url)
    with engine.connect() as conn:
        print("Connected to DB.")
        result = conn.execute(text("CALL SpMasterMedicine('GET', 0, NULL, NULL, 0, 0, NULL, NULL, NULL, 0, 0, 0, 0, NULL, 0, 0, 0, NULL, NULL, NULL, NULL, NULL)"))
        for row in result:
            print(row)
except Exception as e:
    print(f"Error: {e}")
