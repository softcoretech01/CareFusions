"""Global audit-logging middleware.

Records ONE audit entry for every successful state-changing request
(POST / PUT / PATCH / DELETE) under /api/v1— automatically, for every master,
with no per-router wiring. Read requests (GET) are ignored, and the audit-log
endpoints themselves are skipped to avoid recursion.

The identity of the actor is taken from request headers when the frontend sends
them (X-User-Name / X-User-Role / X-Employee-Name / X-Department); until an auth
layer exists it falls back to "Admin" / "System".
"""
import json
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.concurrency import run_in_threadpool
from sqlalchemy import text

from app.database import SessionLocal

logger = logging.getLogger(__name__)

# method -> audit action label
_ACTION_BY_METHOD = {"POST": "Create", "PUT": "Update", "PATCH": "Update", "DELETE": "Delete"}

# path segment -> (Module, Screen Name). Anything not listed falls back to a
# prettified segment name, so new masters are still captured without edits here.
_SEGMENT_INFO = {
    "roles":               ("Security",      "Role Master"),
    "users":               ("Security",      "User Master"),
    "sms-templates":       ("Notification",  "SMS Template Master"),
    "email-templates":     ("Notification",  "Email Template Master"),
    "whatsapp-templates":  ("Notification",  "WhatsApp Template Master"),
    "push-templates":      ("Notification",  "Push Notification Template"),
    "reminder-rules":      ("Notification",  "Reminder Rule Master"),
    "hospitals":           ("Setup",         "Hospital Master"),
    "branches":            ("Setup",         "Branch Master"),
    "departments":         ("Setup",         "Department Master"),
    "radiology-services":  ("Radiology",     "Radiology Service Master"),
    "equipment":           ("Radiology",     "Equipment Master"),
    "services":            ("Billing",       "Service Master"),
    "taxes":               ("Billing",       "Tax (GST) Master"),
    "payment-modes":       ("Billing",       "Payment Mode Master"),
    "insurance-providers": ("Insurance",     "Insurance Provider Master"),
    "tpas":                ("Insurance",     "TPA Master"),
    "vendors":             ("Inventory",     "Vendor Master"),
    "categories":          ("Inventory",     "Category Master"),
    "sub-categories":      ("Inventory",     "Sub-Category Master"),
    "uoms":                ("Inventory",     "UOM Master"),
    "items":               ("Inventory",     "Item Master"),
    "brands":              ("Inventory",     "Brand Master"),
    "manufacturers":       ("Inventory",     "Manufacturer Master"),
    "stores":              ("Inventory",     "Store / Warehouse Master"),
    "coa":                 ("Finance",       "Chart of Accounts"),
    "cost-centers":        ("Finance",       "Cost Center Master"),
    "profit-centers":      ("Finance",       "Profit Center Master"),
    "payment-terms":       ("Finance",       "Payment Terms Master"),
    "currencies":          ("Finance",       "Currency Master"),
    "financial-years":     ("Finance",       "Financial Year Master"),
    "banks":               ("Finance",       "Bank Master"),
    "cash-counters":       ("Finance",       "Cash Counter Master"),
    # ── Clinical / staff masters ──
    "doctors":             ("Doctor",        "Doctor Master"),
    "nurses":              ("Employee",      "Nurse Master"),
    "pharmacists":         ("Employee",      "Pharmacist Master"),
    "lab-technicians":     ("Employee",      "Lab Technician Master"),
    "receptionists":       ("Employee",      "Receptionist Master"),
    "facility-management": ("Employee",      "Facility Management Master"),
    "patient-categories":  ("Patient",       "Patient Category Master"),
    "blood-groups":        ("Patient",       "Blood Group Master"),
    "allergies":           ("Patient",       "Allergy Master"),
    "diagnosis":           ("Patient",       "Diagnosis Master"),
    "procedures":          ("Patient",       "Procedure Master"),
    "procedure-types":     ("Patient",       "Procedure Type Master"),
    "consultation-types":  ("Appointment",   "Consultation Type Master"),
    "appointment-status":  ("Appointment",   "Appointment Status Master"),
    "medicines":           ("Pharmacy",      "Medicine Master"),
    "medicine-categories": ("Pharmacy",      "Medicine Category Master"),
    "tests":               ("Laboratory",    "Test Master"),
    "sample-types":        ("Laboratory",    "Sample Type Master"),
    "upload":              ("System",        "File Upload"),
}

# segments we never audit (the audit trail itself, health, etc.)
_SKIP_SEGMENTS = {"audit-logs"}


