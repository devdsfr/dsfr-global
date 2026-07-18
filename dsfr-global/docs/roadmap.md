# Roadmap

## Phase 0 — Foundation ✅ (this scaffold)
- Monorepo structure, Clean Architecture backend, Angular shell
- Auth: register, login, logout, refresh rotation, password recovery
- Docker Compose (Postgres + Redis), migrations, Nginx config

## Phase 1 — Ingestion
- Profile completion (country, role, target country, English level)
- Résumé upload (PDF/DOCX/text) → S3 → Resume AI extraction
- Job registration (URL/PDF/text) → Recruiter AI extraction

## Phase 2 — The differentiator
- GAP Analysis: overall / technical / linguistic compatibility %
- Missing technologies, required vocabulary, soft skills
- DSFR Score v1 with history

## Phase 3 — The journey
- Learning AI: personalized missions (speaking, listening, vocabulary, interviews)
- Adaptive path: never repeat mastered content
- Gamification: XP, levels, streaks, badges, missions

## Phase 4 — The coach
- DSFR Coach (WebSocket chat, long-term memory, mentor persona)
- DSFR Interview: simulated interviews (HR, Tech Lead, Pair Programming, Architecture, Client, Daily) with voice + text, feedback and grading

## Phase 5 — Scale
- Kubernetes, Redis-based rate limiting, CQRS read models
- Observability (metrics, tracing), 80%+ test coverage gate, e2e suite
