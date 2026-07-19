package ai

import (
	"context"
	"fmt"
	"regexp"
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
	"gemini":    "gemini-flash-latest",
}

// Model names always start with a letter (gpt-4o-mini, claude-…, gemini-…).
// Anything else — most often a project number or account ID pasted by mistake —
// is rejected so we fall back to the provider default instead of failing the
// call with a confusing "model not found" from the provider.
var validModel = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._-]{1,79}$`)

// SanitizeModel returns the model if it looks like a real model name,
// otherwise the provider's default.
func SanitizeModel(provider, model string) string {
	if validModel.MatchString(model) {
		return model
	}
	return DefaultModels[provider]
}

// ForProvider builds a client for a user-registered provider + key.
func ForProvider(provider, apiKey, model string) (Completer, error) {
	model = SanitizeModel(provider, model)
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
