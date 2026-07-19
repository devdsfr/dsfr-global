// Package router assembles all HTTP routes.
package router

import (
	"github.com/gin-gonic/gin"

	"github.com/dsfr-global/backend/internal/config"
	"github.com/dsfr-global/backend/internal/infrastructure/security"
	"github.com/dsfr-global/backend/internal/interfaces/http/handlers"
	"github.com/dsfr-global/backend/internal/interfaces/http/middleware"
)

// New builds the Gin engine with all routes and middlewares.
func New(cfg *config.Config, tokens *security.TokenManager,
	authHandler *handlers.AuthHandler, practiceHandler *handlers.PracticeHandler) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(middleware.RateLimit(cfg.RateLimitPerMinute))

	r.GET("/healthz", handlers.Health)

	v1 := r.Group("/api/v1")
	{
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/refresh", authHandler.Refresh)
			authGroup.POST("/logout", authHandler.Logout)
			authGroup.POST("/forgot-password", authHandler.ForgotPassword)
			authGroup.POST("/reset-password", authHandler.ResetPassword)
		}

		protected := v1.Group("")
		protected.Use(middleware.RequireAuth(tokens))
		{
			protected.GET("/me", authHandler.Me)

			protected.GET("/resume", practiceHandler.GetResume)
			protected.PUT("/resume", practiceHandler.PutResume)
			protected.GET("/job", practiceHandler.GetJob)
			protected.PUT("/job", practiceHandler.PutJob)
			protected.POST("/interview/generate", practiceHandler.GenerateInterview)
			protected.GET("/interview/latest", practiceHandler.LatestInterview)
			protected.GET("/ai-settings", practiceHandler.GetAISettings)
			protected.PUT("/ai-settings", practiceHandler.PutAISettings)
		}
	}
	return r
}
