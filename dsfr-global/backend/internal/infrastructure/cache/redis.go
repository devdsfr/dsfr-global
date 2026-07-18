// Package cache wraps Redis for refresh tokens and password-reset tokens.
package cache

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// TokenStore persists opaque tokens (refresh / password reset) with TTL.
type TokenStore struct{ client *redis.Client }

// NewTokenStore connects to Redis and pings it to fail fast on bad config.
func NewTokenStore(ctx context.Context, addr, password string) (*TokenStore, error) {
	c := redis.NewClient(&redis.Options{Addr: addr, Password: password})
	if err := c.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}
	return &TokenStore{client: c}, nil
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// IssueRefreshToken creates an opaque refresh token bound to a user ID.
func (s *TokenStore) IssueRefreshToken(ctx context.Context, userID string, ttl time.Duration) (string, error) {
	tok, err := randomToken()
	if err != nil {
		return "", err
	}
	if err := s.client.Set(ctx, "refresh:"+tok, userID, ttl).Err(); err != nil {
		return "", err
	}
	return tok, nil
}

// ConsumeRefreshToken validates and rotates (deletes) a refresh token, returning the user ID.
func (s *TokenStore) ConsumeRefreshToken(ctx context.Context, token string) (string, error) {
	key := "refresh:" + token
	userID, err := s.client.Get(ctx, key).Result()
	if err != nil {
		return "", fmt.Errorf("refresh token invalid or expired")
	}
	s.client.Del(ctx, key)
	return userID, nil
}

// RevokeRefreshToken deletes a refresh token (logout).
func (s *TokenStore) RevokeRefreshToken(ctx context.Context, token string) error {
	return s.client.Del(ctx, "refresh:"+token).Err()
}

// IssuePasswordResetToken creates a short-lived reset token bound to a user ID.
func (s *TokenStore) IssuePasswordResetToken(ctx context.Context, userID string, ttl time.Duration) (string, error) {
	tok, err := randomToken()
	if err != nil {
		return "", err
	}
	if err := s.client.Set(ctx, "pwdreset:"+tok, userID, ttl).Err(); err != nil {
		return "", err
	}
	return tok, nil
}

// ConsumePasswordResetToken validates and deletes a reset token, returning the user ID.
func (s *TokenStore) ConsumePasswordResetToken(ctx context.Context, token string) (string, error) {
	key := "pwdreset:" + token
	userID, err := s.client.Get(ctx, key).Result()
	if err != nil {
		return "", fmt.Errorf("reset token invalid or expired")
	}
	s.client.Del(ctx, key)
	return userID, nil
}
