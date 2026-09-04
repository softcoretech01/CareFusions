import logging
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.audit_middleware import AuditLogMiddleware
from app.core.auth_dep import require_auth
from app.config import (
    ALLOWED_ORIGINS, APP_COMMIT, APP_ENV, APP_VERSION,
    AUTH_SECRET_IS_EPHEMERAL, REQUIRE_AUTH,
)

from app.routers import (
    hospital, branch, department, radiology_service, equipment, service, tax,
    payment_mode, insurance_provider, tpa, vendor, category, sub_category, uom, item, catalog, brand,
    manufacturer, store, coa, cost_center, profit_center, payment_term, currency,
    financial_year, bank, cash_counter, role, user, sms_template, email_template,
    whatsapp_template, push_template, reminder_rule, audit_log,
    doctor, upload, nurse, pharmacist, lab_technician, receptionist, facility_management,
    patient_category, blood_group, diagnosis, procedure, procedure_type, consultation_type,
    appointment_status, allergy, medicine, medicine_category, lab_test, sample_type,
    patient_registration, quick_registration, emergency_registration, patient_documents,
    patient_visit, opd_visit, ipd_visit,
    appointment, permission, auth,
    doctor_schedule, ipd, op_billing, ip_billing, billing_reports, radiology_orders, radiology_qc, lab,
    purchase_requisition, rfq, vendor_quotation, purchase_order, goods_receipt, purchase_return,
    vendor_catalog, approval, procurement_dashboard,
    doctor_specialization, housekeeping, ipd_clinical, pharmacy, insurance, inventory, executive,
    scheduled_reports, minor_operation, major_operation, ward_charge, services, pro,
    billing_advance, insurance_claims, health
)


# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Make the security posture visible at boot rather than a surprise in production.
logger.info(
    f"CareFusions API {APP_VERSION} (commit {APP_COMMIT}) starting in {APP_ENV}"
)

if ALLOWED_ORIGINS == ["*"]:
    logger.warning(
        "ALLOWED_ORIGINS is unset, so CORS accepts every origin. Set it to "
        "this environment's UI origin (e.g. http://100.86.181.18:5176)."
    )

if not REQUIRE_AUTH:
    logger.warning(
        "REQUIRE_AUTH is off — every API endpoint is public. "
        "Set REQUIRE_AUTH=true in Python/.env to enforce the login token."
    )
elif AUTH_SECRET_IS_EPHEMERAL:
    logger.warning(
        "REQUIRE_AUTH is on but AUTH_SECRET is unset — a random secret was "
        "generated for this process, so tokens die on restart and will not "
        "validate across workers. Set AUTH_SECRET in Python/.env."
    )

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="CareFusions HMS API",
    description="Hospital Management System — Python FastAPI Backend",
    # Injected at deploy time; see app/config.py. Was hardcoded "1.0.0",
    # which never changed and so told you nothing about what was running.
    version=APP_VERSION,
    # Global auth gate. It is a no-op while REQUIRE_AUTH is false, so this is
    # safe to leave wired up; see app/config.py for the switch and the reason it
    # ships off. Without it, every endpoint in the system is public.
    dependencies=[Depends(require_auth)],
)

# ── CORS ────────────────────────────────────────────────
# Deployed environments serve the API same-origin through the frontend's nginx
# proxy, so this list is defence in depth. It stays "*" only when
# ALLOWED_ORIGINS is unset, and the boot log says so.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global audit trail ────────────────────────────────────────
# Records an entry for every create/update/delete across all masters.
app.add_middleware(AuditLogMiddleware)

