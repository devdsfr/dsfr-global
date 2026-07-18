// Package config centralizes environment-based configuration for the API.
package config

import (
	"fmt"
	"os"
	"time"
)

// Config holds all runtime configuration, loaded from environment variables.
type Config struct {
	Env                string
	HTTPPort           string
	DatabaseURL        string
	JWTSecret          string
	AnthropicAPIKey    string
	AnthropicModel     string
	OpenAIAPIKey       string
	OpenAIModel        string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	PasswordResetTTL   time.Duration
	AllowedOrigins     string
	RateLimitPerMinute int
}

// Load reads configuration from the environment, applying sane defaults for dev.
// It follows managed-host conventions: Render injects PORT; Neon provides the
// full DATABASE_URL connection string.
func Load() (*Config, error) {
	cfg := &Config{
		Env:                getEnv("APP_ENV", "development"),
		HTTPPort:           firstNonEmpty(os.Getenv("PORT"), getEnv("HTTP_PORT", "8080")),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://dsfr:dsfr@localhost:5432/dsfr_global?sslmode=disable"),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		AnthropicAPIKey:    getEnv("ANTHROPIC_API_KEY", ""),
		AnthropicModel:     getEnv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
		OpenAIAPIKey:       getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:        getEnv("OPENAI_MODEL", "gpt-4o-mini"),
		AccessTokenTTL:     15 * time.Minute,
		RefreshTokenTTL:    7 * 24 * time.Hour,
		PasswordResetTTL:   30 * time.Minute,
		AllowedOrigins:     getEnv("ALLOWED_ORIGINS", "http://localhost:4200"),
		RateLimitPerMinute: 120,
	}
	if cfg.JWTSecret == "" {
		if cfg.Env == "development" {
			cfg.JWTSecret = "dev-only-secret-change-me"
		} else {
			return nil, fmt.Errorf("JWT_SECRET is required outside development")
		}
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
