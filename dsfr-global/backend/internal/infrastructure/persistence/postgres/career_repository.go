package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dsfr-global/backend/internal/domain/career"
	"github.com/dsfr-global/backend/internal/infrastructure/security"
)

// CareerRepository is the PostgreSQL implementation of career.Repository.
// API keys are encrypted with the SecretBox before hitting the database.
type CareerRepository struct {
	pool *pgxpool.Pool
	box  *security.SecretBox
}

// NewCareerRepository wires the repository to a connection pool.
func NewCareerRepository(pool *pgxpool.Pool, box *security.SecretBox) *CareerRepository {
	return &CareerRepository{pool: pool, box: box}
}

var _ career.Repository = (*CareerRepository)(nil)

func (r *CareerRepository) UpsertResume(ctx context.Context, res *career.Resume) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO resumes (id, user_id, headline, raw_text)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE
		SET headline = EXCLUDED.headline, raw_text = EXCLUDED.raw_text, updated_at = now()`,
		res.ID, res.UserID, res.Headline, res.RawText)
	return err
}

func (r *CareerRepository) FindResumeByUser(ctx context.Context, userID uuid.UUID) (*career.Resume, error) {
	var res career.Resume
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, headline, raw_text, created_at, updated_at
		FROM resumes WHERE user_id = $1`, userID).
		Scan(&res.ID, &res.UserID, &res.Headline, &res.RawText, &res.CreatedAt, &res.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, career.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *CareerRepository) UpsertJob(ctx context.Context, j *career.Job) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO jobs (id, user_id, title, seniority, stack, raw_text)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) DO UPDATE
		SET title = EXCLUDED.title, seniority = EXCLUDED.seniority,
		    stack = EXCLUDED.stack, raw_text = EXCLUDED.raw_text, updated_at = now()`,
		j.ID, j.UserID, j.Title, j.Seniority, j.Stack, j.RawText)
	return err
}

func (r *CareerRepository) FindJobByUser(ctx context.Context, userID uuid.UUID) (*career.Job, error) {
	var j career.Job
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, title, seniority, stack, raw_text, created_at, updated_at
		FROM jobs WHERE user_id = $1`, userID).
		Scan(&j.ID, &j.UserID, &j.Title, &j.Seniority, &j.Stack, &j.RawText, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, career.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &j, nil
}

func (r *CareerRepository) SaveInterview(ctx context.Context, i *career.Interview) error {
	turns, err := json.Marshal(i.Turns)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO interviews (id, user_id, level, turns) VALUES ($1, $2, $3, $4)`,
		i.ID, i.UserID, i.Level, turns)
	return err
}

func (r *CareerRepository) FindLatestInterviewByUser(ctx context.Context, userID uuid.UUID) (*career.Interview, error) {
	var (
		i        career.Interview
		turnsRaw []byte
		created  time.Time
	)
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, level, turns, created_at
		FROM interviews WHERE user_id = $1
		ORDER BY created_at DESC LIMIT 1`, userID).
		Scan(&i.ID, &i.UserID, &i.Level, &turnsRaw, &created)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, career.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	i.CreatedAt = created
	if err := json.Unmarshal(turnsRaw, &i.Turns); err != nil {
		return nil, err
	}
	return &i, nil
}

func (r *CareerRepository) UpsertAISettings(ctx context.Context, s *career.AISettings) error {
	enc, err := r.box.Encrypt(s.APIKey)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO ai_settings (user_id, provider, api_key_enc, model)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE
		SET provider = EXCLUDED.provider, api_key_enc = EXCLUDED.api_key_enc,
		    model = EXCLUDED.model, updated_at = now()`,
		s.UserID, s.Provider, enc, s.Model)
	return err
}

func (r *CareerRepository) FindAISettingsByUser(ctx context.Context, userID uuid.UUID) (*career.AISettings, error) {
	var (
		s   career.AISettings
		enc string
	)
	err := r.pool.QueryRow(ctx, `
		SELECT user_id, provider, api_key_enc, model, updated_at
		FROM ai_settings WHERE user_id = $1`, userID).
		Scan(&s.UserID, &s.Provider, &enc, &s.Model, &s.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, career.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if s.APIKey, err = r.box.Decrypt(enc); err != nil {
		return nil, err
	}
	return &s, nil
}