def _parse_user_agent(ua: str):
    """Lightweight browser / OS / device extraction (no external deps)."""
    if not ua:
        return "Unknown", "Unknown", "Unknown"
    u = ua.lower()

    if   "edg/" in u:                      browser = "Edge"
    elif "opr/" in u or "opera" in u:      browser = "Opera"
    elif "chrome/" in u and "chromium" not in u: browser = "Chrome"
    elif "firefox/" in u:                  browser = "Firefox"
    elif "safari/" in u:                   browser = "Safari"
    else:                                  browser = "Other"

    if   "windows" in u:                   os_name = "Windows"
    elif "iphone" in u or "ipad" in u or "ios" in u: os_name = "iOS"
    elif "mac os" in u or "macintosh" in u: os_name = "macOS"
    elif "android" in u:                   os_name = "Android"
    elif "linux" in u:                     os_name = "Linux"
    else:                                  os_name = "Other"

    if   "ipad" in u or "tablet" in u:     device = "Tablet"
    elif "mobi" in u or "iphone" in u or "android" in u: device = "Mobile"
    else:                                  device = "Desktop"

    return browser, os_name, device


def _write_audit(params: dict):
    """Insert one audit row via the stored procedure on its own session."""
    db = SessionLocal()
    try:
        db.execute(text("""
            CALL SpAuditLog(
                'INSERT', NULL, :p_UserName, :p_EmployeeName, :p_Role, :p_Department,
                :p_Module, :p_ScreenName, :p_Action, :p_RecordId, :p_TransactionNumber,
                :p_IpAddress, :p_Device, :p_Browser, :p_OperatingSystem, :p_SessionId,
                :p_OldValues, :p_NewValues, :p_ChangeSummary, :p_Status, :p_FailureReason,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
        """), params)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"[audit] failed to record entry: {e}")
    finally:
        db.close()


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        action = _ACTION_BY_METHOD.get(request.method)
        path = request.url.path
        parts = path.strip("/").split("/")

        # Only audit /api/v1/<segment>[/...] mutations
        if not (action and len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1"):
            return response

        segment = parts[2]
        if segment in _SKIP_SEGMENTS:
            return response

        # id from the path (present for update / delete / toggle)
        record_id = parts[3] if len(parts) >= 4 and parts[3].isdigit() else None
        # a trailing verb like ".../toggle-status" is really an Update
        if len(parts) >= 5 and parts[4] == "toggle-status":
            action = "Update"

        # Buffer the response so we can (a) read the created id and (b) still return it
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        response = Response(content=body, status_code=response.status_code,
                            headers=dict(response.headers), media_type=response.media_type)

        # For a successful create, pull the new record's code/id from the body
        if record_id is None and 200 <= response.status_code < 300 and body:
            try:
                data = json.loads(body)
                if isinstance(data, dict):
                    record_id = str(data.get("userId") or data.get("roleCode")
                                    or data.get("templateCode") or data.get("ruleCode")
                                    or data.get("code") or data.get("id") or "") or None
            except Exception:
                pass

        module, screen = _SEGMENT_INFO.get(segment, ("General", segment.replace("-", " ").title() + " Master"))
        ok = 200 <= response.status_code < 400
        h = request.headers
        xff = h.get("x-forwarded-for")
        ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else None)
        browser, os_name, device = _parse_user_agent(h.get("user-agent", ""))

        params = {
            "p_UserName":          h.get("x-user-name") or "Admin",
            "p_EmployeeName":      h.get("x-employee-name"),
            "p_Role":              h.get("x-user-role"),
            "p_Department":        h.get("x-department"),
            "p_Module":            module,
            "p_ScreenName":        screen,
            "p_Action":            action,
            "p_RecordId":          record_id,
            "p_TransactionNumber": None,
            "p_IpAddress":         ip,
            "p_Device":            device,
            "p_Browser":           browser,
            "p_OperatingSystem":   os_name,
            "p_SessionId":         h.get("x-session-id"),
            "p_OldValues":         None,
            "p_NewValues":         None,
            "p_ChangeSummary":     f"{action} on {screen}" + (f" (record {record_id})" if record_id else ""),
            "p_Status":            "Success" if ok else "Failed",
            "p_FailureReason":     None if ok else f"Request failed with HTTP {response.status_code}",
        }

        try:
            await run_in_threadpool(_write_audit, params)
        except Exception as e:
            logger.warning(f"[audit] middleware error: {e}")

        return response
