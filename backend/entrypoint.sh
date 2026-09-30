#!/usr/bin/env bash
set -euo pipefail

echo "Applying database migrations…"
alembic upgrade head

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding demo data…"
  python -m app.db.seed || echo "Seeding skipped or already applied."
fi

echo "Starting API…"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
