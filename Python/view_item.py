import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database import engine

with engine.connect() as connection:
    # Use raw connection for calling SP
    raw_conn = connection.connection
    with raw_conn.cursor() as cursor:
        cursor.execute("SELECT * FROM admin.Master_Item WHERE ItemId = 4")
        result = cursor.fetchone()
        print(result)
