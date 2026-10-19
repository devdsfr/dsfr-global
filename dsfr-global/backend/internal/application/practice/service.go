package practice

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/domain/career"
	"github.com/dsfr-global/backend/internal/infrastructure/ai"
)

// Completer is the LLM port. Infrastructure provides an Anthropic-backed one.
type Completer interface {
	Complete(ctx context.Context, prompt string, maxTokens int) (string, error)
	Configured() bool
}

// Service implements résumé/job registration and AI interview generation.
type Service struct {
	repo career.Repository
	llm  Completer
}

// NewService wires the practice use cases.
func NewService(repo career.Repository, llm Completer) *Service {
	return &Service{repo: repo, llm: llm}
}

// AIConfigured reports whether interview generation is available.
func (s *Service) AIConfigured() bool { return s.llm.Configured() }

// SaveResume upserts the user's résumé.
func (s *Service) SaveResume(ctx context.Context, userID uuid.UUID, in ResumeInput) (*career.Resume, error) {
	r := &career.Resume{ID: uuid.New(), UserID: userID,
		Headline: strings.TrimSpace(in.Headline), RawText: strings.TrimSpace(in.RawText)}
	if err := s.repo.UpsertResume(ctx, r); err != nil {
		return nil, err
	}
	return s.repo.FindResumeByUser(ctx, userID)
}

// GetResume fetches the user's résumé.
func (s *Service) GetResume(ctx context.Context, userID uuid.UUID) (*career.Resume, error) {
	return s.repo.FindResumeByUser(ctx, userID)
}

// CreateJob adds a new target job. The first job becomes the active one.
func (s *Service) CreateJob(ctx context.Context, userID uuid.UUID, in JobInput) (*career.Job, error) {
	existing, err := s.repo.ListJobsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	j := &career.Job{ID: uuid.New(), UserID: userID,
		Title: strings.TrimSpace(in.Title), Company: strings.TrimSpace(in.Company),
		Seniority: strings.TrimSpace(in.Seniority), Stack: strings.TrimSpace(in.Stack),
		RawText: strings.TrimSpace(in.RawText), IsActive: len(existing) == 0}
	if err := s.repo.CreateJob(ctx, j); err != nil {
		return nil, err
	}
	return s.repo.FindJobByID(ctx, userID, j.ID)
}

// UpdateJob edits an existing job.
func (s *Service) UpdateJob(ctx context.Context, userID, jobID uuid.UUID, in JobInput) (*career.Job, error) {
	j := &career.Job{ID: jobID, UserID: userID,
		Title: strings.TrimSpace(in.Title), Company: strings.TrimSpace(in.Company),
		Seniority: strings.TrimSpace(in.Seniority), Stack: strings.TrimSpace(in.Stack),
		RawText: strings.TrimSpace(in.RawText)}
	if err := s.repo.UpdateJob(ctx, j); err != nil {
		return nil, err
	}
	return s.repo.FindJobByID(ctx, userID, jobID)
}

// DeleteJob removes a job.
func (s *Service) DeleteJob(ctx context.Context, userID, jobID uuid.UUID) error {
	return s.repo.DeleteJob(ctx, userID, jobID)
}

// ListJobs returns all target jobs (active first).
func (s *Service) ListJobs(ctx context.Context, userID uuid.UUID) ([]career.Job, error) {
	return s.repo.ListJobsByUser(ctx, userID)
}

// SetActiveJob marks which job practice sessions target by default.
func (s *Service) SetActiveJob(ctx context.Context, userID, jobID uuid.UUID) error {
	return s.repo.SetActiveJob(ctx, userID, jobID)
}

// LatestInterview returns the most recent generated script.
func (s *Service) LatestInterview(ctx context.Context, userID uuid.UUID) (*career.Interview, error) {
	return s.repo.FindLatestInterviewByUser(ctx, userID)
}

