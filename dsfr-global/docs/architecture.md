# Architecture

## Backend — Clean Architecture

```
cmd/api/                    Composition root (DI wiring, startup)
internal/
  domain/                   Entities + repository contracts + domain errors (no deps)
    user/
  application/              Use cases (services); depends only on domain
    auth/
  infrastructure/           Implementations of contracts
    persistence/postgres/   pgx repositories
    cache/                  Redis token store (refresh + password reset)
    security/               bcrypt hasher, JWT manager
  interfaces/http/          Delivery layer
    handlers/               Gin handlers (bind/validate → service → map errors)
    middleware/             auth (JWT), CORS, rate limit
    router/                 Route assembly
```

Dependency rule: source code dependencies point inward. `domain` knows nothing about Gin, pgx, or Redis. Services receive interfaces (`user.Repository`, `security.PasswordHasher`, `auth.Mailer`) — swap implementations without touching use cases.

## Auth flow

1. **Login** → bcrypt compare → short-lived JWT access token (15 min) + opaque refresh token stored in Redis (7 days).
2. **Refresh** → token is consumed (rotated) atomically; a stolen refresh token dies on first legitimate use.
3. **Logout** → refresh token deleted from Redis.
4. **Password reset** → opaque token in Redis (30 min TTL), delivered by the `Mailer` port (log in dev, SES/SMTP in prod). Responses never reveal whether an email exists.

## Frontend — Angular

- Standalone components + lazy `loadComponent` routes.
- Signals for auth state (`AuthService`), reactive guards and shell.
- `authInterceptor` attaches the Bearer token; `authGuard` protects the shell.
- Tailwind (dark-first design inspired by Linear/Vercel) + Angular Material available for complex widgets.

## Planned modules (each = domain package + application service + handlers)

| Module | Domain concept | AI agent |
|---|---|---|
| Résumé | `resume` (parsed skills, seniority, projects) | Resume AI |
| Job | `job` (requirements, stack, English level) | Recruiter AI |
| GAP Analysis | `gap` (compatibility %, missing skills, vocabulary) | — |
| Learning path | `path` (missions, exercises, adaptivity) | Learning AI |
| Interview | `interview` (session, transcript, feedback, grade) | Interview AI |
| Score | `score` (readiness dimensions + history) | Score AI |
| Coach | `coach` (long-term memory, guidance) | Coach AI |
| Gamification | `game` (XP, levels, badges, streaks, ranking) | — |

WebSocket endpoints (`/ws/…`) will serve Coach chat and live interviews.

## Scaling notes

- Rate limiter is in-memory today → move to Redis before running multiple API replicas.
- CQRS: introduce read models for the dashboard/ranking when volume justifies it.
- S3 for résumé/job PDF storage; async parsing via worker + queue.
