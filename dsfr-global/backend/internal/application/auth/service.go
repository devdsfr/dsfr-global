package auth

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/domain/user"
	"github.com/dsfr-global/backend/internal/infrastructure/security"
)

// Mailer sends transactional messages. In dev it can simply log.
type Mailer interface {
	SendPasswordReset(ctx context.Context, email, token string) error
}

// TokenStore issues and consumes opaque refresh/reset tokens. The application
// layer depends on this interface, not on a concrete backend (Postgres today).
type TokenStore interface {
	IssueRefreshToken(ctx context.Context, userID string, ttl time.Duration) (string, error)
	ConsumeRefreshToken(ctx context.Context, token string) (string, error)
	RevokeRefreshToken(ctx context.Context, token string) error
	IssuePasswordResetToken(ctx context.Context, userID string, ttl time.Duration) (string, error)
	ConsumePasswordResetToken(ctx context.Context, token string) (string, error)
}

// Service implements the authentication use cases.
type Service struct {
	users      user.Repository
	hasher     security.PasswordHasher
	tokens     *security.TokenManager
	store      TokenStore
	mailer     Mailer
	refreshTTL time.Duration
	resetTTL   time.Duration
}

// NewService wires the auth use cases (Dependency Injection at the composition root).
func NewService(users user.Repository, hasher security.PasswordHasher, tokens *security.TokenManager,
	store TokenStore, mailer Mailer, refreshTTL, resetTTL time.Duration) *Service {
	return &Service{users: users, hasher: hasher, tokens: tokens, store: store,
		mailer: mailer, refreshTTL: refreshTTL, resetTTL: resetTTL}
}

// Register creates a new account and returns the public user.
func (s *Service) Register(ctx context.Context, in RegisterInput) (*UserOutput, error) {
	hash, err := s.hasher.Hash(in.Password)
	if err != nil {
		return nil, err
	}
	u := user.NewUser(strings.TrimSpace(in.Name), normalizeEmail(in.Email), hash)
	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}
	return toOutput(u), nil
}

// Login verifies credentials and issues an access/refresh token pair.
func (s *Service) Login(ctx context.Context, in LoginInput) (*TokenPair, *UserOutput, error) {
	u, err := s.users.FindByEmail(ctx, normalizeEmail(in.Email))
	if err != nil {
		return nil, nil, user.ErrInvalidCredentials
	}
	if !s.hasher.Compare(u.PasswordHash, in.Password) {
		return nil, nil, user.ErrInvalidCredentials
	}
	pair, err := s.issuePair(ctx, u.ID)
	if err != nil {
		return nil, nil, err
	}
	return pair, toOutput(u), nil
}

// Refresh rotates a refresh token and issues a new pair.
func (s *Service) Refresh(ctx context.Context, in RefreshInput) (*TokenPair, error) {
	userID, err := s.store.ConsumeRefreshToken(ctx, in.RefreshToken)
	if err != nil {
		return nil, user.ErrInvalidCredentials
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		return nil, user.ErrInvalidCredentials
	}
	return s.issuePair(ctx, id)
}

// Logout revokes the refresh token.
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	return s.store.RevokeRefreshToken(ctx, refreshToken)
}

// ForgotPassword issues a reset token and emails it. Always succeeds from the
// caller's perspective to avoid email enumeration.
func (s *Service) ForgotPassword(ctx context.Context, in ForgotPasswordInput) error {
	u, err := s.users.FindByEmail(ctx, normalizeEmail(in.Email))
	if err != nil {
		return nil // do not reveal whether the email exists
	}
	tok, err := s.store.IssuePasswordResetToken(ctx, u.ID.String(), s.resetTTL)
	if err != nil {
		return err
	}
	return s.mailer.SendPasswordReset(ctx, u.Email, tok)
}

// ResetPassword consumes a reset token and stores the new password hash.
func (s *Service) ResetPassword(ctx context.Context, in ResetPasswordInput) error {
	userID, err := s.store.ConsumePasswordResetToken(ctx, in.Token)
	if err != nil {
		return user.ErrInvalidCredentials
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		return user.ErrInvalidCredentials
	}
	hash, err := s.hasher.Hash(in.NewPassword)
	if err != nil {
		return err
	}
	return s.users.UpdatePassword(ctx, id, hash)
}

// Me returns the public profile of the authenticated user.
func (s *Service) Me(ctx context.Context, id uuid.UUID) (*UserOutput, error) {
	u, err := s.users.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toOutput(u), nil
}

func (s *Service) issuePair(ctx context.Context, id uuid.UUID) (*TokenPair, error) {
	access, err := s.tokens.Generate(id)
	if err != nil {
		return nil, err
	}
	refresh, err := s.store.IssueRefreshToken(ctx, id.String(), s.refreshTTL)
	if err != nil {
		return nil, err
	}
	return &TokenPair{AccessToken: access, RefreshToken: refresh}, nil
}

func normalizeEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

func toOutput(u *user.User) *UserOutput {
	return &UserOutput{ID: u.ID.String(), Name: u.Name, Email: u.Email}
}