// SaveAISettings stores the user's own provider + API key (BYOK).
func (s *Service) SaveAISettings(ctx context.Context, userID uuid.UUID, in AISettingsInput) (*career.AISettings, error) {
	set := &career.AISettings{UserID: userID, Provider: in.Provider,
		APIKey: strings.TrimSpace(in.APIKey), Model: strings.TrimSpace(in.Model)}
	if err := s.repo.UpsertAISettings(ctx, set); err != nil {
		return nil, err
	}
	return s.repo.FindAISettingsByUser(ctx, userID)
}

// GetAISettings fetches the user's provider config (key included; handler masks it).
func (s *Service) GetAISettings(ctx context.Context, userID uuid.UUID) (*career.AISettings, error) {
	return s.repo.FindAISettingsByUser(ctx, userID)
}

// completerFor resolves the LLM to use: the user's own key first, then the
// server-wide default. This is what lets each user bring their own key.
func (s *Service) completerFor(ctx context.Context, userID uuid.UUID) (Completer, error) {
	set, err := s.repo.FindAISettingsByUser(ctx, userID)
	if err == nil && set.APIKey != "" {
		return ai.ForProvider(set.Provider, set.APIKey, set.Model)
	}
	return s.llm, nil
}

// GenerateInterview builds a personalized interview script from the stored
// résumé + target job via the LLM, saves it, and returns it.
func (s *Service) GenerateInterview(ctx context.Context, userID uuid.UUID, in GenerateInput) (*career.Interview, error) {
	level := in.Level
	if level == "" {
		level = "beginner"
	}
	resume, err := s.repo.FindResumeByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("resume: %w", err)
	}
	var job *career.Job
	if in.JobID != "" {
		jobID, parseErr := uuid.Parse(in.JobID)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid job id")
		}
		job, err = s.repo.FindJobByID(ctx, userID, jobID)
	} else {
		job, err = s.repo.FindActiveJob(ctx, userID)
	}
	if err != nil {
		return nil, fmt.Errorf("job: %w", err)
	}

	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return nil, err
	}

	topics := career.FilterTopics(in.Topics)
	focus := in.Focus
	if focus == "" {
		focus = "mixed"
	}

	// Best effort: without history the script is still valid, just less fresh.
	previous, _ := s.repo.RecentQuestions(ctx, userID, 5)

	prompt := buildPrompt(resume, job, level, topics, focus, previous, newVariety())
	text, err := llm.Complete(ctx, prompt, 4000)
	if err != nil {
		return nil, err
	}
	turns, err := parseTurns(text)
	if err != nil {
		return nil, err
	}

	interview := &career.Interview{ID: uuid.New(), UserID: userID, Level: level,
		JobID: job.ID, Turns: turns, CreatedAt: time.Now().UTC()}
	if err := s.repo.SaveInterview(ctx, interview); err != nil {
		return nil, err
	}
	return interview, nil
}

// variety is what makes two scripts for the same job differ. Without it the
// same résumé + posting produced the same "most typical" questions every time.
type variety struct {
	interviewer string // who is asking, which changes tone and angle
	behavioral  []string
	opener      string
}

var interviewerStyles = []string{
	"a friendly HR recruiter screening for communication and culture fit",
	"a skeptical staff engineer who keeps asking \"why?\" and \"what would break?\"",
	"a pragmatic engineering manager focused on delivery, deadlines and teamwork",
	"a product-minded tech lead who cares about users and business impact",
	"a senior architect probing scalability, reliability and design trade-offs",
	"a startup CTO testing ownership, speed and wearing many hats",
	"a hiring manager from a US company assessing remote-work readiness",
}

var behavioralThemes = []string{
	"a conflict with a teammate and how it was resolved",
	"a production incident the candidate handled",
	"a deadline that was at risk",
	"a decision the candidate later regretted",
	"learning a new technology quickly",
	"disagreeing with a manager or tech lead",
	"mentoring or helping a less experienced developer",
	"receiving tough feedback",
	"working with people in other time zones",
	"a project the candidate is most proud of",
	"explaining a technical problem to a non-technical person",
	"prioritising when everything is urgent",
}

var openers = []string{
	"a classic introduction (\"tell me about yourself\")",
	"why they want to work for a company abroad",
	"what they know about the role and why it fits them",
	"a walk through their current day-to-day work",
	"their career path so far and where they want to go next",
}

