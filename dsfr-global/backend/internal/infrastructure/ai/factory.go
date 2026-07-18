package ai

import "context"

// Completer mirrors the application-layer LLM port.
type Completer interface {
	Complete(ctx context.Context, prompt string, maxTokens int) (string, error)
	Configured() bool
}

// New picks a provider based on which API key is present: Anthropic first,
// then OpenAI. If neither key is set, the returned client reports
// Configured() == false and every call fails with ErrNotConfigured.
func New(anthropicKey, anthropicModel, openaiKey, openaiModel string) Completer {
	if anthropicKey != "" {
		return NewAnthropicClient(anthropicKey, anthropicModel)
	}
	if openaiKey != "" {
		return NewOpenAIClient(openaiKey, openaiModel)
	}
	return NewAnthropicClient("", anthropicModel) // unconfigured sentinel
}
