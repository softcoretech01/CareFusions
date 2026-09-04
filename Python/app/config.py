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
# /health and /version are on this list because the deployment health gate and
# any monitoring probe run without credentials.
AUTH_EXEMPT_PATHS = (
    "/api/v1/auth/login",
    "/api/v1/health",
    "/api/v1/version",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/uploads",
)

# ── Deployment identity ───────────────────────────────────────
# Which lane this process is serving: dev | test | prod. Surfaced by
# /api/v1/version so it is possible to tell from the outside which environment
# a given URL is actually talking to.
APP_ENV = os.getenv("APP_ENV", "dev")

# Set by the deploy job as vP.T.D — the production, tester and developer release
# counters. Deliberately an environment variable rather than a constant in the
# source: the SAME image is promoted between environments, and only this value
# changes, which is what allows a promotion to re-tag a digest instead of
# rebuilding.
APP_VERSION = os.getenv("APP_VERSION", "0.0.0-unversioned")

# The commit the image was built from. This, not APP_VERSION, is the immutable
# identity of a build.
APP_COMMIT = os.getenv("APP_COMMIT", "unknown")

# ── CORS ──────────────────────────────────────────────────────
# Comma-separated list of origins allowed to call the API.
#
# In a deployed environment the frontend reaches the API same-origin through
# nginx, so this is defence in depth rather than something the app depends on.
# It defaults to "*" purely so that an existing .env without this key keeps
# working; main.py logs a warning when it is left open.
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]
