package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// GeminiClient calls the Google Generative Language API.
type GeminiClient struct {
	apiKey  string
	model   string
	baseURL string // models endpoint; overridable in tests
	http    *http.Client
}

// NewGeminiClient builds a client. apiKey may be empty; calls will then fail
// with ErrNotConfigured so handlers can return a clear 503.
func NewGeminiClient(apiKey, model string) *GeminiClient {
	if model == "" {
		model = "gemini-flash-latest"
	}
	return &GeminiClient{
		apiKey:  apiKey,
		model:   model,
		baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
		http:    &http.Client{Timeout: 90 * time.Second},
	}
}

// Configured reports whether the client has an API key.
func (c *GeminiClient) Configured() bool { return c.apiKey != "" }

type geminiRequest struct {
	Contents         []geminiContent `json:"contents"`
	GenerationConfig geminiGenConfig `json:"generationConfig"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
	// Thought marks internal reasoning parts on thinking models. They must be
	// skipped: the answer we want is the first non-thought part.
	Thought bool `json:"thought,omitempty"`
}

type geminiGenConfig struct {
	MaxOutputTokens int `json:"maxOutputTokens"`
}

// minGeminiTokens gives thinking models room to reason AND still emit the
// answer. Thinking consumes the same output budget, so a tight limit can end
// the response before any text is produced (finishReason=MAX_TOKENS).
//
// Note: we deliberately do NOT send thinkingConfig. Setting thinkingBudget to 0
// is rejected with 400 INVALID_ARGUMENT by current Gemini 3.x models, which
// cannot have thinking disabled — omitting the field works across all versions.
const minGeminiTokens = 2000

// geminiThinkingHeadroom is added on top of what the caller asked for. Gemini
// 3.x spends 2-3k tokens reasoning before it writes, out of the SAME output
// budget. Measured on the interview prompt: thoughts 2.2k-2.8k + answer ~1.2k,
// so a 4000 limit truncated about one call in five mid-JSON. Callers size their
// budget for the answer; the headroom pays for the thinking.
const geminiThinkingHeadroom = 4096

// geminiBudget turns the caller's answer budget into Gemini's total budget.
func geminiBudget(maxTokens int) int {
	if maxTokens < minGeminiTokens {
		maxTokens = minGeminiTokens
	}
	return maxTokens + geminiThinkingHeadroom
}

// geminiAnswer joins every non-thought text part. Gemini may split one answer
// across several parts; returning only the first would cut the JSON short.
// A MAX_TOKENS finish means the text is incomplete, so it is reported as an
// error instead of being handed to a JSON parser as if it were whole.
func geminiAnswer(parsed *geminiResponse) (string, error) {
	if len(parsed.Candidates) == 0 {
		return "", fmt.Errorf("gemini api: no candidates returned")
	}
	candidate := parsed.Candidates[0]
	var text strings.Builder
	for _, part := range candidate.Content.Parts {
		if !part.Thought {
			text.WriteString(part.Text)
		}
	}
	if candidate.FinishReason == "MAX_TOKENS" {
		return "", fmt.Errorf("gemini api: the answer was cut off by the token limit — please try again")
	}
	if text.Len() == 0 {
		return "", fmt.Errorf("gemini api: empty response (finishReason=%s)", candidate.FinishReason)
	}
	return text.String(), nil
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []geminiPart `json:"parts"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Complete sends a single prompt and returns the text response.
func (c *GeminiClient) Complete(ctx context.Context, prompt string, maxTokens int) (string, error) {
	if !c.Configured() {
		return "", ErrNotConfigured
	}
	payload := geminiRequest{
		Contents:         []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
		GenerationConfig: geminiGenConfig{MaxOutputTokens: geminiBudget(maxTokens)},
	}
	return c.generateWithFallback(ctx, payload)
}

// geminiFallbackModel has its own free-tier quota, separate from the main
// flash model. Free keys get only ~20 requests/day per model, so when the main
// model is exhausted the lite one keeps the app usable instead of failing
// until the next day.
const geminiFallbackModel = "gemini-flash-lite-latest"

// isQuotaError recognises a provider rate/quota rejection.
func isQuotaError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "exceeded your current quota") ||
		strings.Contains(msg, "resource_exhausted") ||
		strings.Contains(msg, "rate limit")
}

// isOverloadError recognises Google's temporary 503 "high demand" rejection.
// It says nothing about the user's quota: the same call usually works seconds
// later, or right away on a different model.
func isOverloadError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "high demand") ||
		strings.Contains(msg, "overloaded") ||
		strings.Contains(msg, "unavailable") ||
		strings.Contains(msg, "try again later")
}

// overloadRetryDelay is the pause before retrying an overloaded model.
var overloadRetryDelay = 2 * time.Second

// generateWithFallback calls the configured model. On a temporary overload it
// waits briefly and retries once; if the model is still overloaded or its
// quota is spent, it retries once on the lite model.
func (c *GeminiClient) generateWithFallback(ctx context.Context, payload any) (string, error) {
	text, err := c.generate(ctx, c.model, payload)
	if isOverloadError(err) {
		select {
		case <-time.After(overloadRetryDelay):
		case <-ctx.Done():
			return "", ctx.Err()
		}
		text, err = c.generate(ctx, c.model, payload)
	}
	if (isQuotaError(err) || isOverloadError(err)) && c.model != geminiFallbackModel {
		fallbackText, fallbackErr := c.generate(ctx, geminiFallbackModel, payload)
		if fallbackErr == nil {
			return fallbackText, nil
		}
		if isOverloadError(fallbackErr) || isOverloadError(err) {
			return "", fmt.Errorf("gemini api: Google's servers are overloaded right now (on both %s and %s) — "+
				"wait a minute and try again, or switch to Groq (free) in AI Settings",
				c.model, geminiFallbackModel)
		}
		if isQuotaError(fallbackErr) {
			return "", fmt.Errorf("gemini api: the daily free quota is used up on both %s and %s — "+
				"try again tomorrow, enable billing on your Google AI key, or switch to Groq (free) in AI Settings",
				c.model, geminiFallbackModel)
		}
		return "", fallbackErr
	}
	return text, err
}

// generate performs one generateContent call against the given model.
func (c *GeminiClient) generate(ctx context.Context, model string, payload any) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	// The API key goes in the X-goog-api-key header, never in the query string:
	// URLs end up in server/proxy logs, which would leak the user's key.
	url := fmt.Sprintf("%s/%s:generateContent", c.baseURL, model)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-goog-api-key", c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini request: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var parsed geminiResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("gemini response parse: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("gemini api: %s", parsed.Error.Message)
	}
	return geminiAnswer(&parsed)
}
