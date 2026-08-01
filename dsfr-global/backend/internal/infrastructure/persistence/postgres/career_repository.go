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

func (r *CareerRepository) CreateJob(ctx context.Context, j *career.Job) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO jobs (id, user_id, title, company, seniority, stack, raw_text, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		j.ID, j.UserID, j.Title, j.Company, j.Seniority, j.Stack, j.RawText, j.IsActive)
	return err
}

func (r *CareerRepository) UpdateJob(ctx context.Context, j *career.Job) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE jobs SET title=$3, company=$4, seniority=$5, stack=$6, raw_text=$7, updated_at=now()
		WHERE id=$1 AND user_id=$2`,
		j.ID, j.UserID, j.Title, j.Company, j.Seniority, j.Stack, j.RawText)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return career.ErrNotFound
	}
	return nil
}

func (r *CareerRepository) DeleteJob(ctx context.Context, userID, jobID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM jobs WHERE id=$1 AND user_id=$2`, jobID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return career.ErrNotFound
	}
	return nil
}

func (r *CareerRepository) ListJobsByUser(ctx context.Context, userID uuid.UUID) ([]career.Job, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, title, company, seniority, stack, raw_text, is_active, created_at, updated_at
		FROM jobs WHERE user_id=$1 ORDER BY is_active DESC, created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := []career.Job{}
	for rows.Next() {
		var j career.Job
		if err := rows.Scan(&j.ID, &j.UserID, &j.Title, &j.Company, &j.Seniority, &j.Stack,
			&j.RawText, &j.IsActive, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}

func (r *CareerRepository) FindJobByID(ctx context.Context, userID, jobID uuid.UUID) (*career.Job, error) {
	return r.scanJob(r.pool.QueryRow(ctx, `
		SELECT id, user_id, title, company, seniority, stack, raw_text, is_active, created_at, updated_at
		FROM jobs WHERE id=$1 AND user_id=$2`, jobID, userID))
}

// FindActiveJob returns the job flagged active, falling back to the most
// recent one so practice still works if nothing was explicitly selected.
func (r *CareerRepository) FindActiveJob(ctx context.Context, userID uuid.UUID) (*career.Job, error) {
	return r.scanJob(r.pool.QueryRow(ctx, `
		SELECT id, user_id, title, company, seniority, stack, raw_text, is_active, created_at, updated_at
		FROM jobs WHERE user_id=$1 ORDER BY is_active DESC, created_at DESC LIMIT 1`, userID))
}

func (r *CareerRepository) SetActiveJob(ctx context.Context, userID, jobID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE jobs SET is_active=FALSE WHERE user_id=$1`, userID); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `UPDATE jobs SET is_active=TRUE WHERE id=$1 AND user_id=$2`, jobID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return career.ErrNotFound
	}
	return tx.Commit(ctx)
}

func (r *CareerRepository) scanJob(row pgx.Row) (*career.Job, error) {
	var j career.Job
	err := row.Scan(&j.ID, &j.UserID, &j.Title, &j.Company, &j.Seniority, &j.Stack,
		&j.RawText, &j.IsActive, &j.CreatedAt, &j.UpdatedAt)
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
		INSERT INTO interviews (id, user_id, level, turns, job_id) VALUES ($1, $2, $3, $4, $5)`,
		i.ID, i.UserID, i.Level, turns, i.JobID)
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

func (r *CareerRepository) SaveEvaluation(ctx context.Context, e *career.AnswerEvaluation) error {
	tips, err := json.Marshal(e.Tips)
	if err != nil {
		return err
	}
	covered, err := json.Marshal(nonNil(e.Covered))
	if err != nil {
		return err
	}
	missed, err := json.Marshal(nonNil(e.Missed))
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO answer_evaluations
		  (id, user_id, interview_id, turn_index, transcript, score, fluency, grammar,
		   vocabulary, tips, improved, content, topic, covered, missed)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		e.ID, e.UserID, e.InterviewID, e.TurnIndex, e.Transcript,
		e.Score, e.Fluency, e.Grammar, e.Vocabulary, tips, e.Improved,
		e.Content, e.Topic, covered, missed)
	return err
}

// nonNil keeps a nil slice from marshalling to JSON null, which the NOT NULL
// jsonb columns would reject.
func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// TopicBreakdown averages each topic's answers so the UI can point the
// candidate at their weakest subject. Only topic-tagged rows participate.
func (r *CareerRepository) TopicBreakdown(ctx context.Context, userID uuid.UUID) ([]career.TopicScore, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT topic, COUNT(*), AVG(score), AVG(content)
		FROM answer_evaluations
		WHERE user_id=$1 AND topic <> ''
		GROUP BY topic
		ORDER BY AVG(content) ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]career.TopicScore, 0, len(career.Topics))
	for rows.Next() {
		var (
			ts                    career.TopicScore
			avgScore, avgContent  *float64
		)
		if err := rows.Scan(&ts.Topic, &ts.Answers, &avgScore, &avgContent); err != nil {
			return nil, err
		}
		if avgScore != nil {
			ts.AverageScore = int(*avgScore + 0.5)
		}
		if avgContent != nil {
			ts.AverageContent = int(*avgContent + 0.5)
		}
		ts.Label = career.TopicLabel(ts.Topic)
		out = append(out, ts)
	}
	return out, rows.Err()
}

