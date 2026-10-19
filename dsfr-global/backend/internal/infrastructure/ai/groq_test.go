package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGroqClientSendsReasoningEffortAndRetriesShort429(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if got := r.Header.Get("Authorization"); got != "Bearer gsk_test" {
			t.Errorf("auth header = %q", got)
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["model"] != "openai/gpt-oss-120b" || body["reasoning_effort"] != "low" {
			t.Errorf("unexpected payload: %v", body)
		}
		if calls == 1 {
			w.Header().Set("retry-after", "0.01")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"message":"rate limit"}}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"hello"}}]}`))
	}))
	defer srv.Close()

	c := NewGroqClient("gsk_test", "")
	c.endpoint = srv.URL
	got, err := c.Complete(context.Background(), "hi", 100)
	if err != nil || got != "hello" {
		t.Fatalf("got %q, %v", got, err)
	}
	if calls != 2 {
		t.Fatalf("expected one retry, got %d calls", calls)
	}
}

func TestGroqRefusesFiles(t *testing.T) {
	c := NewGroqClient("gsk_test", "")
	_, err := c.CompleteWithFile(context.Background(), "x", "image/png", []byte{1}, 100)
	if err == nil || !strings.Contains(err.Error(), "can't read screenshots") {
		t.Fatalf("expected a clear refusal, got %v", err)
	}
}

func TestOpenAIOmitsReasoningEffort(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if _, ok := body["reasoning_effort"]; ok {
			t.Errorf("openai payload must not carry reasoning_effort")
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"ok"}}]}`))
	}))
	defer srv.Close()
	c := NewOpenAIClient("sk-test", "")
	c.endpoint = srv.URL
	if _, err := c.Complete(context.Background(), "hi", 10); err != nil {
		t.Fatal(err)
	}
}

func TestSanitizeModelAcceptsNamespacedGroqModel(t *testing.T) {
	if got := SanitizeModel("groq", "openai/gpt-oss-120b"); got != "openai/gpt-oss-120b" {
		t.Fatalf("got %q", got)
	}
	if got := SanitizeModel("groq", "123456"); got != "openai/gpt-oss-120b" {
		t.Fatalf("got %q", got)
	}
}