// newVariety draws a fresh combination for every generated script.
func newVariety() variety {
	themes := rand.Perm(len(behavioralThemes))
	return variety{
		interviewer: interviewerStyles[rand.Intn(len(interviewerStyles))],
		behavioral:  []string{behavioralThemes[themes[0]], behavioralThemes[themes[1]], behavioralThemes[themes[2]]},
		opener:      openers[rand.Intn(len(openers))],
	}
}

// structureFor lays out the 8 turns according to the chosen focus, so the
// filter changes the interview itself and not just a hint in the prompt.
func structureFor(focus string, v variety) string {
	switch focus {
	case "language":
		return fmt.Sprintf(`Create an interview with EXACTLY 8 turns:
- Turn 1: an opener about %s.
- Turns 2-4: behavioral questions about: %s; %s; %s.
- Turns 5-7: light technical questions, about the candidate's own experience rather than definitions.
- Turn 8: a closing question (vary it — not always "do you have any questions for us?").`,
			v.opener, v.behavioral[0], v.behavioral[1], v.behavioral[2])
	case "technical":
		return fmt.Sprintf(`Create an interview with EXACTLY 8 turns:
- Turn 1: a short opener about %s.
- Turns 2-7: SIX technical questions. Each must be a concrete scenario or follow-up
  ("Your API latency doubled after a deploy — walk me through it"), never a
  textbook definition ("What is REST?").
- Turn 8: one behavioral question about %s.`,
			v.opener, v.behavioral[0])
	default: // mixed
		return fmt.Sprintf(`Create an interview with EXACTLY 8 turns:
- Turn 1: an opener about %s.
- Turn 2: a behavioral question about %s.
- Turns 3-7: FIVE technical questions, mixing concrete scenarios with experience questions.
- Turn 8: a behavioral question about %s.`,
			v.opener, v.behavioral[0], v.behavioral[1])
	}
}

// avoidList tells the model what it already asked this user.
func avoidList(previous []string) string {
	if len(previous) == 0 {
		return ""
	}
	if len(previous) > 40 {
		previous = previous[:40]
	}
	return "ALREADY ASKED IN EARLIER SESSIONS — do NOT repeat or lightly paraphrase any of these; ask different questions:\n- " +
		strings.Join(previous, "\n- ")
}

func buildPrompt(resume *career.Resume, job *career.Job, level string, topics []string,
	focus string, previous []string, v variety) string {
	levelGuide := map[string]string{
		"beginner":     "The candidate is a beginner English speaker (A2). Answers must use very simple, natural spoken English: short sentences, common words, no idioms. 40-70 words per answer.",
		"intermediate": "The candidate is an intermediate English speaker (B1-B2). Answers should use natural spoken English with moderate complexity. 60-90 words per answer.",
		"advanced":     "The candidate is an advanced English speaker (C1). Answers can use rich, natural professional English. 80-120 words per answer.",
	}
	focusGuide := map[string]string{
		"language":  "FOCUS: spoken English. Keep technical depth light — the point is fluent delivery, not deep interrogation.",
		"technical": "FOCUS: technical depth. Push for concrete experience: trade-offs weighed, decisions regretted, incidents handled. Avoid questions answerable from a textbook definition.",
		"mixed":     "FOCUS: balanced. Mix fluency practice with questions that demand real technical experience.",
	}

	return fmt.Sprintf(`You are generating a mock job-interview script for a tech professional practicing spoken English.

THE INTERVIEWER is %s. Write every question in that person's voice and angle.

TARGET JOB:
Title: %s
Seniority: %s
Stack: %s
Posting:
%s

CANDIDATE RESUME:
%s

%s

%s

%s

%s

%s

The "answer" is what the candidate will READ ALOUD from a teleprompter, so it must be first-person, natural to speak, and grounded in the resume facts (do not invent employers or dates).

For every turn also return:
- "topic": exactly one id from this list — %s
- "expected_points": 3 to 4 short phrases naming what a STRONG answer must cover.
  These are grading criteria, not a summary of the model answer, and the
  candidate never sees them. Make them checkable: "names a concrete trade-off",
  "cites a measured result", not "answers well".

Respond with ONLY this JSON, no markdown, no commentary:
{"turns":[{"interviewer":"...","answer":"...","topic":"...","expected_points":["...","..."]}]}`,
		v.interviewer,
		job.Title, job.Seniority, job.Stack, truncate(job.RawText, 3000),
		truncate(resume.RawText, 4000),
		structureFor(focus, v), levelGuide[level], focusGuide[focus],
		topicInstruction(topics), avoidList(previous),
		topicIDList())
}

