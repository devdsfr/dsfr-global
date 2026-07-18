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

// OpenAIClient calls the OpenAI Chat Completions API.
type OpenAIClient struct {
	apiKey string
	model  string
	http   *http.Client
}

// NewOpenAIClient builds a client. apiKey may be empty; calls will then fail
// with ErrNotConfigured so handlers can return a clear 503.
func NewOpenAIClient(apiKey, model string) *OpenAIClient {
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &OpenAIClient{
		apiKey: apiKey,
		model:  model,
		http:   &http.Client{Timeout: 90 * time.Second},
	}
}

// Configured reports whether the client has an API key.
func (c *OpenAIClient) Configured() bool { return c.apiKey != "" }

type openAIRequest struct {
	Model               string          `json:"model"`
	MaxCompletionTokens int             `json:"max_completion_tokens"`
	Messages            []openAIMessage `json:"messages"`
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
	body, err := json.Marshal(openAIRequest{
		Model:               c.model,
		MaxCompletionTokens: maxTokens,
		Messages:            []openAIMessage{{Role: "user", Content: prompt}},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai request: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var parsed openAIResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("openai response parse: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("openai api: %s", parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("openai api: empty response (status %d)", resp.StatusCode)
	}
	return parsed.Choices[0].Message.Content, nil
}
