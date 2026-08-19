from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json
import pymysql

# We will just mimic the logic of get_opd_schedule
from app.schemas.opd_visit import OpdVisitScheduleResponse

engine = create_engine("mysql+pymysql://root:H3s%232026%2301@100.86.181.18:3320/hospital")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

sql = text("""
    CALL hospital.SpOpdVisit(
        'GET_EMR_SCHEDULE', NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    )
""")
result = db.execute(sql)
rows = result.fetchall()

visits = []
for row in rows:
    d = dict(row._mapping)
    if d.get("date"):
        d["date"] = str(d["date"])
    if not d.get("patientName"):
        d["patientName"] = "Unknown"
    
    if d.get("labOrders") and isinstance(d["labOrders"], str):
        try:
            parsed = json.loads(d["labOrders"])
            if isinstance(parsed, list):
                d["labOrders"] = [x for x in parsed if x is not None]
            else:
                d["labOrders"] = []
        except Exception:
            d["labOrders"] = []
    elif not d.get("labOrders"):
        d["labOrders"] = []

    if d.get("radiologyOrders") and isinstance(d["radiologyOrders"], str):
        try:
            parsed_rad = json.loads(d["radiologyOrders"])
            if isinstance(parsed_rad, list):
                d["radiologyOrders"] = [x for x in parsed_rad if x is not None]
            else:
                d["radiologyOrders"] = []
        except Exception:
            d["radiologyOrders"] = []
    elif not d.get("radiologyOrders"):
        d["radiologyOrders"] = []

    if d.get("prescriptions") and isinstance(d["prescriptions"], str):
        try:
            parsed_pres = json.loads(d["prescriptions"])
            if isinstance(parsed_pres, list):
                d["prescriptions"] = [x for x in parsed_pres if x is not None]
            else:
                d["prescriptions"] = []
        except Exception:
            d["prescriptions"] = []
    elif not d.get("prescriptions"):
        d["prescriptions"] = []
        
    if d.get("diagnoses") and isinstance(d["diagnoses"], str):
        try:
            parsed_diag = json.loads(d["diagnoses"])
            if isinstance(parsed_diag, list):
                d["diagnoses"] = [x for x in parsed_diag if x is not None]
            else:
                d["diagnoses"] = []
        except Exception as e:
            print(f"Error parsing diagnoses: {e} - string was: {d['diagnoses']}")
            d["diagnoses"] = []
    elif not d.get("diagnoses"):
        d["diagnoses"] = []
        
    visits.append(d)

print(f"Successfully processed {len(visits)} visits.")
# Now validate with Pydantic
try:
    for v in visits:
        OpdVisitScheduleResponse(**v)
    print("Pydantic validation passed!")
except Exception as e:
    print(f"Pydantic Validation failed! {e}")
