package practice

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/domain/career"
)

// Completer is the LLM port. Infrastructure provides an Anthropic-backed one.
type Completer interface {
	Complete(ctx context.Context, prompt string, maxTokens int) (string, error)
	Configured() bool
}

// Service implements résumé/job registration and AI interview generation.
type Service struct {
	repo career.Repository
	llm  Completer
}

// NewService wires the practice use cases.
func NewService(repo career.Repository, llm Completer) *Service {
	return &Service{repo: repo, llm: llm}
}

// AIConfigured reports whether interview generation is available.
func (s *Service) AIConfigured() bool { return s.llm.Configured() }

// SaveResume upserts the user's résumé.
func (s *Service) SaveResume(ctx context.Context, userID uuid.UUID, in ResumeInput) (*career.Resume, error) {
	r := &career.Resume{ID: uuid.New(), UserID: userID,
		Headline: strings.TrimSpace(in.Headline), RawText: strings.TrimSpace(in.RawText)}
	if err := s.repo.UpsertResume(ctx, r); err != nil {
		return nil, err
	}
	return s.repo.FindResumeByUser(ctx, userID)
}

// GetResume fetches the user's résumé.
func (s *Service) GetResume(ctx context.Context, userID uuid.UUID) (*career.Resume, error) {
	return s.repo.FindResumeByUser(ctx, userID)
}

// SaveJob upserts the user's target job.
func (s *Service) SaveJob(ctx context.Context, userID uuid.UUID, in JobInput) (*career.Job, error) {
	j := &career.Job{ID: uuid.New(), UserID: userID,
		Title: strings.TrimSpace(in.Title), Seniority: strings.TrimSpace(in.Seniority),
		Stack: strings.TrimSpace(in.Stack), RawText: strings.TrimSpace(in.RawText)}
	if err := s.repo.UpsertJob(ctx, j); err != nil {
		return nil, err
	}
	return s.repo.FindJobByUser(ctx, userID)
}

// GetJob fetches the user's target job.
func (s *Service) GetJob(ctx context.Context, userID uuid.UUID) (*career.Job, error) {
	return s.repo.FindJobByUser(ctx, userID)
}

// LatestInterview returns the most recent generated script.
func (s *Service) LatestInterview(ctx context.Context, userID uuid.UUID) (*career.Interview, error) {
	return s.repo.FindLatestInterviewByUser(ctx, userID)
}

// GenerateInterview builds a personalized interview script from the stored
// résumé + target job via the LLM, saves it, and returns it.
func (s *Service) GenerateInterview(ctx context.Context, userID uuid.UUID, in GenerateInput) (*career.Interview, error) {
	level := in.Level
	if level == "" {
		level = "beginner"
	}
	resume, err := s.repo.FindResumeByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("resume: %w", err)
	}
	job, err := s.repo.FindJobByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("job: %w", err)
	}

	prompt := buildPrompt(resume, job, level)
	text, err := s.llm.Complete(ctx, prompt, 4000)
	if err != nil {
		return nil, err
	}
	turns, err := parseTurns(text)
	if err != nil {
		return nil, err
	}

	interview := &career.Interview{ID: uuid.New(), UserID: userID, Level: level,
		Turns: turns, CreatedAt: time.Now().UTC()}
	if err := s.repo.SaveInterview(ctx, interview); err != nil {
		return nil, err
	}
	return interview, nil
}

func buildPrompt(resume *career.Resume, job *career.Job, level string) string {
	levelGuide := map[string]string{
		"beginner":     "The candidate is a beginner English speaker (A2). Answers must use very simple, natural spoken English: short sentences, common words, no idioms. 40-70 words per answer.",
		"intermediate": "The candidate is an intermediate English speaker (B1-B2). Answers should use natural spoken English with moderate complexity. 60-90 words per answer.",
		"advanced":     "The candidate is an advanced English speaker (C1). Answers can use rich, natural professional English. 80-120 words per answer.",
	}
	return fmt.Sprintf(`You are generating a mock job-interview script for a tech professional practicing spoken English.

TARGET JOB:
Title: %s
Seniority: %s
Stack: %s
Posting:
%s

CANDIDATE RESUME:
%s

Create an interview with EXACTLY 8 turns:
- Turns 1-2: HR/behavioral questions (introduction, motivation).
- Turns 3-7: technical questions about the job's stack, appropriate for the seniority.
- Turn 8: "Do you have any questions for us?" — the answer asks one good question back.

%s

The "answer" is what the candidate will READ ALOUD from a teleprompter, so it must be first-person, natural to speak, and grounded in the resume facts (do not invent employers or dates).

Respond with ONLY this JSON, no markdown, no commentary:
{"turns":[{"interviewer":"...","answer":"..."}]}`,
		job.Title, job.Seniority, job.Stack, truncate(job.RawText, 3000),
		truncate(resume.RawText, 4000), levelGuide[level])
}

func parseTurns(text string) ([]career.InterviewTurn, error) {
	// Strip accidental markdown fences and find the JSON object.
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	if i := strings.Index(text, "{"); i > 0 {
		text = text[i:]
	}
	if i := strings.LastIndex(text, "}"); i >= 0 {
		text = text[:i+1]
	}
	var payload struct {
		Turns []career.InterviewTurn `json:"turns"`
	}
	if err := json.Unmarshal([]byte(text), &payload); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	if len(payload.Turns) == 0 {
		return nil, fmt.Errorf("AI returned an empty script, try again")
	}
	return payload.Turns, nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
