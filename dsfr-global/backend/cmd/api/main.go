// Command api is the DSFR Global HTTP API entrypoint (composition root).
package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/dsfr-global/backend/internal/application/auth"
	"github.com/dsfr-global/backend/internal/application/practice"
	"github.com/dsfr-global/backend/internal/config"
	"github.com/dsfr-global/backend/internal/infrastructure/ai"
	"github.com/dsfr-global/backend/internal/infrastructure/persistence/postgres"
	"github.com/dsfr-global/backend/internal/infrastructure/security"
	"github.com/dsfr-global/backend/internal/interfaces/http/handlers"
	"github.com/dsfr-global/backend/internal/interfaces/http/router"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		fatal("config", err)
	}

	pool, err := postgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		fatal("postgres", err)
	}
	defer pool.Close()

	// Ensure schema exists (Neon has no init hooks). Idempotent.
	if err := postgres.Migrate(ctx, pool); err != nil {
		fatal("migrate", err)
	}

	// Dependency injection: wire infrastructure into application services.
	users := postgres.NewUserRepository(pool)
	store := postgres.NewTokenStore(pool)
	careerRepo := postgres.NewCareerRepository(pool)
	llm := ai.New(cfg.AnthropicAPIKey, cfg.AnthropicModel, cfg.OpenAIAPIKey, cfg.OpenAIModel)
	hasher := security.NewBcryptHasher()
	tokens := security.NewTokenManager(cfg.JWTSecret, cfg.AccessTokenTTL)

	authService := auth.NewService(users, hasher, tokens, store, auth.LogMailer{},
		cfg.RefreshTokenTTL, cfg.PasswordResetTTL)
	practiceService := practice.NewService(careerRepo, llm)

	authHandler := handlers.NewAuthHandler(authService)
	practiceHandler := handlers.NewPracticeHandler(practiceService)

	if !llm.Configured() {
		slog.Warn("no AI key set (ANTHROPIC_API_KEY or OPENAI_API_KEY): interview generation will return 503")
	}

	r := router.New(cfg, tokens, authHandler, practiceHandler)
	slog.Info("dsfr-global api listening", "port", cfg.HTTPPort, "env", cfg.Env)
	if err := r.Run(":" + cfg.HTTPPort); err != nil {
		fatal("http", err)
	}
}

func fatal(stage string, err error) {
	slog.Error("startup failed", "stage", stage, "error", err)
	os.Exit(1)
}
