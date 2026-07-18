// Package practice contains the interview-practice use cases.
package practice

import "github.com/dsfr-global/backend/internal/domain/career"

// ResumeInput creates/updates the user's résumé.
type ResumeInput struct {
	Headline string `json:"headline" binding:"max=160"`
	RawText  string `json:"raw_text" binding:"required,min=50"`
}

// JobInput creates/updates the user's target job.
type JobInput struct {
	Title     string `json:"title" binding:"required,max=160"`
	Seniority string `json:"seniority" binding:"max=80"`
	Stack     string `json:"stack" binding:"max=255"`
	RawText   string `json:"raw_text" binding:"required,min=30"`
}

// GenerateInput requests a new interview script.
type GenerateInput struct {
	Level string `json:"level" binding:"omitempty,oneof=beginner intermediate advanced"`
}

// InterviewOutput is the script returned to the frontend.
type InterviewOutput struct {
	ID        string                 `json:"id"`
	Level     string                 `json:"level"`
	Turns     []career.InterviewTurn `json:"turns"`
	CreatedAt string                 `json:"created_at"`
}