// ComputeScores averages the user's 20 most recent answer evaluations into the
// dashboard's DSFR Score. Returns zeros when nothing has been practiced yet.
func (r *CareerRepository) ComputeScores(ctx context.Context, userID uuid.UUID) (*career.Scores, error) {
	var (
		s                                          career.Scores
		avgScore, avgFluency, avgGrammar, avgVocab *float64
		total                                      int
	)
	err := r.pool.QueryRow(ctx, `
		SELECT AVG(score), AVG(fluency), AVG(grammar), AVG(vocabulary), COUNT(*)
		FROM (
			SELECT score, fluency, grammar, vocabulary
			FROM answer_evaluations WHERE user_id=$1
			ORDER BY created_at DESC LIMIT 20
		) recent`, userID).
		Scan(&avgScore, &avgFluency, &avgGrammar, &avgVocab, &total)
	if err != nil {
		return nil, err
	}
	s.AnswersPracticed = total
	if total == 0 {
		// No simulated practice yet — real-interview debriefs alone can still
		// produce a score, so fall through instead of returning zeros.
		var (
			avgOnly   *float64
			countOnly int
		)
		if err := r.pool.QueryRow(ctx, `
			SELECT AVG(score), COUNT(*) FROM (
				SELECT score FROM debriefs WHERE user_id=$1 AND score > 0
				ORDER BY created_at DESC LIMIT 5
			) d`, userID).Scan(&avgOnly, &countOnly); err != nil {
			return nil, err
		}
		if countOnly > 0 && avgOnly != nil {
			v := int(*avgOnly + 0.5)
			s.RealInterviews = countOnly
			s.Interview = v
			s.OverallReadiness = v
		}
		return &s, nil
	}
	round := func(v *float64) int {
		if v == nil {
			return 0
		}
		return int(*v + 0.5)
	}
	s.Interview = round(avgScore)
	s.Speaking = round(avgFluency)
	s.TechnicalCommunication = round(avgVocab)
	// Overall blends the three, weighted toward interview performance.
	s.OverallReadiness = (s.Interview*2 + s.Speaking + s.TechnicalCommunication + round(avgGrammar)) / 5

	// Real interviews (debriefs) count double against simulated practice: how you
	// performed under real pressure is the better signal of readiness.
	var (
		avgDebrief   *float64
		debriefCount int
	)
	if err := r.pool.QueryRow(ctx, `
		SELECT AVG(score), COUNT(*) FROM (
			SELECT score FROM debriefs WHERE user_id=$1 AND score > 0
			ORDER BY created_at DESC LIMIT 5
		) d`, userID).Scan(&avgDebrief, &debriefCount); err != nil {
		return nil, err
	}
	if debriefCount > 0 {
		real := round(avgDebrief)
		s.RealInterviews = debriefCount
		s.Interview = (s.Interview + real*2) / 3
		s.OverallReadiness = (s.OverallReadiness + real*2) / 3
	}
	return &s, nil
}

func (r *CareerRepository) SavePrepPack(ctx context.Context, p *career.PrepPack) error {
	content, err := json.Marshal(p.Content)
	if err != nil {
		return err
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO prep_packs (id, user_id, job_id, content) VALUES ($1, $2, $3, $4)`,
		p.ID, p.UserID, p.JobID, content)
	return err
}

func (r *CareerRepository) FindLatestPrepPack(ctx context.Context, userID, jobID uuid.UUID) (*career.PrepPack, error) {
	var (
		p          career.PrepPack
		contentRaw []byte
	)
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, job_id, content, created_at
		FROM prep_packs WHERE user_id=$1 AND job_id=$2
		ORDER BY created_at DESC LIMIT 1`, userID, jobID).
		Scan(&p.ID, &p.UserID, &p.JobID, &contentRaw, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, career.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(contentRaw, &p.Content); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *CareerRepository) SaveDebrief(ctx context.Context, d *career.Debrief) error {
	analysis, err := json.Marshal(d.Analysis)
	if err != nil {
		return err
	}
	var jobID any
	if d.JobID != uuid.Nil {
		jobID = d.JobID
	}
	_, err = r.pool.Exec(ctx, `
		INSERT INTO debriefs (id, user_id, job_id, notes, score, analysis)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		d.ID, d.UserID, jobID, d.Notes, d.Score, analysis)
	return err
}

func (r *CareerRepository) ListDebriefsByUser(ctx context.Context, userID uuid.UUID, limit int) ([]career.Debrief, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, COALESCE(job_id, '00000000-0000-0000-0000-000000000000'::uuid),
		       notes, score, analysis, created_at
		FROM debriefs WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []career.Debrief{}
	for rows.Next() {
		var (
			d           career.Debrief
			analysisRaw []byte
		)
		if err := rows.Scan(&d.ID, &d.UserID, &d.JobID, &d.Notes, &d.Score,
			&analysisRaw, &d.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(analysisRaw, &d.Analysis); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}