// topicInstruction narrows the technical turns to the chosen subjects. With no
// selection the job posting decides, which is the historical behaviour.
func topicInstruction(topics []string) string {
	if len(topics) == 0 {
		return "TOPICS: let the job posting drive the technical subjects."
	}
	labels := make([]string, 0, len(topics))
	for _, id := range topics {
		labels = append(labels, career.TopicLabel(id))
	}
	return fmt.Sprintf(
		"TOPICS (MANDATORY — this overrides the job posting): every technical turn must be about "+
			"one of these subjects and nothing else — %s. Spread the technical turns across them, "+
			"and tag each with the matching topic id. If the posting mentions other technologies, "+
			"ignore them for this session.",
		strings.Join(labels, ", "))
}

// topicIDList is the closed set the model may tag turns with, so stored topics
// always match the catalogue the breakdown groups by.
func topicIDList() string {
	ids := make([]string, 0, len(career.Topics))
	for _, t := range career.Topics {
		ids = append(ids, t.ID)
	}
	return strings.Join(ids, " | ")
}

func parseTurns(text string) ([]career.InterviewTurn, error) {
	// Strip accidental markdown fences and find the JSON object.
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	if i := strings.Index(text, "{"); i > 0 {
		text = text[i:]
	}
	if i := strings.LastIndex(text, "}"); i >= 0 {
		text = text[:i+1]
	}
	var payload struct {
		Turns []career.InterviewTurn `json:"turns"`
	}
	if err := json.Unmarshal([]byte(text), &payload); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	if len(payload.Turns) == 0 {
		return nil, fmt.Errorf("AI returned an empty script, try again")
	}
	// A hallucinated topic id would land in the database and split the
	// breakdown into a phantom row, so anything outside the catalogue is
	// cleared — the turn still works, it just doesn't get grouped.
	for i := range payload.Turns {
		if !career.ValidTopic(payload.Turns[i].Topic) {
			payload.Turns[i].Topic = ""
		}
	}
	return payload.Turns, nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}

// EvaluateAnswer sends the user's spoken transcript to the LLM, which grades it
// against the expected answer and returns actionable coaching tips.
func (s *Service) EvaluateAnswer(ctx context.Context, userID uuid.UUID, in EvaluateInput) (*EvaluationOutput, error) {
	interviewID, err := uuid.Parse(in.InterviewID)
	if err != nil {
		return nil, fmt.Errorf("invalid interview id")
	}
	interview, err := s.repo.FindLatestInterviewByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if in.TurnIndex < 0 || in.TurnIndex >= len(interview.Turns) {
		return nil, fmt.Errorf("invalid turn index")
	}
	turn := interview.Turns[in.TurnIndex]

	// Graded offline. One LLM call per answer meant ~7s of waiting eight times
	// per session and burned provider free-tier request limits; the local engine
	// returns in microseconds, costs nothing, and never rate-limits.
	local := scoreAnswerLocally(turn.Answer, in.Transcript, turn.ExpectedPoints)

	out := &EvaluationOutput{
		Score:      local.Score,
		Fluency:    local.Fluency,
		Grammar:    local.Grammar,
		Vocabulary: local.Vocabulary,
		Content:    local.Content,
		Covered:    local.Covered,
		Missed:     local.Missed,
		Tips:       local.Tips,
		Topic:      turn.Topic,
	}
	if len(turn.ExpectedPoints) == 0 {
		// Pre-topic script: there was no rubric to grade against, so don't
		// report a content score the UI would render as a genuine zero.
		out.Content = 0
		out.Covered = nil
		out.Missed = nil
	}

	eval := &career.AnswerEvaluation{ID: uuid.New(), UserID: userID, InterviewID: interviewID,
		TurnIndex: in.TurnIndex, Transcript: in.Transcript, Score: out.Score,
		Fluency: out.Fluency, Grammar: out.Grammar, Vocabulary: out.Vocabulary,
		Content: out.Content, Topic: out.Topic, Covered: out.Covered, Missed: out.Missed,
		Tips: out.Tips, Improved: out.Improved, CreatedAt: time.Now().UTC()}
	if err := s.repo.SaveEvaluation(ctx, eval); err != nil {
		return nil, err
	}
	return out, nil
}

