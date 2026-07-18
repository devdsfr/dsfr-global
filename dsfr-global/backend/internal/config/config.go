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
	RedisAddr          string
	RedisPassword      string
	JWTSecret          string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	PasswordResetTTL   time.Duration
	AllowedOrigins     string
	RateLimitPerMinute int
}

// Load reads configuration from the environment, applying sane defaults for dev.
func Load() (*Config, error) {
	cfg := &Config{
		Env:                getEnv("APP_ENV", "development"),
		HTTPPort:           getEnv("HTTP_PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://dsfr:dsfr@localhost:5432/dsfr_global?sslmode=disable"),
		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		JWTSecret:          getEnv("JWT_SECRET", ""),
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
