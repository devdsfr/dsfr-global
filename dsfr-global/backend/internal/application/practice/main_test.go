package practice

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/dsfr-global/backend/internal/infrastructure/ai"
)

const job = `Senior Java Engineer - Remote (US company)
Requirements: 5+ years Java 17, Spring Boot, microservices, Kafka, Kubernetes, AWS (EKS, SQS),
PostgreSQL, CI/CD with GitHub Actions, observability (Datadog), fluent English.
Nice to have: GraphQL, Terraform.`

const resume = `Daniel Ramos - Backend Developer - Sao Paulo, Brazil
EXPERIENCE
Acme Corp - Backend Developer (2020-2025)
- Built REST APIs with Java and Spring Boot
- Worked on microservices for the payments team
- Database work with PostgreSQL
SKILLS: Java, Spring Boot, PostgreSQL, Docker, Git`

func TestLiveTailor(t *testing.T) {
	key := os.Getenv("GKEY")
	llm := ai.NewGeminiClient(key, "")
	ctx := context.Background()
	before, err := analyzeMatch(ctx, llm, job, resume)
	if err != nil { t.Fatal(err) }
	t.Logf("BEFORE score=%.1f breakdown=%+v", before.Score, before.Breakdown)
	for _, r := range before.Requirements { t.Logf("  [%s] %s", r.Status, r.Requirement) }
	t.Logf("missing kw: %v", before.MissingKeywords)

	conf := []Confirmation{{Requirement: "Kafka", Note: "used at Acme to publish payment events, about 1 year"},
		{Requirement: "AWS", Note: "deployed services on AWS ECS and used SQS at Acme"}}
	text, err := llm.Complete(ctx, buildTailorPrompt(job, resume, conf), 6000)
	if err != nil { t.Fatal(err) }
	var out struct{ Resume string `json:"resume"`; Changes []string `json:"changes"` }
	if err := jsonUnmarshal(extractJSONObject(text), &out); err != nil { t.Fatalf("parse: %v\n%s", err, text) }
	t.Logf("TAILORED:\n%s", out.Resume)
	t.Logf("changes: %v", out.Changes)
	low := strings.ToLower(out.Resume)
	for _, invented := range []string{"terraform", "graphql", "datadog", "github actions"} {
		if strings.Contains(low, invented) { t.Errorf("INVENTED skill not confirmed: %s", invented) }
	}
	after, err := analyzeMatch(ctx, llm, job, out.Resume)
	if err != nil { t.Fatal(err) }
	t.Logf("AFTER score=%.1f", after.Score)
}
