"""Signed, expiring session tokens.

`/auth/login` used to hand back `secrets.token_urlsafe(24)` — a random string
that was never stored anywhere. Nothing could verify it, so it carried no
identity and proved nothing; it was a session id with no session behind it.

These tokens are self-contained and verifiable instead: the payload is signed
with HMAC-SHA256 under AUTH_SECRET, so the server can authenticate a request
without keeping server-side state.

Format (all base64url, no padding):
    <payload>.<signature>

Payload is JSON: {"uid": <int>, "usr": str, "role": str, "exp": <unix seconds>}

This is a JWT in spirit but deliberately not a JWT library dependency — the
project has no auth libraries and stdlib hmac does the job. If JWT interop is
ever needed, swap this module out; nothing else knows the format.
"""
import base64
import hmac
import hashlib
import json
import time
from typing import Optional

from app.config import AUTH_SECRET, AUTH_TOKEN_TTL_HOURS


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64d(txt: str) -> bytes:
    return base64.urlsafe_b64decode(txt + "=" * (-len(txt) % 4))


def _sign(payload_b64: str) -> str:
    mac = hmac.new(AUTH_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256)
    return _b64e(mac.digest())


def issue_token(user_id: int, username: str, role: str,
                ttl_hours: Optional[int] = None) -> str:
    """Mint a signed token for a user who has just proved their password."""
    ttl = AUTH_TOKEN_TTL_HOURS if ttl_hours is None else ttl_hours
    payload = {
        "uid":  user_id,
        "usr":  username,
        "role": role,
        "exp":  int(time.time()) + ttl * 3600,
    }
    payload_b64 = _b64e(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{payload_b64}.{_sign(payload_b64)}"


def verify_token(token: str) -> Optional[dict]:
    """Return the payload for a valid, unexpired token, else None.

    Never raises — a malformed token is just an invalid one.
    """
    try:
        payload_b64, sig = token.split(".", 1)
    except ValueError:
        return None

    # Constant-time compare so a wrong signature leaks no timing information.
    if not hmac.compare_digest(sig, _sign(payload_b64)):
        return None

    try:
        payload = json.loads(_b64d(payload_b64))
    except Exception:
        return None

    if not isinstance(payload, dict) or "exp" not in payload:
        return None
    if int(payload["exp"]) < int(time.time()):
        return None

    return payload
