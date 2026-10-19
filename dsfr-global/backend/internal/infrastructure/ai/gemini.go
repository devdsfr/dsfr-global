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
	apiKey string
	model  string
	http   *http.Client
}

// NewGeminiClient builds a client. apiKey may be empty; calls will then fail
// with ErrNotConfigured so handlers can return a clear 503.
func NewGeminiClient(apiKey, model string) *GeminiClient {
	if model == "" {
		model = "gemini-flash-latest"
	}
	return &GeminiClient{
		apiKey: apiKey,
		model:  model,
		http:   &http.Client{Timeout: 90 * time.Second},
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
	body, err := json.Marshal(geminiRequest{
		Contents:         []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
		GenerationConfig: geminiGenConfig{MaxOutputTokens: geminiBudget(maxTokens)},
	})
	if err != nil {
		return "", err
	}
	// The API key goes in the X-goog-api-key header, never in the query string:
	// URLs end up in server/proxy logs, which would leak the user's key.
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", c.model)
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
