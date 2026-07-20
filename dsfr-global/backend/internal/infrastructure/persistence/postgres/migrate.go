package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// schema holds idempotent DDL applied at startup. Neon (unlike a local Docker
// Postgres) has no init hooks, so the API ensures its schema exists on boot.
const schema = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(120) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    country        VARCHAR(80),
    language       VARCHAR(40),
    role           VARCHAR(80),
    target_role    VARCHAR(80),
    target_country VARCHAR(80),
    english_level  VARCHAR(2) CHECK (english_level IN ('A1','A2','B1','B2','C1','C2')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Opaque auth tokens (refresh + password reset), replacing the former Redis store.
CREATE TABLE IF NOT EXISTS auth_tokens (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('refresh','reset')),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens (expires_at);

-- Career assets: résumé and target job (one active of each per user for now).
CREATE TABLE IF NOT EXISTS resumes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline   VARCHAR(160) NOT NULL DEFAULT '',
    raw_text   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(160) NOT NULL,
    seniority  VARCHAR(80)  NOT NULL DEFAULT '',
    stack      VARCHAR(255) NOT NULL DEFAULT '',
    raw_text   TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI-generated interview scripts (teleprompter practice sessions).
CREATE TABLE IF NOT EXISTS interviews (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level      VARCHAR(20) NOT NULL DEFAULT 'beginner',
    turns      JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interviews_user_created ON interviews (user_id, created_at DESC);

-- Jobs started as one-per-user; users now track several openings at once,
-- so the UNIQUE(user_id) constraint is dropped and one job is flagged active.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_user_id_key;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company VARCHAR(160) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs (user_id, created_at DESC);

-- Interviews are generated for a specific job.
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- AI evaluation of each spoken answer (from the browser's speech transcript).
CREATE TABLE IF NOT EXISTS answer_evaluations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    turn_index   INT NOT NULL,
    transcript   TEXT NOT NULL,
    score        INT NOT NULL,
    fluency      INT NOT NULL DEFAULT 0,
    grammar      INT NOT NULL DEFAULT 0,
    vocabulary   INT NOT NULL DEFAULT 0,
    tips         JSONB NOT NULL DEFAULT '[]'::jsonb,
    improved     TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evals_user_created ON answer_evaluations (user_id, created_at DESC);

-- Per-user AI provider configuration (BYOK). api_key_enc is AES-GCM encrypted.
CREATE TABLE IF NOT EXISTS ai_settings (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    provider    VARCHAR(20) NOT NULL CHECK (provider IN ('openai','anthropic','gemini')),
    api_key_enc TEXT NOT NULL,
    model       VARCHAR(80) NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

// Migrate applies the schema. Safe to run on every startup.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, schema); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}
