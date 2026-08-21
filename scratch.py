from sqlalchemy import create_engine, text
import urllib.parse

pwd = urllib.parse.quote_plus("H3s#2026#01")
engine = create_engine(f"mysql+pymysql://root:{pwd}@100.86.181.18:3320/hospital")
with engine.connect() as conn:
    res = conn.execute(text("DESCRIBE IPD_AdmissionRequest")).fetchall()
    for row in res:
        print(row)
