"""Liveness, readiness and build identity.

The only health endpoint before this was `GET /`, which returns a static
string. It reports healthy while MySQL is unreachable, so it can never fail —
and a check that cannot fail is not a check. The Jenkins deploy gate needs an
endpoint that actually goes wrong when the deployment is wrong.

Both routes are in AUTH_EXEMPT_PATHS: a health probe and a monitoring check run
without credentials.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import APP_COMMIT, APP_ENV, APP_VERSION
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health"])

# When this process came up. A deploy that silently restart-loops shows here as
# an uptime that keeps resetting.
_STARTED_AT = datetime.now(timezone.utc)


def _identity() -> dict:
    return {
        "version":     APP_VERSION,
        "commit":      APP_COMMIT,
        "environment": APP_ENV,
    }


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Readiness. 200 when the database answers, 503 when it does not.

    The status code is the part that matters — the deploy gate and the
    container HEALTHCHECK both read it, not the body.
    """
    try:
        db.execute(text("SELECT 1"))
        database = {"connected": True}
        healthy = True
    except Exception as exc:
        # The message is useful when a deploy fails at 2am; it names the host
        # and port that could not be reached, never the credentials.
        logger.error(f"[GET /health] database unreachable: {exc}")
        database = {"connected": False, "error": type(exc).__name__}
        healthy = False

    body = {
        "status":   "ok" if healthy else "unavailable",
        "database": database,
        "uptimeSeconds": int((datetime.now(timezone.utc) - _STARTED_AT).total_seconds()),
        **_identity(),
    }
    return JSONResponse(status_code=200 if healthy else 503, content=body)


@router.get("/version")
def version():
    """Build identity. Always 200 — this answers "what is deployed here?".

    The frontend reads this to render its own version, rather than baking one
    into the bundle. That is what keeps a single frontend image promotable
    across all three environments.
    """
    return {
        **_identity(),
        "startedAt": _STARTED_AT.isoformat(),
    }