# ── Static file uploads ───────────────────────────────────────
# Same absolute path the upload router writes to, so what is saved is served.
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routers ───────────────────────────────────────────────────
# Health and version first: the deploy gate depends on these.
app.include_router(health.router,      prefix="/api/v1")
app.include_router(hospital.router,    prefix="/api/v1")
app.include_router(branch.router,      prefix="/api/v1")
app.include_router(department.router,  prefix="/api/v1")
app.include_router(radiology_service.router, prefix="/api/v1")
app.include_router(equipment.router, prefix="/api/v1")
app.include_router(op_billing.router, prefix="/api/v1")
app.include_router(ip_billing.router, prefix="/api/v1")
app.include_router(billing_reports.router, prefix="/api/v1")
app.include_router(radiology_orders.router, prefix="/api/v1")
app.include_router(ward_charge.router, prefix="/api/v1")
app.include_router(services.router, prefix="/api/v1")
app.include_router(pro.router, prefix="/api/v1")
app.include_router(billing_advance.router, prefix="/api/v1")
app.include_router(insurance_claims.router, prefix="/api/v1")
app.include_router(insurance_provider.router, prefix="/api/v1")
app.include_router(tpa.router, prefix="/api/v1")
app.include_router(vendor.router, prefix="/api/v1")
app.include_router(category.router, prefix="/api/v1")
app.include_router(sub_category.router, prefix="/api/v1")
app.include_router(radiology_qc.router, prefix="/api/v1")
app.include_router(service.router, prefix="/api/v1")
app.include_router(tax.router, prefix="/api/v1")
app.include_router(payment_mode.router, prefix="/api/v1")
app.include_router(uom.router, prefix="/api/v1")
app.include_router(item.router, prefix="/api/v1")
app.include_router(catalog.router, prefix="/api/v1")
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
app.include_router(minor_operation.router,       prefix="/api/v1")
app.include_router(major_operation.router,       prefix="/api/v1")
app.include_router(ward_charge.router,           prefix="/api/v1/ward-charges")
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
app.include_router(ipd_visit.router,              prefix="/api/v1")
app.include_router(medicine.router,              prefix="/api/v1")
app.include_router(medicine_category.router,     prefix="/api/v1")
app.include_router(lab_test.router,              prefix="/api/v1")
app.include_router(lab.router,                   prefix="/api/v1")
app.include_router(sample_type.router,           prefix="/api/v1")
app.include_router(appointment.router,           prefix="/api/v1")
app.include_router(doctor_schedule.router,       prefix="/api/v1")
app.include_router(doctor_specialization.router, prefix="/api/v1")
app.include_router(housekeeping.router,          prefix="/api/v1")
app.include_router(ipd.router,                   prefix="/api/v1")
app.include_router(ipd_clinical.router,          prefix="/api/v1")
app.include_router(pharmacy.router,              prefix="/api/v1")
app.include_router(insurance.router,              prefix="/api/v1")
app.include_router(inventory.router,              prefix="/api/v1")
app.include_router(executive.router,              prefix="/api/v1")
app.include_router(scheduled_reports.router,      prefix="/api/v1")
app.include_router(permission.router,            prefix="/api/v1")
app.include_router(auth.router,                  prefix="/api/v1")
app.include_router(op_billing.router,            prefix="/api/v1")
app.include_router(services.router,              prefix="/api/v1")
app.include_router(pro.router,                   prefix="/api/v1")
app.include_router(billing_advance.router,       prefix="/api/v1")
app.include_router(purchase_requisition.router,  prefix="/api/v1")
app.include_router(rfq.router,                   prefix="/api/v1")
app.include_router(upload.router,                prefix="/api/v1")
app.include_router(vendor_quotation.router,      prefix="/api/v1")
app.include_router(purchase_order.router,        prefix="/api/v1")
app.include_router(goods_receipt.router,         prefix="/api/v1")
app.include_router(purchase_return.router,       prefix="/api/v1")
app.include_router(vendor_catalog.router,        prefix="/api/v1")
app.include_router(approval.router,              prefix="/api/v1")
app.include_router(procurement_dashboard.router, prefix="/api/v1")


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "CareFusions HMS API is running"}


# ── Entrypoint ────────────────────────────────────────────────
# Run with:  python main.py   (defaults to port 8000, matching the
# frontend's VITE_API_URL=http://localhost:8000/api/v1). Override with
# the PORT env var if needed.
if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
    
# trigger reload
