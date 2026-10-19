package docs

import (
	"archive/zip"
	"bytes"
	"strings"
	"testing"
)

func buildDocx(t *testing.T, body string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, err := zw.Create("word/document.xml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = w.Write([]byte(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` + body + `</w:body></w:document>`))
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestExtractDocxText(t *testing.T) {
	data := buildDocx(t,
		`<w:p><w:r><w:t>Daniel Ramos</w:t></w:r></w:p>`+
			`<w:p/><w:p/>`+
			`<w:p><w:r><w:t>EXPERIENCE</w:t></w:r></w:p>`+
			`<w:p><w:r><w:t xml:space="preserve">- Built REST APIs with </w:t></w:r><w:r><w:t>Spring Boot</w:t></w:r></w:p>`)
	got, err := ExtractDocxText(data)
	if err != nil {
		t.Fatal(err)
	}
	want := "Daniel Ramos\n\nEXPERIENCE\n- Built REST APIs with Spring Boot"
	if got != want {
		t.Fatalf("got %q\nwant %q", got, want)
	}
}

func TestExtractDocxRejectsGarbage(t *testing.T) {
	if _, err := ExtractDocxText([]byte("not a zip")); err == nil || !strings.Contains(err.Error(), "docx") {
		t.Fatalf("expected a docx error, got %v", err)
	}
}