// ScoreSession grades every answer of a finished interview in one pass and
// records the session. Nothing is graded while the candidate is still talking:
// they answer, press next, answer again, and get one report at the end.
func (s *Service) ScoreSession(ctx context.Context, userID uuid.UUID, in ScoreSessionInput) (*SessionScoreOutput, error) {
	interviewID, err := uuid.Parse(in.InterviewID)
	if err != nil {
		return nil, fmt.Errorf("invalid interview id")
	}
	interview, err := s.repo.FindLatestInterviewByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	out := &SessionScoreOutput{Answers: []SessionAnswerScore{}}
	var sumScore, sumFluency, sumGrammar, sumVocab, sumContent, contentGraded int

	for _, answer := range in.Answers {
		if answer.TurnIndex < 0 || answer.TurnIndex >= len(interview.Turns) {
			continue
		}
		if strings.TrimSpace(answer.Transcript) == "" {
			continue
		}
		turn := interview.Turns[answer.TurnIndex]
		local := scoreAnswerLocally(turn.Answer, answer.Transcript, turn.ExpectedPoints)

		graded := SessionAnswerScore{
			TurnIndex: answer.TurnIndex, Question: turn.Interviewer,
			Transcript: strings.TrimSpace(answer.Transcript),
			Score:      local.Score, Fluency: local.Fluency, Grammar: local.Grammar,
			Vocabulary: local.Vocabulary, Content: local.Content, Topic: turn.Topic,
			Covered: local.Covered, Missed: local.Missed, Tips: local.Tips,
		}
		if len(turn.ExpectedPoints) == 0 {
			// No rubric on this turn: a zero would read as "covered nothing".
			// Empty slices, never nil — a nil slice marshals to JSON null and
			// the template's `.length` access would throw on it.
			graded.Content = 0
			graded.Covered = []string{}
			graded.Missed = []string{}
		} else {
			sumContent += graded.Content
			contentGraded++
		}

		eval := &career.AnswerEvaluation{ID: uuid.New(), UserID: userID, InterviewID: interviewID,
			TurnIndex: answer.TurnIndex, Transcript: graded.Transcript, Score: graded.Score,
			Fluency: graded.Fluency, Grammar: graded.Grammar, Vocabulary: graded.Vocabulary,
			Content: graded.Content, Topic: turn.Topic, Covered: graded.Covered,
			Missed: graded.Missed, Tips: graded.Tips, CreatedAt: time.Now().UTC()}
		if err := s.repo.SaveEvaluation(ctx, eval); err != nil {
			return nil, err
		}

		sumScore += graded.Score
		sumFluency += graded.Fluency
		sumGrammar += graded.Grammar
		sumVocab += graded.Vocabulary
		out.Answers = append(out.Answers, graded)
	}

	out.Answered = len(out.Answers)
	if out.Answered == 0 {
		return nil, fmt.Errorf("no answers were recorded in this session")
	}
	out.Score = sumScore / out.Answered
	out.Fluency = sumFluency / out.Answered
	out.Grammar = sumGrammar / out.Answered
	out.Vocabulary = sumVocab / out.Answered
	if contentGraded > 0 {
		out.Content = sumContent / contentGraded
	}

	// Record the session so the activity calendar can show what was trained.
	jobTitle := ""
	if interview.JobID != uuid.Nil {
		if job, jobErr := s.repo.FindJobByID(ctx, userID, interview.JobID); jobErr == nil {
			jobTitle = job.Title
			if job.Company != "" {
				jobTitle += " · " + job.Company
			}
		}
	}
	session := &career.PracticeSession{ID: uuid.New(), UserID: userID,
		InterviewID: interviewID, JobID: interview.JobID, JobTitle: jobTitle,
		Answers: out.Answered, Score: out.Score, CreatedAt: time.Now().UTC()}
	if err := s.repo.SaveSession(ctx, session); err != nil {
		return nil, err
	}
	return out, nil
}

