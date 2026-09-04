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

# /api/v1/health runs SELECT 1 and answers 503 when the database is
# unreachable, so an unhealthy container actually reports unhealthy.
# `GET /` returns a static string and can never fail, which is why it is
# not used here.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:8000/api/v1/health > /dev/null || exit 1

# uvicorn is invoked directly rather than via `python main.py`, because that
# entrypoint sets reload=True unconditionally — a development-only setting.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
