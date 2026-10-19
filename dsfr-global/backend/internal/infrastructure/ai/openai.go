package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// OpenAIClient calls an OpenAI-compatible Chat Completions API. The same
// client serves OpenAI itself and Groq, which exposes the identical format.
type OpenAIClient struct {
	apiKey   string
	model    string
	endpoint string // full chat/completions URL
	name     string // provider name used in error messages
	// reasoningEffort is sent to reasoning models that accept it ("low" keeps
	// token use down on free tiers). Empty = parameter omitted.
	reasoningEffort string
	// vision reports whether the provider can read images/PDFs.
	vision bool
	http   *http.Client
}

// NewOpenAIClient builds a client. apiKey may be empty; calls will then fail
// with ErrNotConfigured so handlers can return a clear 503.
func NewOpenAIClient(apiKey, model string) *OpenAIClient {
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAIClient{
		apiKey:   apiKey,
		model:    model,
		endpoint: "https://api.openai.com/v1/chat/completions",
		name:     "openai",
		vision:   true,
		http:     &http.Client{Timeout: 90 * time.Second},
	}
}

// NewGroqClient builds a client for Groq's free-tier-friendly API. Groq's free
// plan allows about 1,000 requests and 200K tokens per day on gpt-oss-120b,
// far above Gemini's ~20 requests/day, at the cost of no image/PDF reading.
func NewGroqClient(apiKey, model string) *OpenAIClient {
	if model == "" {
		model = "openai/gpt-oss-120b"
	}
	effort := ""
	if strings.HasPrefix(model, "openai/gpt-oss") {
		effort = "low"
	}
	return &OpenAIClient{
		apiKey:          apiKey,
		model:           model,
		endpoint:        "https://api.groq.com/openai/v1/chat/completions",
		name:            "groq",
		reasoningEffort: effort,
		vision:          false,
		http:            &http.Client{Timeout: 90 * time.Second},
	}
}

// Configured reports whether the client has an API key.
func (c *OpenAIClient) Configured() bool { return c.apiKey != "" }

type openAIRequest struct {
	Model               string          `json:"model"`
	MaxCompletionTokens int             `json:"max_completion_tokens"`
	Messages            []openAIMessage `json:"messages"`
	ReasoningEffort     string          `json:"reasoning_effort,omitempty"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// Complete sends a single-user-message prompt and returns the text response.
func (c *OpenAIClient) Complete(ctx context.Context, prompt string, maxTokens int) (string, error) {
	if !c.Configured() {
		return "", ErrNotConfigured
	}
	return c.send(ctx, openAIRequest{
		Model:               c.model,
		MaxCompletionTokens: maxTokens,
		Messages:            []openAIMessage{{Role: "user", Content: prompt}},
		ReasoningEffort:     c.reasoningEffort,
	})
}

// maxRateLimitWait bounds how long a request will wait out a per-minute limit.
// Groq's free plan caps tokens per minute, so the back-to-back calls of the
// resume-match flow can hit it; a short wait beats failing the whole flow.
const maxRateLimitWait = 20 * time.Second

// send posts a payload and returns the first choice's text, retrying once on
// a 429 when the provider says the wait is short.
func (c *OpenAIClient) send(ctx context.Context, payload any) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	for attempt := 1; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+c.apiKey)

		resp, err := c.http.Do(req)
		if err != nil {
			return "", fmt.Errorf("%s request: %w", c.name, err)
		}
		raw, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return "", err
		}

		if resp.StatusCode == http.StatusTooManyRequests && attempt == 1 {
			if wait, ok := retryAfter(resp.Header.Get("retry-after")); ok && wait <= maxRateLimitWait {
				select {
				case <-time.After(wait):
					continue
				case <-ctx.Done():
					return "", ctx.Err()
				}
			}
		}

		var parsed openAIResponse
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return "", fmt.Errorf("%s response parse: %w", c.name, err)
		}
		if parsed.Error != nil {
			return "", fmt.Errorf("%s api: %s", c.name, parsed.Error.Message)
		}
		if len(parsed.Choices) == 0 {
			return "", fmt.Errorf("%s api: empty response (status %d)", c.name, resp.StatusCode)
		}
		return parsed.Choices[0].Message.Content, nil
	}
}

// retryAfter parses a Retry-After header given in seconds.
func retryAfter(value string) (time.Duration, bool) {
	seconds, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil || seconds < 0 {
		return 0, false
	}
	return time.Duration(seconds*1000) * time.Millisecond, true
}
