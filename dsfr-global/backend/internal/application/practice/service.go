package practice

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/domain/career"
	"github.com/dsfr-global/backend/internal/infrastructure/ai"
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

// CreateJob adds a new target job. The first job becomes the active one.
func (s *Service) CreateJob(ctx context.Context, userID uuid.UUID, in JobInput) (*career.Job, error) {
	existing, err := s.repo.ListJobsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	j := &career.Job{ID: uuid.New(), UserID: userID,
		Title: strings.TrimSpace(in.Title), Company: strings.TrimSpace(in.Company),
		Seniority: strings.TrimSpace(in.Seniority), Stack: strings.TrimSpace(in.Stack),
		RawText: strings.TrimSpace(in.RawText), IsActive: len(existing) == 0}
	if err := s.repo.CreateJob(ctx, j); err != nil {
		return nil, err
	}
	return s.repo.FindJobByID(ctx, userID, j.ID)
}

// UpdateJob edits an existing job.
func (s *Service) UpdateJob(ctx context.Context, userID, jobID uuid.UUID, in JobInput) (*career.Job, error) {
	j := &career.Job{ID: jobID, UserID: userID,
		Title: strings.TrimSpace(in.Title), Company: strings.TrimSpace(in.Company),
		Seniority: strings.TrimSpace(in.Seniority), Stack: strings.TrimSpace(in.Stack),
		RawText: strings.TrimSpace(in.RawText)}
	if err := s.repo.UpdateJob(ctx, j); err != nil {
		return nil, err
	}
	return s.repo.FindJobByID(ctx, userID, jobID)
}

// DeleteJob removes a job.
func (s *Service) DeleteJob(ctx context.Context, userID, jobID uuid.UUID) error {
	return s.repo.DeleteJob(ctx, userID, jobID)
}

// ListJobs returns all target jobs (active first).
func (s *Service) ListJobs(ctx context.Context, userID uuid.UUID) ([]career.Job, error) {
	return s.repo.ListJobsByUser(ctx, userID)
}

// SetActiveJob marks which job practice sessions target by default.
func (s *Service) SetActiveJob(ctx context.Context, userID, jobID uuid.UUID) error {
	return s.repo.SetActiveJob(ctx, userID, jobID)
}

// LatestInterview returns the most recent generated script.
func (s *Service) LatestInterview(ctx context.Context, userID uuid.UUID) (*career.Interview, error) {
	return s.repo.FindLatestInterviewByUser(ctx, userID)
}

// SaveAISettings stores the user's own provider + API key (BYOK).
func (s *Service) SaveAISettings(ctx context.Context, userID uuid.UUID, in AISettingsInput) (*career.AISettings, error) {
	set := &career.AISettings{UserID: userID, Provider: in.Provider,
		APIKey: strings.TrimSpace(in.APIKey), Model: strings.TrimSpace(in.Model)}
	if err := s.repo.UpsertAISettings(ctx, set); err != nil {
		return nil, err
	}
	return s.repo.FindAISettingsByUser(ctx, userID)
}

// GetAISettings fetches the user's provider config (key included; handler masks it).
func (s *Service) GetAISettings(ctx context.Context, userID uuid.UUID) (*career.AISettings, error) {
	return s.repo.FindAISettingsByUser(ctx, userID)
}

// completerFor resolves the LLM to use: the user's own key first, then the
// server-wide default. This is what lets each user bring their own key.
func (s *Service) completerFor(ctx context.Context, userID uuid.UUID) (Completer, error) {
	set, err := s.repo.FindAISettingsByUser(ctx, userID)
	if err == nil && set.APIKey != "" {
		return ai.ForProvider(set.Provider, set.APIKey, set.Model)
	}
	return s.llm, nil
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
	var job *career.Job
	if in.JobID != "" {
		jobID, parseErr := uuid.Parse(in.JobID)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid job id")
		}
		job, err = s.repo.FindJobByID(ctx, userID, jobID)
	} else {
		job, err = s.repo.FindActiveJob(ctx, userID)
	}
	if err != nil {
		return nil, fmt.Errorf("job: %w", err)
	}

	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return nil, err
	}

	prompt := buildPrompt(resume, job, level)
	text, err := llm.Complete(ctx, prompt, 4000)
	if err != nil {
		return nil, err
	}
	turns, err := parseTurns(text)
	if err != nil {
		return nil, err
	}

	interview := &career.Interview{ID: uuid.New(), UserID: userID, Level: level,
		JobID: job.ID, Turns: turns, CreatedAt: time.Now().UTC()}
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

// EvaluateAnswer sends the user's spoken transcript to the LLM, which grades it
// against the expected answer and returns actionable coaching tips.
func (s *Service) EvaluateAnswer(ctx context.Context, userID uuid.UUID, in EvaluateInput) (*EvaluationOutput, error) {
	interviewID, err := uuid.Parse(in.InterviewID)
	if err != nil {
		return nil, fmt.Errorf("invalid interview id")
	}
	interview, err := s.repo.FindLatestInterviewByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if in.TurnIndex < 0 || in.TurnIndex >= len(interview.Turns) {
		return nil, fmt.Errorf("invalid turn index")
	}
	turn := interview.Turns[in.TurnIndex]

	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return nil, err
	}
	prompt := buildEvaluationPrompt(turn.Interviewer, turn.Answer, in.Transcript)
	text, err := llm.Complete(ctx, prompt, 1200)
	if err != nil {
		return nil, err
	}
	out, err := parseEvaluation(text)
	if err != nil {
		return nil, err
	}

	eval := &career.AnswerEvaluation{ID: uuid.New(), UserID: userID, InterviewID: interviewID,
		TurnIndex: in.TurnIndex, Transcript: in.Transcript, Score: out.Score,
		Fluency: out.Fluency, Grammar: out.Grammar, Vocabulary: out.Vocabulary,
		Tips: out.Tips, Improved: out.Improved, CreatedAt: time.Now().UTC()}
	if err := s.repo.SaveEvaluation(ctx, eval); err != nil {
		return nil, err
	}
	return out, nil
}

// Scores returns the aggregated DSFR Score for the dashboard.
func (s *Service) Scores(ctx context.Context, userID uuid.UUID) (*career.Scores, error) {
	return s.repo.ComputeScores(ctx, userID)
}

func buildEvaluationPrompt(question, expected, transcript string) string {
	return fmt.Sprintf(`You are an English-for-work coach evaluating a spoken interview answer.

INTERVIEWER QUESTION:
%s

MODEL ANSWER (what the candidate was practicing):
%s

WHAT THE CANDIDATE ACTUALLY SAID (speech-to-text transcript, so punctuation may be missing):
%s

Grade the candidate's spoken answer from 0 to 100 on each dimension. Judge the
transcript for content, grammar and word choice; ignore missing punctuation and
minor transcription noise. Be encouraging but honest.

Give 2-3 short, specific, actionable tips (each under 20 words) — point at real
mistakes in what they said, not generic advice.

"improved" must be a better version of THEIR answer: keep their own ideas and
facts, but fix grammar and make it sound natural and professional. Keep it
speakable and roughly the same length.

Respond with ONLY this JSON, no markdown, no commentary:
{"score":0,"fluency":0,"grammar":0,"vocabulary":0,"tips":["..."],"improved":"..."}`,
		question, expected, transcript)
}

func parseEvaluation(text string) (*EvaluationOutput, error) {
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
	var out EvaluationOutput
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	return &out, nil
}
