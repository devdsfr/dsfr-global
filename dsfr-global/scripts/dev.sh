#!/usr/bin/env bash
# Starts the full local stack: postgres + redis + api via Docker, Angular via ng serve.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose -f docker/docker-compose.yml up -d postgres redis
echo "Waiting for services..."
sleep 3

(cd backend && go run ./cmd/api) &
API_PID=$!
trap "kill $API_PID" EXIT

cd frontend && npm start
