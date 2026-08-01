// Package practice contains the interview-practice use cases.
package practice

import "github.com/dsfr-global/backend/internal/domain/career"

// ResumeInput creates/updates the user's résumé.
type ResumeInput struct {
	Headline string `json:"headline" binding:"max=160"`
	RawText  string `json:"raw_text" binding:"required,min=50"`
}

// JobInput creates/updates one of the user's target jobs.
type JobInput struct {
	Title     string `json:"title" binding:"required,max=160"`
	Company   string `json:"company" binding:"max=160"`
	Seniority string `json:"seniority" binding:"max=80"`
	Stack     string `json:"stack" binding:"max=255"`
	RawText   string `json:"raw_text" binding:"required,min=30"`
}

// GenerateInput requests a new interview script, optionally for a specific job.
//
// Topics narrows the technical questions to chosen subjects (empty = let the
// job posting decide). Focus shifts what the script optimises for: spoken
// English, technical depth, or a balance of both.
type GenerateInput struct {
	Level  string   `json:"level" binding:"omitempty,oneof=beginner intermediate advanced"`
	JobID  string   `json:"job_id" binding:"omitempty,uuid"`
	Topics []string `json:"topics" binding:"omitempty,max=10,dive,max=40"`
	Focus  string   `json:"focus" binding:"omitempty,oneof=language technical mixed"`
}

// EvaluateInput submits what the user actually said for one answer.
type EvaluateInput struct {
	InterviewID string `json:"interview_id" binding:"required,uuid"`
	TurnIndex   int    `json:"turn_index"`
	Transcript  string `json:"transcript" binding:"required,min=1"`
}

// EvaluationOutput is the AI feedback for one spoken answer.
//
// Content, Covered and Missed are zero/empty for turns with no expected points
// (older scripts), which the frontend reads as "language-only feedback".
type EvaluationOutput struct {
	Score      int      `json:"score"`
	Fluency    int      `json:"fluency"`
	Grammar    int      `json:"grammar"`
	Vocabulary int      `json:"vocabulary"`
	Content    int      `json:"content"`
	Topic      string   `json:"topic"`
	Covered    []string `json:"covered"`
	Missed     []string `json:"missed"`
	Tips       []string `json:"tips"`
	Improved   string   `json:"improved"`
}

// TopicScoreOutput is one row of the per-topic performance breakdown.
type TopicScoreOutput struct {
	Topic          string `json:"topic"`
	Label          string `json:"label"`
	Answers        int    `json:"answers"`
	AverageScore   int    `json:"average_score"`
	AverageContent int    `json:"average_content"`
}

// InterviewOutput is the script returned to the frontend.
type InterviewOutput struct {
	ID        string                 `json:"id"`
	Level     string                 `json:"level"`
	Turns     []career.InterviewTurn `json:"turns"`
	CreatedAt string                 `json:"created_at"`
}

// AISettingsInput registers the user's own AI provider key.
type AISettingsInput struct {
	Provider string `json:"provider" binding:"required,oneof=openai anthropic gemini"`
	APIKey   string `json:"api_key" binding:"required,min=20"`
	Model    string `json:"model" binding:"max=80"`
}

// AISettingsOutput never exposes the full key.
type AISettingsOutput struct {
	Provider      string `json:"provider"`
	Model         string `json:"model"`
	HasKey        bool   `json:"has_key"`
	MaskedKey     string `json:"masked_key"`
	ServerDefault bool   `json:"server_default"` // true if the server has its own fallback key
}

// PrepInput requests a prep pack for a specific job.
type PrepInput struct {
	JobID string `json:"job_id" binding:"required,uuid"`
}

// DebriefInput is the user's own account of a real interview they just had.
type DebriefInput struct {
	JobID string `json:"job_id" binding:"omitempty,uuid"`
	Notes string `json:"notes" binding:"required,min=40"`
}
