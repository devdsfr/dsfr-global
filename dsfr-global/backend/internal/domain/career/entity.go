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

// Job is the user's current target job posting.
type Job struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Title     string // e.g. "Java Developer"
	Seniority string // e.g. "Mid-level"
	Stack     string // e.g. "Java, Spring Boot, AWS"
	RawText   string // full posting text
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
	Level     string // beginner | intermediate | advanced
	Turns     []InterviewTurn
	CreatedAt time.Time
}
