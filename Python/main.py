import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routers import hospital, branch, department, doctor, upload, nurse, pharmacist, lab_technician, receptionist, facility_management, patient_category, blood_group, diagnosis, procedure, procedure_type, consultation_type, appointment_status, allergy, medicine, medicine_category, lab_test, sample_type

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="CareFusions HMS API",
    description="Hospital Management System — Python FastAPI Backend",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── Routers ───────────────────────────────────────────────────
app.include_router(hospital.router,    prefix="/api/v1")
app.include_router(branch.router,      prefix="/api/v1")
app.include_router(department.router,  prefix="/api/v1")
app.include_router(doctor.router,      prefix="/api/v1")
app.include_router(upload.router,      prefix="/api/v1")
app.include_router(nurse.router,       prefix="/api/v1")
app.include_router(pharmacist.router,  prefix="/api/v1")
app.include_router(lab_technician.router, prefix="/api/v1")
app.include_router(receptionist.router,          prefix="/api/v1")
app.include_router(facility_management.router,   prefix="/api/v1")
app.include_router(patient_category.router,      prefix="/api/v1")
app.include_router(blood_group.router,           prefix="/api/v1")
app.include_router(diagnosis.router,             prefix="/api/v1")
app.include_router(procedure.router,             prefix="/api/v1")
app.include_router(procedure_type.router,        prefix="/api/v1")
app.include_router(consultation_type.router,     prefix="/api/v1")
app.include_router(appointment_status.router,    prefix="/api/v1")
app.include_router(allergy.router,               prefix="/api/v1")
app.include_router(medicine.router,              prefix="/api/v1")
app.include_router(medicine_category.router,     prefix="/api/v1")
app.include_router(lab_test.router,              prefix="/api/v1")
app.include_router(sample_type.router,           prefix="/api/v1")


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "CareFusions HMS API is running"}
