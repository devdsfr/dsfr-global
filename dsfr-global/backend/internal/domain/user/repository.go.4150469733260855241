package user

import (
	"context"

	"github.com/google/uuid"
)

// Repository is the persistence contract for the User aggregate (Repository Pattern).
type Repository interface {
	Create(ctx context.Context, u *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
}
