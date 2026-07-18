-- Users: authentication identity + core profile fields.
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
