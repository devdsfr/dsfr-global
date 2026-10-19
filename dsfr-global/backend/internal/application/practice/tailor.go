package practice

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/domain/career"
	"github.com/dsfr-global/backend/internal/infrastructure/ai"
	"github.com/dsfr-global/backend/internal/infrastructure/docs"
)

// Résumé match & tailoring.
//
// Flow: score how well the résumé AS WRITTEN matches a job (0-10). At 8+ the
// résumé is already strong for that job. Below 8 the candidate confirms which
// missing requirements they genuinely have experience with, and the résumé is
// rewritten around the job using only real experience: what it already says,
// made explicit, plus what the candidate confirmed. The rewritten version is
// then re-scored by a separate call, so the "after" score is not the writer
// grading its own work.

// ErrInvalidInput marks requests the handler should answer with 400.
var ErrInvalidInput = errors.New("invalid input")

// StrongMatch is the score at which a rewrite is not needed.
const StrongMatch = 8.0

const maxUploadBytes = 8 << 20 // 8 MB

// ExtractInput is a file to turn into plain text (job screenshot, résumé PDF/DOCX).
type ExtractInput struct {
	Kind     string `json:"kind" binding:"required,oneof=job resume"`
	MimeType string `json:"mime_type" binding:"required"`
	Data     string `json:"data" binding:"required"` // base64, no data: prefix
}

// AnalyzeMatchInput compares a résumé with a job.
type AnalyzeMatchInput struct {
	JobText    string `json:"job_text" binding:"required,min=40"`
	ResumeText string `json:"resume_text" binding:"required,min=80"`
}

// Confirmation is a requirement the candidate says they really have.
type Confirmation struct {
	Requirement string `json:"requirement" binding:"required,max=300"`
	Note        string `json:"note" binding:"max=500"`
}

// TailorInput rewrites the résumé for the job.
type TailorInput struct {
	JobTitle      string                `json:"job_title" binding:"max=200"`
	JobText       string                `json:"job_text" binding:"required,min=40"`
	ResumeText    string                `json:"resume_text" binding:"required,min=80"`
	Confirmations []Confirmation        `json:"confirmations" binding:"dive"`
	Before        *career.MatchAnalysis `json:"before"`
}

// ExtractDocument returns the plain text of an uploaded file. DOCX and TXT are
// read locally; images and PDFs need the AI provider to read them.
func (s *Service) ExtractDocument(ctx context.Context, userID uuid.UUID, in ExtractInput) (string, error) {
	data, err := base64.StdEncoding.DecodeString(in.Data)
	if err != nil {
		return "", fmt.Errorf("%w: file is not valid base64", ErrInvalidInput)
	}
	if len(data) == 0 || len(data) > maxUploadBytes {
		return "", fmt.Errorf("%w: file must be between 1 byte and 8 MB", ErrInvalidInput)
	}

	switch {
	case in.MimeType == docs.DocxMime:
		text, err := docs.ExtractDocxText(data)
		if err != nil {
			return "", fmt.Errorf("%w: %s", ErrInvalidInput, err.Error())
		}
		return text, nil
	case strings.HasPrefix(in.MimeType, "text/"):
		return strings.TrimSpace(string(data)), nil
	case in.MimeType == "application/pdf" || strings.HasPrefix(in.MimeType, "image/"):
		// handled below by the AI provider
	default:
		return "", fmt.Errorf("%w: unsupported file type — use PDF, DOCX, TXT, PNG or JPG", ErrInvalidInput)
	}

	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return "", err
	}
	reader, ok := llm.(ai.FileCompleter)
	if !ok || !llm.Configured() {
		return "", ai.ErrNotConfigured
	}
	prompt := "Transcribe this job posting into plain text. Keep the company, title, seniority, every requirement, responsibility and technology. Do not summarize, translate or add anything. Output only the text."
	if in.Kind == "resume" {
		prompt = "Transcribe this resume into plain text. Keep every section, job title, company, date, bullet point, skill and education entry, in the original order and language. Do not summarize or add anything. Output only the text."
	}
	text, err := reader.CompleteWithFile(ctx, prompt, in.MimeType, data, 4000)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(stripFences(text)), nil
}

