package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// FileCompleter is implemented by clients that can read an attached file
// (a screenshot of a job posting, a PDF résumé) alongside the prompt.
type FileCompleter interface {
	CompleteWithFile(ctx context.Context, prompt, mimeType string, data []byte, maxTokens int) (string, error)
}

// Supported attachment types. Every provider here accepts images and PDFs.
func isImage(mime string) bool { return strings.HasPrefix(mime, "image/") }
func isPDF(mime string) bool   { return mime == "application/pdf" }

// postJSON sends a JSON payload and returns the raw response body.
func postJSON(ctx context.Context, client *http.Client, url string, headers map[string]string, payload any) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// ---------------------------------------------------------------- Gemini ----

type geminiFilePart struct {
	Text       string            `json:"text,omitempty"`
	InlineData *geminiInlineData `json:"inlineData,omitempty"`
}

type geminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiFileRequest struct {
	Contents []struct {
		Parts []geminiFilePart `json:"parts"`
	} `json:"contents"`
	GenerationConfig geminiGenConfig `json:"generationConfig"`
}

// CompleteWithFile sends the prompt plus one inline file to Gemini.
func (c *GeminiClient) CompleteWithFile(ctx context.Context, prompt, mimeType string, data []byte, maxTokens int) (string, error) {
	if !c.Configured() {
		return "", ErrNotConfigured
	}
	if !isImage(mimeType) && !isPDF(mimeType) {
		return "", fmt.Errorf("unsupported file type %q", mimeType)
	}
	var payload geminiFileRequest
	payload.Contents = make([]struct {
		Parts []geminiFilePart `json:"parts"`
	}, 1)
	payload.Contents[0].Parts = []geminiFilePart{
		{InlineData: &geminiInlineData{MimeType: mimeType, Data: base64.StdEncoding.EncodeToString(data)}},
		{Text: prompt},
	}
	payload.GenerationConfig = geminiGenConfig{MaxOutputTokens: geminiBudget(maxTokens)}
	return c.generateWithFallback(ctx, payload)
}

// ------------------------------------------------------------- Anthropic ----

type anthropicSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

type anthropicBlock struct {
	Type   string           `json:"type"`
	Text   string           `json:"text,omitempty"`
	Source *anthropicSource `json:"source,omitempty"`
}

type anthropicFileRequest struct {
	Model     string `json:"model"`
	MaxTokens int    `json:"max_tokens"`
	Messages  []struct {
		Role    string           `json:"role"`
		Content []anthropicBlock `json:"content"`
	} `json:"messages"`
}

// CompleteWithFile sends the prompt plus one image or PDF to Anthropic.
func (c *AnthropicClient) CompleteWithFile(ctx context.Context, prompt, mimeType string, data []byte, maxTokens int) (string, error) {
	if !c.Configured() {
		return "", ErrNotConfigured
	}
	blockType := "image"
	switch {
	case isPDF(mimeType):
		blockType = "document"
	case isImage(mimeType):
	default:
		return "", fmt.Errorf("unsupported file type %q", mimeType)
	}
	payload := anthropicFileRequest{Model: c.model, MaxTokens: maxTokens}
	payload.Messages = make([]struct {
		Role    string           `json:"role"`
		Content []anthropicBlock `json:"content"`
	}, 1)
	payload.Messages[0].Role = "user"
	payload.Messages[0].Content = []anthropicBlock{
		{Type: blockType, Source: &anthropicSource{Type: "base64", MediaType: mimeType,
			Data: base64.StdEncoding.EncodeToString(data)}},
		{Type: "text", Text: prompt},
	}

	raw, err := postJSON(ctx, c.http, "https://api.anthropic.com/v1/messages",
		map[string]string{"x-api-key": c.apiKey, "anthropic-version": "2023-06-01"}, payload)
	if err != nil {
		return "", fmt.Errorf("anthropic request: %w", err)
	}
	var parsed anthropicResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return "", fmt.Errorf("anthropic response parse: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("anthropic api: %s", parsed.Error.Message)
	}
	for _, block := range parsed.Content {
		if block.Type == "text" && block.Text != "" {
			return block.Text, nil
		}
	}
	return "", fmt.Errorf("anthropic api: empty response")
}

// ---------------------------------------------------------------- OpenAI ----

type openAIImageURL struct {
	URL string `json:"url"`
}

type openAIFile struct {
	Filename string `json:"filename"`
	FileData string `json:"file_data"`
}

type openAIPart struct {
	Type     string          `json:"type"`
	Text     string          `json:"text,omitempty"`
	ImageURL *openAIImageURL `json:"image_url,omitempty"`
	File     *openAIFile     `json:"file,omitempty"`
}

type openAIFileRequest struct {
	Model               string `json:"model"`
	MaxCompletionTokens int    `json:"max_completion_tokens"`
	Messages            []struct {
		Role    string       `json:"role"`
		Content []openAIPart `json:"content"`
	} `json:"messages"`
}

// CompleteWithFile sends the prompt plus one image or PDF to OpenAI.
func (c *OpenAIClient) CompleteWithFile(ctx context.Context, prompt, mimeType string, data []byte, maxTokens int) (string, error) {
	if !c.Configured() {
		return "", ErrNotConfigured
	}
	if !c.vision {
		return "", fmt.Errorf("%s can't read screenshots or PDFs — paste the text instead, "+
			"or switch to Gemini, OpenAI or Anthropic in AI Settings for file reading", c.name)
	}
	dataURL := "data:" + mimeType + ";base64," + base64.StdEncoding.EncodeToString(data)
	var attachment openAIPart
	switch {
	case isImage(mimeType):
		attachment = openAIPart{Type: "image_url", ImageURL: &openAIImageURL{URL: dataURL}}
	case isPDF(mimeType):
		attachment = openAIPart{Type: "file", File: &openAIFile{Filename: "document.pdf", FileData: dataURL}}
	default:
		return "", fmt.Errorf("unsupported file type %q", mimeType)
	}
	payload := openAIFileRequest{Model: c.model, MaxCompletionTokens: maxTokens}
	payload.Messages = make([]struct {
		Role    string       `json:"role"`
		Content []openAIPart `json:"content"`
	}, 1)
	payload.Messages[0].Role = "user"
	payload.Messages[0].Content = []openAIPart{{Type: "text", Text: prompt}, attachment}

	return c.send(ctx, payload)
}
