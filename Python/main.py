import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.audit_middleware import AuditLogMiddleware

from app.routers import (
    hospital, branch, department, radiology_service, equipment, service, tax,
    payment_mode, insurance_provider, tpa, vendor, category, sub_category, uom, item, brand,
    manufacturer, store, coa, cost_center, profit_center, payment_term, currency,
    financial_year, bank, cash_counter, role, user, sms_template, email_template,
    whatsapp_template, push_template, reminder_rule, audit_log,
    doctor, upload, nurse, pharmacist, lab_technician, receptionist, facility_management,
    patient_category, blood_group, diagnosis, procedure, procedure_type, consultation_type,
    appointment_status, allergy, medicine, medicine_category, lab_test, sample_type,
    patient_registration, quick_registration, emergency_registration, patient_documents,
    patient_visit, opd_visit,
    appointment, permission, auth,
)

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

# ── Global audit trail ────────────────────────────────────────
# Records an entry for every create/update/delete across all masters.
app.add_middleware(AuditLogMiddleware)

# ── Static file uploads ───────────────────────────────────────
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── Routers ───────────────────────────────────────────────────
app.include_router(hospital.router,    prefix="/api/v1")
app.include_router(branch.router,      prefix="/api/v1")
app.include_router(department.router,  prefix="/api/v1")
app.include_router(radiology_service.router, prefix="/api/v1")
app.include_router(equipment.router, prefix="/api/v1")
app.include_router(service.router, prefix="/api/v1")
app.include_router(tax.router, prefix="/api/v1")
app.include_router(payment_mode.router, prefix="/api/v1")
app.include_router(insurance_provider.router, prefix="/api/v1")
app.include_router(tpa.router, prefix="/api/v1")
app.include_router(vendor.router, prefix="/api/v1")
app.include_router(category.router, prefix="/api/v1")
app.include_router(sub_category.router, prefix="/api/v1")
app.include_router(uom.router, prefix="/api/v1")
app.include_router(item.router, prefix="/api/v1")
app.include_router(brand.router, prefix="/api/v1")
app.include_router(manufacturer.router, prefix="/api/v1")
app.include_router(store.router, prefix="/api/v1")
app.include_router(coa.router, prefix="/api/v1")
app.include_router(cost_center.router, prefix="/api/v1")
app.include_router(profit_center.router, prefix="/api/v1")
app.include_router(payment_term.router, prefix="/api/v1")
app.include_router(currency.router, prefix="/api/v1")
app.include_router(financial_year.router, prefix="/api/v1")
app.include_router(bank.router, prefix="/api/v1")
app.include_router(cash_counter.router, prefix="/api/v1")
app.include_router(role.router, prefix="/api/v1")
app.include_router(user.router, prefix="/api/v1")
app.include_router(sms_template.router, prefix="/api/v1")
app.include_router(email_template.router, prefix="/api/v1")
app.include_router(whatsapp_template.router, prefix="/api/v1")
app.include_router(push_template.router, prefix="/api/v1")
app.include_router(reminder_rule.router, prefix="/api/v1")
app.include_router(audit_log.router, prefix="/api/v1")
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
app.include_router(patient_registration.router,  prefix="/api/v1")
app.include_router(quick_registration.router,    prefix="/api/v1")
app.include_router(emergency_registration.router, prefix="/api/v1")
app.include_router(patient_documents.router,      prefix="/api/v1")
app.include_router(patient_visit.router,          prefix="/api/v1")
app.include_router(opd_visit.router,              prefix="/api/v1")
app.include_router(medicine.router,              prefix="/api/v1")
app.include_router(medicine_category.router,     prefix="/api/v1")
app.include_router(lab_test.router,              prefix="/api/v1")
app.include_router(sample_type.router,           prefix="/api/v1")
app.include_router(appointment.router,           prefix="/api/v1")
app.include_router(permission.router,            prefix="/api/v1")
app.include_router(auth.router,                  prefix="/api/v1")


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "CareFusions HMS API is running"}


# ── Entrypoint ────────────────────────────────────────────────
# Run with:  python main.py   (defaults to port 8001, matching the
# frontend's VITE_API_URL). Override with the PORT env var if needed.
if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8001")),
        reload=True,
    )
    
# trigger reload