// ListSessions powers the practice activity calendar.
func (s *Service) ListSessions(ctx context.Context, userID uuid.UUID) ([]career.PracticeSession, error) {
	return s.repo.ListSessionsByUser(ctx, userID, 400)
}

// TopicBreakdown returns per-topic averages for the practice history.
func (s *Service) TopicBreakdown(ctx context.Context, userID uuid.UUID) ([]career.TopicScore, error) {
	return s.repo.TopicBreakdown(ctx, userID)
}

// Topics exposes the catalogue so the frontend and the prompts never drift.
func (s *Service) Topics() []career.Topic { return career.Topics }

// Scores returns the aggregated DSFR Score for the dashboard.
func (s *Service) Scores(ctx context.Context, userID uuid.UUID) (*career.Scores, error) {
	return s.repo.ComputeScores(ctx, userID)
}

func buildEvaluationPrompt(turn career.InterviewTurn, transcript string) string {
	return fmt.Sprintf(`You are an English-for-work coach evaluating a spoken interview answer.

INTERVIEWER QUESTION:
%s

MODEL ANSWER (what the candidate was practicing):
%s
%s
WHAT THE CANDIDATE ACTUALLY SAID (speech-to-text transcript, so punctuation may be missing):
%s

Grade the candidate's spoken answer from 0 to 100 on each dimension. Judge the
transcript for content, grammar and word choice; ignore missing punctuation and
minor transcription noise. Be encouraging but honest.

IMPORTANT — speech-to-text artifacts: the transcript comes from a browser speech
engine trained on everyday language, so technical terms are often mangled into
similar-sounding common words (for example "GraphQL" can appear as "black girl",
"Kubernetes" as "communities", "REST API" as "rest a p i"). When a garbled phrase
sits where a technical term from the model answer belongs and sounds similar,
treat it as correctly said and do NOT deduct points or mention it in the tips.
Grade the candidate's actual English, not the transcription errors.

Give 2-3 short, specific, actionable tips (each under 20 words) — point at real
mistakes in what they said, not generic advice.

"improved" must be a better version of THEIR answer: keep their own ideas and
facts, but fix grammar and make it sound natural and professional. Keep it
speakable and roughly the same length.

Respond with ONLY this JSON, no markdown, no commentary:
{"score":0,"fluency":0,"grammar":0,"vocabulary":0,"content":0,"covered":["..."],"missed":["..."],"tips":["..."],"improved":"..."}`,
		turn.Interviewer, turn.Answer, rubricBlock(turn.ExpectedPoints), transcript)
}

// rubricBlock adds content grading to the prompt. Kept separate because turns
// generated before topic-aware practice carry no expected points, and inventing
// a rubric for them would produce a score with nothing behind it.
func rubricBlock(points []string) string {
	if len(points) == 0 {
		return "\nThis turn has no content rubric. Set \"content\" to 0 and return empty \"covered\" and \"missed\" arrays — grade language only.\n"
	}
	var b strings.Builder
	b.WriteString("\nWHAT A STRONG ANSWER MUST COVER (the content rubric):\n")
	for _, p := range points {
		b.WriteString("- ")
		b.WriteString(p)
		b.WriteString("\n")
	}
	b.WriteString(`
Grade "content" 0-100 on how much of this rubric the answer actually delivered.
Judge substance, not phrasing: a point made in clumsy English still counts, and
fluent English that never makes the point does not. List each rubric item under
"covered" or "missed", copying its wording. Every item appears exactly once.
`)
	return b.String()
}

func parseEvaluation(text string) (*EvaluationOutput, error) {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	if i := strings.Index(text, "{"); i > 0 {
		text = text[i:]
	}
	if i := strings.LastIndex(text, "}"); i >= 0 {
		text = text[:i+1]
	}
	var out EvaluationOutput
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	return &out, nil
}

