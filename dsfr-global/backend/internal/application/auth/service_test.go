package auth

import "testing"

func TestNormalizeEmail(t *testing.T) {
	cases := map[string]string{
		"  Dev@Example.COM ": "dev@example.com",
		"a@b.co":             "a@b.co",
	}
	for in, want := range cases {
		if got := normalizeEmail(in); got != want {
			t.Errorf("normalizeEmail(%q) = %q, want %q", in, got, want)
		}
	}
}
