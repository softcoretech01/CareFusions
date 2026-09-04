FROM python:3.11-slim

# Matches the 3.11.9 the application is developed against. Do not float this to
# `python:3` — the committed bytecode was 3.13 while development was 3.11, and
# that drift is exactly what pinning is for.

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# curl exists solely for HEALTHCHECK below.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# uploads/ is the mount point for a named volume. Create it and hand ownership
# over before dropping privileges, or the app cannot write patient documents.
RUN mkdir -p /app/uploads \
 && adduser --system --group --no-create-home carefusion \
 && chown -R carefusion:carefusion /app

# The previous image ran as root.
USER carefusion

EXPOSE 8000

# `/` is the only health endpoint that exists today, and it returns a static
# string without touching the database — it reports healthy while MySQL is
# unreachable. Repoint this at /api/v1/health once Phase 3 lands; a check that
# cannot fail is not a health check, and the Jenkins deploy gate depends on it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:8000/ > /dev/null || exit 1

# uvicorn is invoked directly rather than via `python main.py`, because that
# entrypoint sets reload=True unconditionally — a development-only setting.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
