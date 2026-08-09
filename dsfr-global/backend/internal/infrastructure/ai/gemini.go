package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	if maxTokens < minGeminiTokens {
		maxTokens = minGeminiTokens
	}
	body, err := json.Marshal(geminiRequest{
		Contents:         []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
		GenerationConfig: geminiGenConfig{MaxOutputTokens: maxTokens},
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
	if len(parsed.Candidates) == 0 {
		return "", fmt.Errorf("gemini api: no candidates returned (status %d)", resp.StatusCode)
	}
	// Thinking models can return reasoning parts alongside the answer; take the
	// first part that carries real output text.
	for _, part := range parsed.Candidates[0].Content.Parts {
		if !part.Thought && part.Text != "" {
			return part.Text, nil
		}
	}
	if parsed.Candidates[0].FinishReason == "MAX_TOKENS" {
		return "", fmt.Errorf("gemini api: response hit the token limit before producing text; try a shorter résumé/job posting")
	}
	return "", fmt.Errorf("gemini api: empty response (finishReason=%s)", parsed.Candidates[0].FinishReason)
}
