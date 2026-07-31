import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.audit_middleware import AuditLogMiddleware

from app.routers import (
    hospital, branch, department, radiology_service, equipment, service, tax,
    payment_mode, insurance_provider, tpa, vendor, category, sub_category, uom, item, brand,
    manufacturer, store, coa, cost_center, profit_center, payment_term, currency,
    financial_year, bank, cash_counter, role, user, sms_template, email_template,
    whatsapp_template, push_template, reminder_rule, audit_log,
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
    allow_origins=["http://localhost:5173",
                   "http://localhost:5174"],   # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global audit trail ────────────────────────────────────────
# Records an entry for every create/update/delete across all masters.
app.add_middleware(AuditLogMiddleware)

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
