package ai

import (
	"context"
	"fmt"
)

// Completer mirrors the application-layer LLM port.
type Completer interface {
	Complete(ctx context.Context, prompt string, maxTokens int) (string, error)
	Configured() bool
}

// DefaultModels maps provider → sensible default model.
var DefaultModels = map[string]string{
	"openai":    "gpt-4o-mini",
	"anthropic": "claude-haiku-4-5-20251001",
	"gemini":    "gemini-2.0-flash",
}

// ForProvider builds a client for a user-registered provider + key.
func ForProvider(provider, apiKey, model string) (Completer, error) {
	if model == "" {
		model = DefaultModels[provider]
	}
	switch provider {
	case "openai":
		return NewOpenAIClient(apiKey, model), nil
	case "anthropic":
		return NewAnthropicClient(apiKey, model), nil
	case "gemini":
		return NewGeminiClient(apiKey, model), nil
	default:
		return nil, fmt.Errorf("unknown AI provider %q", provider)
	}
}

// New picks the server-default provider based on which env key is present:
// Anthropic first, then OpenAI. If neither key is set, the returned client
// reports Configured() == false and every call fails with ErrNotConfigured.
func New(anthropicKey, anthropicModel, openaiKey, openaiModel string) Completer {
	if anthropicKey != "" {
		return NewAnthropicClient(anthropicKey, anthropicModel)
	}
	if openaiKey != "" {
		return NewOpenAIClient(openaiKey, openaiModel)
	}
	return NewAnthropicClient("", anthropicModel) // unconfigured sentinel
}