// AnalyzeMatch scores how well the résumé, as written, matches the job.
func (s *Service) AnalyzeMatch(ctx context.Context, userID uuid.UUID, in AnalyzeMatchInput) (*career.MatchAnalysis, error) {
	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return nil, err
	}
	return analyzeMatch(ctx, llm, in.JobText, in.ResumeText)
}

func analyzeMatch(ctx context.Context, llm Completer, jobText, resumeText string) (*career.MatchAnalysis, error) {
	text, err := llm.Complete(ctx, buildMatchPrompt(jobText, resumeText), 3000)
	if err != nil {
		return nil, err
	}
	var analysis career.MatchAnalysis
	if err := json.Unmarshal([]byte(extractJSONObject(text)), &analysis); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	normalizeAnalysis(&analysis)
	return &analysis, nil
}

// TailorResume rewrites the résumé for the job and re-scores the result.
func (s *Service) TailorResume(ctx context.Context, userID uuid.UUID, in TailorInput) (*career.Tailoring, error) {
	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return nil, err
	}

	before := in.Before
	if before == nil {
		if before, err = analyzeMatch(ctx, llm, in.JobText, in.ResumeText); err != nil {
			return nil, err
		}
	}

	text, err := llm.Complete(ctx, buildTailorPrompt(in.JobText, in.ResumeText, in.Confirmations), 6000)
	if err != nil {
		return nil, err
	}
	var rewritten struct {
		Resume  string   `json:"resume"`
		Changes []string `json:"changes"`
	}
	if err := json.Unmarshal([]byte(extractJSONObject(text)), &rewritten); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	if strings.TrimSpace(rewritten.Resume) == "" {
		return nil, errors.New("AI returned an empty resume, try again")
	}
	if rewritten.Changes == nil {
		rewritten.Changes = []string{}
	}

	// Independent re-score: the rewritten résumé is graded by the same rubric
	// as the original, in a separate call, rather than trusting the writer.
	after, err := analyzeMatch(ctx, llm, in.JobText, rewritten.Resume)
	if err != nil {
		return nil, err
	}

	t := &career.Tailoring{
		ID: uuid.New(), UserID: userID, JobTitle: strings.TrimSpace(in.JobTitle),
		JobText: in.JobText, OriginalResume: in.ResumeText, Before: *before,
		TailoredResume: strings.TrimSpace(rewritten.Resume), After: *after,
		Changes: rewritten.Changes, CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.SaveTailoring(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// ListTailorings returns the user's tailored résumés, newest first.
func (s *Service) ListTailorings(ctx context.Context, userID uuid.UUID) ([]career.Tailoring, error) {
	return s.repo.ListTailorings(ctx, userID, 20)
}

func buildMatchPrompt(jobText, resumeText string) string {
	return fmt.Sprintf(`You are an experienced technical recruiter and an applicant tracking system (ATS).
Grade how well the RESUME, AS WRITTEN, matches the JOB POSTING. Judge only what the
resume actually states — never assume a skill it does not mention.

JOB POSTING:
%s

RESUME:
%s

Return:
- "score": overall match from 0 to 10 with one decimal. Calibrate strictly:
  9-10 = nearly every requirement clearly evidenced;
  8 = all core requirements met, only minor gaps;
  6-7 = several core requirements missing or only implied;
  below 5 = a different profile.
- "breakdown": 0-10 each for
  "hard_skills" (the required technologies and tools),
  "experience" (seniority, years, domain),
  "keywords" (important posting terms present verbatim, as an ATS would check),
  "impact" (clear, relevant, quantified achievements).
- "summary": two plain-English sentences on the fit.
- "requirements": the 6 to 12 most important requirements of the job. For each:
  "requirement" (short), "status" ("met" | "partial" | "missing"), and "evidence"
  (a short quote from the resume when met or partial, otherwise "").
- "missing_keywords": up to 12 important keywords from the posting that the resume lacks.

Respond with ONLY this JSON, no markdown, no commentary:
{"score":0,"breakdown":{"hard_skills":0,"experience":0,"keywords":0,"impact":0},"summary":"...","requirements":[{"requirement":"...","status":"missing","evidence":""}],"missing_keywords":["..."]}`,
		truncate(jobText, 6000), truncate(resumeText, 8000))
}

func buildTailorPrompt(jobText, resumeText string, confirmations []Confirmation) string {
	confirmed := "None."
	if len(confirmations) > 0 {
		lines := make([]string, 0, len(confirmations))
		for _, c := range confirmations {
			line := "- " + strings.TrimSpace(c.Requirement)
			if note := strings.TrimSpace(c.Note); note != "" {
				line += " — " + note
			}
			lines = append(lines, line)
		}
		confirmed = strings.Join(lines, "\n")
	}

	return fmt.Sprintf(`You are an expert technical resume writer. Rewrite the RESUME so it matches the
JOB POSTING as strongly as possible WITHOUT inventing anything.

STRICT RULES
1. Never invent employers, job titles, dates, degrees, certifications, numbers or achievements.
   Do not inflate scope either: "worked on" must not become "led", "database work" must not
   become "managed data modeling", and no adjectives like "scalable" or "high-traffic" that
   the resume does not support.
2. You MAY: write a professional summary aimed at this job; reorder sections, bullets and
   skills so the most relevant come first; rephrase existing bullets with the posting's
   terminology; make explicit what the resume already implies.
3. A technology or skill that is not already in the resume may be added ONLY if it is listed
   under CONFIRMED BY THE CANDIDATE. When the candidate gave context, weave it into the role
   it belongs to as a bullet and add it to the skills section. Without context, add it to
   the skills section only.
4. Anything from the posting that is neither in the resume nor confirmed must NOT appear.
5. ATS-friendly plain text: section headings in CAPITALS (SUMMARY, SKILLS, EXPERIENCE,
   EDUCATION, ...), bullets starting with "- ", no tables, no columns, no emojis.
6. Write in the same language as the job posting.
7. Keep it concise — no more than about two pages.

JOB POSTING:
%s

RESUME:
%s

CONFIRMED BY THE CANDIDATE (experience they really have):
%s

Respond with ONLY this JSON, no markdown. Escape line breaks inside strings as \n:
{"resume":"the full rewritten resume as plain text","changes":["one short line per meaningful change"]}`,
		truncate(jobText, 6000), truncate(resumeText, 8000), confirmed)
}

// stripFences removes a markdown code fence the model may wrap output in.
func stripFences(text string) string {
	text = strings.TrimSpace(text)
	for _, fence := range []string{"```json", "```text", "```"} {
		text = strings.TrimPrefix(text, fence)
	}
	return strings.TrimSuffix(strings.TrimSpace(text), "```")
}

// extractJSONObject returns the outermost {...} of a model response.
func extractJSONObject(text string) string {
	text = stripFences(text)
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start < 0 || end < start {
		return text
	}
	return text[start : end+1]
}

// normalizeAnalysis clamps scores and guarantees non-nil slices (a nil slice
// would reach the frontend as JSON null).
func normalizeAnalysis(a *career.MatchAnalysis) {
	clamp10 := func(v float64) float64 {
		v = math.Max(0, math.Min(10, v))
		return math.Round(v*10) / 10
	}
	a.Score = clamp10(a.Score)
	a.Breakdown.HardSkills = clamp10(a.Breakdown.HardSkills)
	a.Breakdown.Experience = clamp10(a.Breakdown.Experience)
	a.Breakdown.Keywords = clamp10(a.Breakdown.Keywords)
	a.Breakdown.Impact = clamp10(a.Breakdown.Impact)
	if a.Requirements == nil {
		a.Requirements = []career.MatchRequirement{}
	}
	for i := range a.Requirements {
		switch a.Requirements[i].Status {
		case "met", "partial", "missing":
		default:
			a.Requirements[i].Status = "missing"
		}
	}
	if a.MissingKeywords == nil {
		a.MissingKeywords = []string{}
	}
}
