import urllib.parse
from sqlalchemy import create_engine, text
from app.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

encoded_password = urllib.parse.quote_plus(DB_PASSWORD) if DB_PASSWORD else ''
DATABASE_URL = f'mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4&collation=utf8mb4_general_ci'

engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    res = conn.execute(text("UPDATE hospital.Trn_OpdVisitRadiologyOrder SET ServiceName = BodyPart WHERE ServiceName IS NULL"))
    print(f'Rows updated: {res.rowcount}')
