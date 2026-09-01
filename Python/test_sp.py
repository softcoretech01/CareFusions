from app.database import SessionLocal
from sqlalchemy import text
import pymysql.cursors

db = SessionLocal()
conn = db.connection().connection
cursor = conn.cursor(pymysql.cursors.DictCursor)

cursor.execute("""
    CALL hospital.SpOpdVisit(
        'GET_DETAILS', 1, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    )
""")

result_sets = []
has_next = True
while has_next:
    result_sets.append(cursor.fetchall())
    has_next = cursor.nextset()

print("LabOrders:", result_sets[5] if len(result_sets) > 5 else [])
print("RadOrders:", result_sets[6] if len(result_sets) > 6 else [])

cursor.close()
db.close()
