import urllib.parse
from sqlalchemy import create_engine, text
from app.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD

url = f'mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD) if DB_PASSWORD else ""}@{DB_HOST}:{DB_PORT}/hospital'
engine = create_engine(url)

alter_sqls = [
    "ALTER TABLE hospital.IPD_Admission ADD COLUMN AdmissionReason VARCHAR(500) NULL AFTER CurrentBedId;",
    "ALTER TABLE hospital.IPD_Admission DROP COLUMN ProvisionalDiagnosis;",
    "ALTER TABLE hospital.IPD_AdmissionRequest DROP COLUMN ProvisionalDiagnosis;"
]

with engine.connect() as conn:
    for sql in alter_sqls:
        try:
            conn.execute(text(sql))
            print("SUCCESS:", sql)
        except Exception as e:
            print("ERROR (might already exist/be dropped):", e)
    
    conn.commit()