// GeneratePrepPack builds a personalized study dossier for one job: likely
// questions with model answers grounded in the résumé, smart questions to ask,
// and the profile's weak points versus the job with how to address them.
func (s *Service) GeneratePrepPack(ctx context.Context, userID uuid.UUID, in PrepInput) (*career.PrepPack, error) {
	jobID, err := uuid.Parse(in.JobID)
	if err != nil {
		return nil, fmt.Errorf("invalid job id")
	}
	resume, err := s.repo.FindResumeByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("resume: %w", err)
	}
	job, err := s.repo.FindJobByID(ctx, userID, jobID)
	if err != nil {
		return nil, fmt.Errorf("job: %w", err)
	}

	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return nil, err
	}
	prompt := buildPrepPrompt(resume, job)
	text, err := llm.Complete(ctx, prompt, 6000)
	if err != nil {
		return nil, err
	}
	content, err := parsePrepContent(text)
	if err != nil {
		return nil, err
	}

	pack := &career.PrepPack{ID: uuid.New(), UserID: userID, JobID: jobID,
		Content: *content, CreatedAt: time.Now().UTC()}
	if err := s.repo.SavePrepPack(ctx, pack); err != nil {
		return nil, err
	}
	return pack, nil
}

// LatestPrepPack fetches the most recent dossier for a job.
func (s *Service) LatestPrepPack(ctx context.Context, userID, jobID uuid.UUID) (*career.PrepPack, error) {
	return s.repo.FindLatestPrepPack(ctx, userID, jobID)
}

func buildPrepPrompt(resume *career.Resume, job *career.Job) string {
	return fmt.Sprintf(`You are an expert interview coach preparing a tech professional for a REAL upcoming interview. The candidate will study this to answer confidently in their own words — everything must be grounded in their actual résumé, never invented.

TARGET JOB:
Title: %s
Company: %s
Seniority: %s
Stack: %s
Posting:
%s

CANDIDATE RESUME:
%s

Produce a study dossier:
1. "opening_pitch": a strong ~30-second answer to "Tell me about yourself", tailored to this job, in the first person, using only real résumé facts. Natural spoken English.
2. "likely_questions": the 10 most likely interview questions for THIS job and seniority (mix of behavioral and technical on the job's stack). For each: "question", "why" (one short line on why it's likely), and "model_answer" (a strong first-person answer built from the résumé; for technical questions the answer should be technically correct and specific).
3. "questions_to_ask": 5 smart, specific questions the candidate should ask the interviewer about this role/company.
4. "weak_points": 3 honest gaps between this résumé and this job, each with "gap" and "how_to_address" (how to honestly handle it if asked — no lying, turn it into a growth story or transferable skill).

Answers should be professional but natural to speak. Respond with ONLY this JSON, no markdown, no commentary:
{"opening_pitch":"...","likely_questions":[{"question":"...","why":"...","model_answer":"..."}],"questions_to_ask":["..."],"weak_points":[{"gap":"...","how_to_address":"..."}]}`,
		job.Title, job.Company, job.Seniority, job.Stack, truncate(job.RawText, 3000),
		truncate(resume.RawText, 4000))
}

func parsePrepContent(text string) (*career.PrepContent, error) {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	if i := strings.Index(text, "{"); i > 0 {
		text = text[i:]
	}
	if i := strings.LastIndex(text, "}"); i >= 0 {
		text = text[:i+1]
	}
	var content career.PrepContent
	if err := json.Unmarshal([]byte(text), &content); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	if len(content.LikelyQuestions) == 0 {
		return nil, fmt.Errorf("AI returned an empty prep pack, try again")
	}
	return &content, nil
}

