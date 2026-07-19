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

	UpsertJob(ctx context.Context, j *Job) error
	FindJobByUser(ctx context.Context, userID uuid.UUID) (*Job, error)

	SaveInterview(ctx context.Context, i *Interview) error
	FindLatestInterviewByUser(ctx context.Context, userID uuid.UUID) (*Interview, error)

	UpsertAISettings(ctx context.Context, s *AISettings) error
	FindAISettingsByUser(ctx context.Context, userID uuid.UUID) (*AISettings, error)
}
