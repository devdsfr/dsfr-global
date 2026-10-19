package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

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

// ScoreSession godoc: POST /api/v1/interview/score-session
func (h *PracticeHandler) ScoreSession(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.ScoreSessionInput
	if !bind(c, &in) {
		return
	}
	out, err := h.svc.ScoreSession(c.Request.Context(), userID, in)
	if err != nil {
		slog.Error("session scoring failed", "user", userID, "error", err)
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusCreated, out)
}

// ListSessions godoc: GET /api/v1/sessions
func (h *PracticeHandler) ListSessions(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	list, err := h.svc.ListSessions(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	out := make([]practice.SessionOutput, 0, len(list))
	for _, s := range list {
		out = append(out, practice.SessionOutput{
			ID:        s.ID.String(),
			JobTitle:  s.JobTitle,
			Answers:   s.Answers,
			Score:     s.Score,
			CreatedAt: s.CreatedAt.Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, out)
}

// respondTailorError maps bad uploads to 400 and everything else as usual.
func respondTailorError(c *gin.Context, err error) {
	if errors.Is(err, practice.ErrInvalidInput) {
		c.JSON(http.StatusBadRequest, gin.H{"error": strings.TrimPrefix(err.Error(), "invalid input: ")})
		return
	}
	respondCareerError(c, err)
}

// ExtractDocument godoc: POST /api/v1/tailor/extract
func (h *PracticeHandler) ExtractDocument(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.ExtractInput
	if !bind(c, &in) {
		return
	}
	text, err := h.svc.ExtractDocument(c.Request.Context(), userID, in)
	if err != nil {
		slog.Error("document extraction failed", "user", userID, "error", err)
		respondTailorError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"text": text})
}

// AnalyzeMatch godoc: POST /api/v1/tailor/analyze
func (h *PracticeHandler) AnalyzeMatch(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.AnalyzeMatchInput
	if !bind(c, &in) {
		return
	}
	out, err := h.svc.AnalyzeMatch(c.Request.Context(), userID, in)
	if err != nil {
		slog.Error("match analysis failed", "user", userID, "error", err)
		respondTailorError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

// TailorResume godoc: POST /api/v1/tailor
func (h *PracticeHandler) TailorResume(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.TailorInput
	if !bind(c, &in) {
		return
	}
	t, err := h.svc.TailorResume(c.Request.Context(), userID, in)
	if err != nil {
		slog.Error("resume tailoring failed", "user", userID, "error", err)
		respondTailorError(c, err)
		return
	}
	c.JSON(http.StatusCreated, tailoringJSON(t))
}

// ListTailorings godoc: GET /api/v1/tailor
func (h *PracticeHandler) ListTailorings(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	list, err := h.svc.ListTailorings(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	out := make([]gin.H, 0, len(list))
	for i := range list {
		out = append(out, tailoringJSON(&list[i]))
	}
	c.JSON(http.StatusOK, out)
}

func tailoringJSON(t *career.Tailoring) gin.H {
	return gin.H{"id": t.ID.String(), "job_title": t.JobTitle, "job_text": t.JobText,
		"original_resume": t.OriginalResume, "before": t.Before,
		"tailored_resume": t.TailoredResume, "after": t.After,
		"changes": t.Changes, "created_at": t.CreatedAt.Format(time.RFC3339)}
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

// TopicBreakdown godoc: GET /api/v1/scores/topics
func (h *PracticeHandler) TopicBreakdown(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	rows, err := h.svc.TopicBreakdown(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, rows)
}

// Topics godoc: GET /api/v1/interview/topics
// Static catalogue, so the frontend can render the selector without hardcoding
// ids that the prompts and the breakdown would then have to keep in sync.
func (h *PracticeHandler) Topics(c *gin.Context) {
	c.JSON(http.StatusOK, h.svc.Topics())
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

// GeneratePrepPack godoc: POST /api/v1/prep/generate
func (h *PracticeHandler) GeneratePrepPack(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.PrepInput
	if !bind(c, &in) {
		return
	}
	pack, err := h.svc.GeneratePrepPack(c.Request.Context(), userID, in)
	if err != nil {
		slog.Error("prep pack generation failed", "user", userID, "error", err)
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusCreated, prepJSON(pack))
}

// LatestPrepPack godoc: GET /api/v1/prep/:jobId
func (h *PracticeHandler) LatestPrepPack(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job id"})
		return
	}
	pack, err := h.svc.LatestPrepPack(c.Request.Context(), userID, jobID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusOK, prepJSON(pack))
}

func prepJSON(p *career.PrepPack) gin.H {
	return gin.H{"id": p.ID.String(), "job_id": p.JobID.String(),
		"content": p.Content, "created_at": p.CreatedAt}
}

// CreateDebrief godoc: POST /api/v1/debrief
func (h *PracticeHandler) CreateDebrief(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	var in practice.DebriefInput
	if !bind(c, &in) {
		return
	}
	d, err := h.svc.CreateDebrief(c.Request.Context(), userID, in)
	if err != nil {
		slog.Error("debrief failed", "user", userID, "error", err)
		respondCareerError(c, err)
		return
	}
	c.JSON(http.StatusCreated, debriefJSON(d))
}

// ListDebriefs godoc: GET /api/v1/debrief
func (h *PracticeHandler) ListDebriefs(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		return
	}
	list, err := h.svc.ListDebriefs(c.Request.Context(), userID)
	if err != nil {
		respondCareerError(c, err)
		return
	}
	out := make([]gin.H, 0, len(list))
	for i := range list {
		out = append(out, debriefJSON(&list[i]))
	}
	c.JSON(http.StatusOK, out)
}

func debriefJSON(d *career.Debrief) gin.H {
	return gin.H{"id": d.ID.String(), "job_id": d.JobID.String(), "notes": d.Notes,
		"score": d.Score, "analysis": d.Analysis, "created_at": d.CreatedAt}
}
