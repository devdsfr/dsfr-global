# DSFR Global

**Your international career coach.** DSFR Global prepares tech professionals to land international jobs — not by teaching English, but by teaching them how to *work* in English. The platform analyzes your résumé and target job, tells you your real compatibility ("84% match for this role", never just "your English is B2"), and generates a personalized AI-driven journey until you get hired.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 18 (standalone, Signals), Angular Material, Tailwind CSS |
| Backend | Go 1.22, Gin, Clean Architecture, DDD |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access) + opaque refresh tokens in Redis |
| Infra | Docker Compose, Nginx |

## Project layout

```
frontend/    Angular app (auth, dashboard shell)
backend/     Go API (cmd/api + internal/{domain,application,infrastructure,interfaces})
database/    SQL migrations
docker/      docker-compose.yml
infra/       nginx config
scripts/     dev.sh, migrate.sh
docs/        architecture, data model, roadmap
```

## Quick start

```bash
# 1. Infra (Postgres + Redis; migration auto-applied on first boot)
docker compose -f docker/docker-compose.yml up -d postgres redis

# 2. Backend
cd backend && go run ./cmd/api          # http://localhost:8080/healthz

# 3. Frontend
cd frontend && npm install && npm start # http://localhost:4200
```

Or everything at once: `./scripts/dev.sh`

## API (v1)

| Method | Route | Description |
|---|---|---|
| POST | /api/v1/auth/register | Create account |
| POST | /api/v1/auth/login | Login → access + refresh tokens |
| POST | /api/v1/auth/refresh | Rotate refresh token |
| POST | /api/v1/auth/logout | Revoke refresh token |
| POST | /api/v1/auth/forgot-password | Start password recovery |
| POST | /api/v1/auth/reset-password | Complete password recovery |
| GET | /api/v1/me | Authenticated profile |
| GET | /healthz | Health check |

## Product rule

> Every feature must answer **"does this increase the user's chance of landing an international job?"** If not, it doesn't ship.

See `docs/` for architecture and the module roadmap (GAP Analysis, DSFR Coach, DSFR Interview, DSFR Score, gamification, AI agents).
