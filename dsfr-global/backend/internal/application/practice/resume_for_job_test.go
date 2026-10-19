package practice

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/dsfr-global/backend/internal/domain/career"
)

// baseOnlyRepo answers FindResumeByUser; any other repository call panics,
// which proves ResumeForJob touches nothing else.
type baseOnlyRepo struct {
	career.Repository
	base *career.Resume
}

func (r baseOnlyRepo) FindResumeByUser(context.Context, uuid.UUID) (*career.Resume, error) {
	if r.base == nil {
		return nil, career.ErrNotFound
	}
	return r.base, nil
}

func TestResumeForJob(t *testing.T) {
	user := uuid.New()
	svc := &Service{repo: baseOnlyRepo{base: &career.Resume{RawText: "BASE resume"}}}
	ctx := context.Background()

	csharp := &career.Job{Title: "C# Developer", ResumeText: "TAILORED for C#"}
	java := &career.Job{Title: "Java Developer"} // no tailored version

	cases := []struct {
		name string
		job  *career.Job
		want string
	}{
		{"tailored job uses its own resume", csharp, "TAILORED for C#"},
		{"job without a version falls back to base", java, "BASE resume"},
		{"no job at all uses base", nil, "BASE resume"},
		{"whitespace-only version falls back to base", &career.Job{ResumeText: "  \n "}, "BASE resume"},
	}
	for _, c := range cases {
		got, err := svc.ResumeForJob(ctx, user, c.job)
		if err != nil {
			t.Fatalf("%s: %v", c.name, err)
		}
		if got.RawText != c.want {
			t.Errorf("%s: got %q, want %q", c.name, got.RawText, c.want)
		}
	}

	// A tailored job works even when the user never saved a base resume.
	noBase := &Service{repo: baseOnlyRepo{}}
	if got, err := noBase.ResumeForJob(ctx, user, csharp); err != nil || got.RawText != "TAILORED for C#" {
		t.Fatalf("tailored job without base resume: %v %v", got, err)
	}
	if _, err := noBase.ResumeForJob(ctx, user, java); err == nil {
		t.Fatal("expected an error when neither a tailored nor a base resume exists")
	}
}
