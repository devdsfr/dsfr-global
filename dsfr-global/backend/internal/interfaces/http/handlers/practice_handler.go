package handlers

import (
	"errors"
	"log/slog"
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

// ListJobs godoc: GET /api/v1/jobs
func (h *PracticeHandler) ListJobs(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	jobs, err := h.svc.ListJobs(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	out := make([]gin.H, 0, len(jobs))
	for i := range jobs {
		out = append(out, jobJSON(&jobs[i]))
	}
	c.JSON(http.StatusOK, out)
}

// CreateJob godoc: POST /api/v1/jobs
func (h *PracticeHandler) CreateJob(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.JobInput
	if !bind(c, &in) {
		return
	}
	j, err := h.svc.CreateJob(c.Request.Context(), userID, in)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusCreated, jobJSON(j))
}

// UpdateJob godoc: PUT /api/v1/jobs/:id
func (h *PracticeHandler) UpdateJob(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	jobID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}
	var in practice.JobInput
	if !bind(c, &in) {
		return
	}
	j, err := h.svc.UpdateJob(c.Request.Context(), userID, jobID, in)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, jobJSON(j))
}

// DeleteJob godoc: DELETE /api/v1/jobs/:id
func (h *PracticeHandler) DeleteJob(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	jobID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}
	if err := h.svc.DeleteJob(c.Request.Context(), userID, jobID); err != nil {
		respondCareerError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ActivateJob godoc: POST /api/v1/jobs/:id/activate
func (h *PracticeHandler) ActivateJob(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	jobID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}
	if err := h.svc.SetActiveJob(c.Request.Context(), userID, jobID); err != nil {
		respondCareerError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// EvaluateAnswer godoc: POST /api/v1/interview/evaluate
func (h *PracticeHandler) EvaluateAnswer(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.EvaluateInput
	if !bind(c, &in) {
		return
	}
	out, err := h.svc.EvaluateAnswer(c.Request.Context(), userID, in)
	if err != nil {
		slog.Error("answer evaluation failed", "user", userID, "error", err)
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// Scores godoc: GET /api/v1/scores
func (h *PracticeHandler) Scores(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	s, err := h.svc.Scores(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
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
		slog.Error("interview generation failed", "user", userID, "error", err)
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
	return gin.H{"id": j.ID.String(), "title": j.Title, "company": j.Company,
		"seniority": j.Seniority, "stack": j.Stack, "raw_text": j.RawText,
		"is_active": j.IsActive, "updated_at": j.UpdatedAt}
}

func interviewJSON(i *career.Interview) gin.H {
	return gin.H{"id": i.ID.String(), "level": i.Level, "job_id": i.JobID.String(),
		"turns": i.Turns, "created_at": i.CreatedAt}
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

// GetAISettings godoc: GET /api/v1/ai-settings
func (h *PracticeHandler) GetAISettings(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	serverDefault := h.svc.AIConfigured()
	set, err := h.svc.GetAISettings(c.Request.Context(), userID)
	if errors.Is(err, career.ErrNotFound) {
		c.JSON(http.StatusOK, gin.H{"provider": "", "model": "", "has_key": false,
			"masked_key": "", "server_default": serverDefault})
		return
	}
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"provider": set.Provider, "model": set.Model, "has_key": true,
		"masked_key": maskKey(set.APIKey), "server_default": serverDefault})
}

// PutAISettings godoc: PUT /api/v1/ai-settings
func (h *PracticeHandler) PutAISettings(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.AISettingsInput
	if !bind(c, &in) {
		return
	}
	set, err := h.svc.SaveAISettings(c.Request.Context(), userID, in)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"provider": set.Provider, "model": set.Model, "has_key": true,
		"masked_key": maskKey(set.APIKey), "server_default": h.svc.AIConfigured()})
}

func maskKey(key string) string {
	if len(key) <= 4 {
		return "••••"
	}
	return "••••••••" + key[len(key)-4:]
}
