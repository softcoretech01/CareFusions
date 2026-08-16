import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text
with engine.connect() as con:
    con.execute(text("UPDATE registration.QuickRegistration SET Uhid = 'UHID-2026-0004' WHERE QuickRegistrationId = 3"))
    con.commit()
