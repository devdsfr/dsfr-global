#!/usr/bin/env bash
# Applies all *.up.sql migrations in order against DATABASE_URL (or local default).
set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL="${DATABASE_URL:-postgres://dsfr:dsfr@localhost:5432/dsfr_global?sslmode=disable}"
for f in database/migrations/*.up.sql; do
  echo "Applying $f"
  psql "$DB_URL" -f "$f"
done
