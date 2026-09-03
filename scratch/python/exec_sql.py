from sqlalchemy import create_engine, text
from app.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
import urllib.parse

url = f'mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD) if DB_PASSWORD else ""}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
engine = create_engine(url)

with engine.connect() as conn:
    res = conn.execute(text("SELECT AdmissionId, Uhid, PatientName, Status FROM IPD_Admission ORDER BY AdmissionId DESC LIMIT 10"))
    for row in res:
        print(row)