// CreateDebrief analyzes the user's account of a REAL interview they just had:
// what was asked, how they answered, what to fix before the next one. The score
// feeds the DSFR Score alongside simulated practice.
func (s *Service) CreateDebrief(ctx context.Context, userID uuid.UUID, in DebriefInput) (*career.Debrief, error) {
	var jobID uuid.UUID
	var job *career.Job
	if in.JobID != "" {
		parsed, err := uuid.Parse(in.JobID)
		if err != nil {
			return nil, fmt.Errorf("invalid job id")
		}
		if j, err := s.repo.FindJobByID(ctx, userID, parsed); err == nil {
			job, jobID = j, parsed
		}
	}
	// The résumé is optional here: the debrief is about what happened in the
	// room, and we still want it to work for a user who skipped that step.
	resume, _ := s.repo.FindResumeByUser(ctx, userID)

	llm, err := s.completerFor(ctx, userID)
	if err != nil {
		return nil, err
	}
	text, err := llm.Complete(ctx, buildDebriefPrompt(resume, job, in.Notes), 5000)
	if err != nil {
		return nil, err
	}
	content, err := parseDebriefContent(text)
	if err != nil {
		return nil, err
	}

	debrief := &career.Debrief{ID: uuid.New(), UserID: userID, JobID: jobID,
		Notes: strings.TrimSpace(in.Notes), Score: content.Score,
		Analysis: *content, CreatedAt: time.Now().UTC()}
	if err := s.repo.SaveDebrief(ctx, debrief); err != nil {
		return nil, err
	}
	return debrief, nil
}

// ListDebriefs returns the user's recent interview debriefs.
func (s *Service) ListDebriefs(ctx context.Context, userID uuid.UUID) ([]career.Debrief, error) {
	return s.repo.ListDebriefsByUser(ctx, userID, 20)
}

func buildDebriefPrompt(resume *career.Resume, job *career.Job, notes string) string {
	jobBlock := "Not specified."
	if job != nil {
		jobBlock = fmt.Sprintf("%s at %s (%s) — stack: %s", job.Title, job.Company, job.Seniority, job.Stack)
	}
	resumeBlock := "Not provided."
	if resume != nil {
		resumeBlock = truncate(resume.RawText, 3000)
	}
	return fmt.Sprintf(`You are an interview coach doing a post-interview debrief. The candidate just finished a REAL job interview and is telling you how it went, from memory. Your job is to turn this into concrete coaching for the next one.

TARGET JOB:
%s

CANDIDATE RESUME:
%s

WHAT THE CANDIDATE SAYS HAPPENED (their own recollection; may be in Portuguese or English, may be rough or incomplete):
%s

Analyze it and respond in ENGLISH, even if their notes are in Portuguese.

- "score": 0-100, an honest estimate of how well this interview went based on what they describe. Be realistic, not inflated.
- "summary": 2-3 sentences on how the interview went overall.
- "went_well": 2-4 specific things they did well (only what their account supports).
- "to_improve": 2-4 specific, actionable fixes for the next interview.
- "questions": for each question they recall being asked, give "question", "your_answer" (a clean summary of what they said), "assessment" (short, honest), and "better_answer" (a stronger first-person answer they could give next time, grounded in their real résumé — never invent employers, dates or skills they don't have). If they recall no specific questions, return an empty list.
- "study_next": 2-4 concrete topics to study before the next interview, based on where they struggled.
- "follow_up_email": a short, professional thank-you email they can send to the interviewer.

Respond with ONLY this JSON, no markdown, no commentary:
{"score":0,"summary":"...","went_well":["..."],"to_improve":["..."],"questions":[{"question":"...","your_answer":"...","assessment":"...","better_answer":"..."}],"study_next":["..."],"follow_up_email":"..."}`,
		jobBlock, resumeBlock, truncate(notes, 6000))
}

func parseDebriefContent(text string) (*career.DebriefContent, error) {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	if i := strings.Index(text, "{"); i > 0 {
		text = text[i:]
	}
	if i := strings.LastIndex(text, "}"); i >= 0 {
		text = text[:i+1]
	}
	var content career.DebriefContent
	if err := json.Unmarshal([]byte(text), &content); err != nil {
		return nil, fmt.Errorf("AI returned an unexpected format, try again: %w", err)
	}
	if content.Score < 0 {
		content.Score = 0
	}
	if content.Score > 100 {
		content.Score = 100
	}
	return &content, nil
}
