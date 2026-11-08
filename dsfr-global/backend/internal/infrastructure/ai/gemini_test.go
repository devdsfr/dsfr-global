package ai

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

const overloaded = `{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}`
const okAnswer = `{"candidates":[{"content":{"parts":[{"text":"ok"}]},"finishReason":"STOP"}]}`

// fakeGemini answers per model from a scripted list of responses.
func fakeGemini(t *testing.T, script map[string][]string) (*GeminiClient, func() []string) {
	t.Helper()
	var mu sync.Mutex
	var calls []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		model := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/"), ":generateContent")
		calls = append(calls, model)
		queue := script[model]
		if len(queue) == 0 {
			t.Errorf("unexpected call to %s", model)
			w.WriteHeader(500)
			return
		}
		body := queue[0]
		script[model] = queue[1:]
		if body == overloaded {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	c := NewGeminiClient("key", "gemini-flash-latest")
	c.baseURL = srv.URL
	return c, func() []string { mu.Lock(); defer mu.Unlock(); return append([]string(nil), calls...) }
}

func init() { overloadRetryDelay = time.Millisecond }

func TestGeminiRetriesOverloadOnSameModel(t *testing.T) {
	c, calls := fakeGemini(t, map[string][]string{"gemini-flash-latest": {overloaded, okAnswer}})
	got, err := c.Complete(context.Background(), "hi", 100)
	if err != nil || got != "ok" {
		t.Fatalf("got %q, %v", got, err)
	}
	if n := len(calls()); n != 2 {
		t.Fatalf("calls = %v", calls())
	}
}

func TestGeminiFallsBackToLiteWhenStillOverloaded(t *testing.T) {
	c, calls := fakeGemini(t, map[string][]string{
		"gemini-flash-latest":      {overloaded, overloaded},
		"gemini-flash-lite-latest": {okAnswer},
	})
	got, err := c.Complete(context.Background(), "hi", 100)
	if err != nil || got != "ok" {
		t.Fatalf("got %q, %v (calls %v)", got, err, calls())
	}
}

func TestGeminiOverloadEverywhereGivesClearMessage(t *testing.T) {
	c, _ := fakeGemini(t, map[string][]string{
		"gemini-flash-latest":      {overloaded, overloaded},
		"gemini-flash-lite-latest": {overloaded},
	})
	_, err := c.Complete(context.Background(), "hi", 100)
	if err == nil || !strings.Contains(err.Error(), "Groq") {
		t.Fatalf("expected a clear overload message, got %v", err)
	}
}
