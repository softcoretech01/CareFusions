import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.routers.doctor import get_doctors

db = SessionLocal()
try:
    doctors = get_doctors(search=None, db=db)
    from app.schemas.doctor import DoctorResponse
    validated = [DoctorResponse(**d) for d in doctors]
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
