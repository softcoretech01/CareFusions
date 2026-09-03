from sqlalchemy import create_engine, text
import urllib.parse

pwd = urllib.parse.quote_plus("H3s#2026#01")
engine = create_engine(f"mysql+pymysql://root:{pwd}@100.86.181.18:3320/hospital")
with engine.connect() as conn:
    res = conn.execute(text("SELECT * FROM IPD_Bed WHERE RoomNumber='R002'")).fetchall()
    print("IPD_Bed matching R002:")
    print(res)
    if res:
        conn.execute(text("UPDATE IPD_Bed SET RoomNumber='102' WHERE RoomNumber='R002'"))
        conn.commit()
        print('Updated IPD_Bed.')
