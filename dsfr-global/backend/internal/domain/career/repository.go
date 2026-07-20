package career

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

// ErrNotFound is returned when the user has no stored resume/job/interview yet.
var ErrNotFound = errors.New("not found")

// Repository is the persistence contract for career assets.
type Repository interface {
	UpsertResume(ctx context.Context, r *Resume) error
	FindResumeByUser(ctx context.Context, userID uuid.UUID) (*Resume, error)

	CreateJob(ctx context.Context, j *Job) error
	UpdateJob(ctx context.Context, j *Job) error
	DeleteJob(ctx context.Context, userID, jobID uuid.UUID) error
	ListJobsByUser(ctx context.Context, userID uuid.UUID) ([]Job, error)
	FindJobByID(ctx context.Context, userID, jobID uuid.UUID) (*Job, error)
	FindActiveJob(ctx context.Context, userID uuid.UUID) (*Job, error)
	SetActiveJob(ctx context.Context, userID, jobID uuid.UUID) error

	SaveInterview(ctx context.Context, i *Interview) error
	FindLatestInterviewByUser(ctx context.Context, userID uuid.UUID) (*Interview, error)

	UpsertAISettings(ctx context.Context, s *AISettings) error
	FindAISettingsByUser(ctx context.Context, userID uuid.UUID) (*AISettings, error)

	SaveEvaluation(ctx context.Context, e *AnswerEvaluation) error
	ComputeScores(ctx context.Context, userID uuid.UUID) (*Scores, error)
}
