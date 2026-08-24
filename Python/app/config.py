import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "admin")

# ── Auth ──────────────────────────────────────────────────────
# AUTH_SECRET signs the login token. If it is unset a random one is generated at
# import, which is fine for a single dev process but invalidates every token on
# restart and cannot work across multiple workers — set it in .env for anything
# real.
AUTH_SECRET = os.getenv("AUTH_SECRET") or secrets.token_urlsafe(48)
AUTH_SECRET_IS_EPHEMERAL = os.getenv("AUTH_SECRET") is None

# How long a login stays valid.
AUTH_TOKEN_TTL_HOURS = int(os.getenv("AUTH_TOKEN_TTL_HOURS", "12"))

# Master switch for endpoint protection. Defaults to OFF because every existing
# client (and every unattended script in Python/) currently calls the API with no
# credentials at all; flipping it on without warning would break them. Set
# REQUIRE_AUTH=true in .env once the callers are known to send the token that
# /auth/login returns — the frontend already does.
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "false").strip().lower() in {"1", "true", "yes", "on"}

# Endpoints that must stay reachable without a token even when REQUIRE_AUTH is on.
AUTH_EXEMPT_PATHS = ("/api/v1/auth/login", "/docs", "/redoc", "/openapi.json", "/uploads")
