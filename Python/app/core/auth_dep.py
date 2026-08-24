"""Request authentication dependency.

No router had any auth dependency, so every endpoint in the system — patient
records, billing, prescriptions, the user master — was readable and writable by
anyone who could reach the port.

`require_auth` is the fix. It is applied globally in main.py, but only when
config.REQUIRE_AUTH is true, so switching protection on is a single .env change
rather than a code change. See app/config.py for why it defaults to off.
"""
import logging

from fastapi import Header, HTTPException, Request, status

from app.config import AUTH_EXEMPT_PATHS, REQUIRE_AUTH
from app.core.tokens import verify_token

logger = logging.getLogger(__name__)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def current_user(authorization: str = Header(default="")) -> dict | None:
    """Decode the bearer token if one is present and valid, else None.

    Use this when an endpoint wants to know who is calling but should still work
    for anonymous callers.
    """
    if not authorization.lower().startswith("bearer "):
        return None
    return verify_token(authorization[7:].strip())


async def require_auth(request: Request) -> None:
    """Reject requests without a valid bearer token.

    Registered as a global dependency, so it sees every route including the ones
    that must stay open (login, docs, static uploads) — those are allowed through
    by path.
    """
    if not REQUIRE_AUTH:
        return

    path = request.url.path
    if request.method == "OPTIONS" or path.startswith(AUTH_EXEMPT_PATHS):
        return

    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise _UNAUTHORIZED

    payload = verify_token(auth[7:].strip())
    if payload is None:
        raise _UNAUTHORIZED

    # Downstream handlers and the audit middleware can read this off the request.
    request.state.user = payload
