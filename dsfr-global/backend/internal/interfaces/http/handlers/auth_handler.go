// Package handlers exposes the HTTP layer (Gin) for the API.
package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/application/auth"
	"github.com/dsfr-global/backend/internal/domain/user"
)

// AuthHandler adapts HTTP requests to the auth service.
type AuthHandler struct{ svc *auth.Service }

// NewAuthHandler builds the handler.
func NewAuthHandler(svc *auth.Service) *AuthHandler { return &AuthHandler{svc: svc} }

// Register godoc: POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var in auth.RegisterInput
	if !bind(c, &in) {
		return
	}
	out, err := h.svc.Register(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, out)
}

// Login godoc: POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var in auth.LoginInput
	if !bind(c, &in) {
		return
	}
	pair, u, err := h.svc.Login(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"tokens": pair, "user": u})
}

// Refresh godoc: POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var in auth.RefreshInput
	if !bind(c, &in) {
		return
	}
	pair, err := h.svc.Refresh(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, pair)
}

// Logout godoc: POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	var in auth.RefreshInput
	if !bind(c, &in) {
		return
	}
	if err := h.svc.Logout(c.Request.Context(), in.RefreshToken); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ForgotPassword godoc: POST /api/v1/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var in auth.ForgotPasswordInput
	if !bind(c, &in) {
		return
	}
	if err := h.svc.ForgotPassword(c.Request.Context(), in); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "if the email exists, a reset link was sent"})
}

// ResetPassword godoc: POST /api/v1/auth/reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var in auth.ResetPasswordInput
	if !bind(c, &in) {
		return
	}
	if err := h.svc.ResetPassword(c.Request.Context(), in); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

// Me godoc: GET /api/v1/me (requires auth middleware)
func (h *AuthHandler) Me(c *gin.Context) {
	idVal, _ := c.Get("userID")
	id, ok := idVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}
	out, err := h.svc.Me(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func bind(c *gin.Context, in any) bool {
	if err := c.ShouldBindJSON(in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload", "details": err.Error()})
		return false
	}
	return true
}

func respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, user.ErrEmailAlreadyExists):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, user.ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, user.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
	}
}
