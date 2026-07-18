package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/application/practice"
	"github.com/dsfr-global/backend/internal/domain/career"
	"github.com/dsfr-global/backend/internal/infrastructure/ai"
)

// PracticeHandler adapts HTTP requests to the practice service.
type PracticeHandler struct{ svc *practice.Service }

// NewPracticeHandler builds the handler.
func NewPracticeHandler(svc *practice.Service) *PracticeHandler { return &PracticeHandler{svc: svc} }

func currentUserID(c *gin.Context) (uuid.UUID, bool) {
	idVal, _ := c.Get("userID")
	id, ok := idVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
	}
	return id, ok
}

// GetResume godoc: GET /api/v1/resume
func (h *PracticeHandler) GetResume(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	r, err := h.svc.GetResume(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"headline": r.Headline, "raw_text": r.RawText, "updated_at": r.UpdatedAt})
}

// PutResume godoc: PUT /api/v1/resume
func (h *PracticeHandler) PutResume(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.ResumeInput
	if !bind(c, &in) {
		return
	}
	r, err := h.svc.SaveResume(c.Request.Context(), userID, in)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"headline": r.Headline, "raw_text": r.RawText, "updated_at": r.UpdatedAt})
}

// GetJob godoc: GET /api/v1/job
func (h *PracticeHandler) GetJob(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	j, err := h.svc.GetJob(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, jobJSON(j))
}

// PutJob godoc: PUT /api/v1/job
func (h *PracticeHandler) PutJob(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.JobInput
	if !bind(c, &in) {
		return
	}
	j, err := h.svc.SaveJob(c.Request.Context(), userID, in)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, jobJSON(j))
}

// GenerateInterview godoc: POST /api/v1/interview/generate
func (h *PracticeHandler) GenerateInterview(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.GenerateInput
	if c.Request.ContentLength > 0 && !bind(c, &in) {
		return
	}
	i, err := h.svc.GenerateInterview(c.Request.Context(), userID, in)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusCreated, interviewJSON(i))
}

// LatestInterview godoc: GET /api/v1/interview/latest
func (h *PracticeHandler) LatestInterview(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	i, err := h.svc.LatestInterview(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, interviewJSON(i))
}

func jobJSON(j *career.Job) gin.H {
	return gin.H{"title": j.Title, "seniority": j.Seniority, "stack": j.Stack,
		"raw_text": j.RawText, "updated_at": j.UpdatedAt}
}

func interviewJSON(i *career.Interview) gin.H {
	return gin.H{"id": i.ID.String(), "level": i.Level, "turns": i.Turns, "created_at": i.CreatedAt}
}

func respondCareerError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, career.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	case errors.Is(err, ai.ErrNotConfigured):
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI is not configured on the server yet"})
	default:
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
	}
}
