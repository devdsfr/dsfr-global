package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TokenStore persists opaque auth tokens (refresh / password reset) in Postgres.
// It replaces the earlier Redis-backed store: one less managed dependency, and
// token state lives right next to the users it belongs to (Neon). Consumption is
// atomic (DELETE ... RETURNING), so a token cannot be used twice.
type TokenStore struct{ pool *pgxpool.Pool }

// NewTokenStore wires the store to a connection pool.
func NewTokenStore(pool *pgxpool.Pool) *TokenStore { return &TokenStore{pool: pool} }

func randomAuthToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *TokenStore) issue(ctx context.Context, userID, kind string, ttl time.Duration) (string, error) {
	tok, err := randomAuthToken()
	if err != nil {
		return "", err
	}
	if _, err := s.pool.Exec(ctx,
		`INSERT INTO auth_tokens (token, user_id, kind, expires_at) VALUES ($1, $2, $3, $4)`,
		tok, userID, kind, time.Now().UTC().Add(ttl)); err != nil {
		return "", err
	}
	return tok, nil
}

// consume atomically validates (not expired) and deletes a token, returning its user id.
func (s *TokenStore) consume(ctx context.Context, token, kind string) (string, error) {
	var userID string
	err := s.pool.QueryRow(ctx,
		`DELETE FROM auth_tokens WHERE token = $1 AND kind = $2 AND expires_at > now() RETURNING user_id`,
		token, kind).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("token invalid or expired")
	}
	if err != nil {
		return "", err
	}
	return userID, nil
}

// IssueRefreshToken creates an opaque refresh token bound to a user ID.
func (s *TokenStore) IssueRefreshToken(ctx context.Context, userID string, ttl time.Duration) (string, error) {
	return s.issue(ctx, userID, "refresh", ttl)
}

// ConsumeRefreshToken validates and rotates (deletes) a refresh token, returning the user ID.
func (s *TokenStore) ConsumeRefreshToken(ctx context.Context, token string) (string, error) {
	return s.consume(ctx, token, "refresh")
}

// RevokeRefreshToken deletes a refresh token (logout).
func (s *TokenStore) RevokeRefreshToken(ctx context.Context, token string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM auth_tokens WHERE token = $1 AND kind = 'refresh'`, token)
	return err
}

// IssuePasswordResetToken creates a short-lived reset token bound to a user ID.
func (s *TokenStore) IssuePasswordResetToken(ctx context.Context, userID string, ttl time.Duration) (string, error) {
	return s.issue(ctx, userID, "reset", ttl)
}

// ConsumePasswordResetToken validates and deletes a reset token, returning the user ID.
func (s *TokenStore) ConsumePasswordResetToken(ctx context.Context, token string) (string, error) {
	return s.consume(ctx, token, "reset")
}
