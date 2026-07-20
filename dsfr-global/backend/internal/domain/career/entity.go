// Package career holds the aggregates for the user's career assets:
// their résumé, their target job, and generated interview scripts.
package career

import (
	"time"

	"github.com/google/uuid"
)

// Resume is the user's résumé (pasted text for now; parsed uploads later).
type Resume struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Headline  string // e.g. "Senior Backend Developer — Java / Spring"
	RawText   string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Job is one of the user's target job openings. A user tracks several at once
// and marks one active, which is the default target for practice sessions.
type Job struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Title     string // e.g. "Java Developer"
	Company   string
	Seniority string // e.g. "Mid-level"
	Stack     string // e.g. "Java, Spring Boot, AWS"
	RawText   string // full posting text
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

// InterviewTurn is one exchange: the interviewer's question and the model
// answer shown on the teleprompter for the candidate to read aloud.
type InterviewTurn struct {
	Interviewer string `json:"interviewer"`
	Answer      string `json:"answer"`
}

// Interview is a generated interview script for practice sessions.
type Interview struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	JobID     uuid.UUID
	Level     string // beginner | intermediate | advanced
	Turns     []InterviewTurn
	CreatedAt time.Time
}

// AISettings holds the user's own LLM provider configuration (BYOK —
// bring your own key). The key is encrypted at rest.
type AISettings struct {
	UserID    uuid.UUID
	Provider  string // openai | anthropic | gemini
	APIKey    string // plaintext in memory only; encrypted in storage
	Model     string // optional override; empty = provider default
	UpdatedAt time.Time
}

// AnswerEvaluation is the AI's assessment of one spoken answer.
type AnswerEvaluation struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	InterviewID uuid.UUID
	TurnIndex   int
	Transcript  string
	Score       int      // 0-100 overall for this answer
	Fluency     int      // 0-100
	Grammar     int      // 0-100
	Vocabulary  int      // 0-100
	Tips        []string // actionable improvements
	Improved    string   // a better way to say it
	CreatedAt   time.Time
}

// Scores is the aggregated DSFR Score shown on the dashboard.
type Scores struct {
	OverallReadiness       int `json:"overall_readiness"`
	Interview              int `json:"interview"`
	Speaking               int `json:"speaking"`
	TechnicalCommunication int `json:"technical_communication"`
	AnswersPracticed       int `json:"answers_practiced"`
}
