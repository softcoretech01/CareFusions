from sqlalchemy import create_engine, text

try:
    engine = create_engine('mysql+pymysql://root:root@localhost:3306/inventory')
    with engine.begin() as conn:
        print(conn.execute(text("CALL SpManageApprovals('GET_PENDING', NULL, 0, NULL, NULL)")).fetchall())
except Exception as e:
    print("Error:", e)
