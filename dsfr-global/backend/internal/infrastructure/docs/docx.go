// Package docs extracts plain text from uploaded documents.
package docs

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"errors"
	"io"
	"strings"
)

// DocxMime is the MIME type browsers report for .docx files.
const DocxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

// ExtractDocxText returns the text of a .docx file. A .docx is a zip archive
// whose body lives in word/document.xml, so this needs only the standard
// library — no AI call and no tokens spent just to read a résumé.
func ExtractDocxText(data []byte) (string, error) {
	archive, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", errors.New("not a valid .docx file")
	}
	var document *zip.File
	for _, f := range archive.File {
		if f.Name == "word/document.xml" {
			document = f
			break
		}
	}
	if document == nil {
		return "", errors.New("the .docx file has no document body")
	}
	rc, err := document.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()

	var (
		out    strings.Builder
		inText bool
	)
	decoder := xml.NewDecoder(rc)
	for {
		tok, err := decoder.Token()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return "", errors.New("could not read the .docx contents")
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "t":
				inText = true
			case "tab":
				out.WriteString("\t")
			case "br", "cr":
				out.WriteString("\n")
			}
		case xml.EndElement:
			switch t.Name.Local {
			case "t":
				inText = false
			case "p":
				out.WriteString("\n") // end of paragraph
			}
		case xml.CharData:
			if inText {
				out.Write(t)
			}
		}
	}

	// Collapse the runs of blank lines Word leaves between paragraphs.
	lines := strings.Split(out.String(), "\n")
	cleaned := make([]string, 0, len(lines))
	blank := 0
	for _, line := range lines {
		line = strings.TrimRight(line, " \t")
		if line == "" {
			blank++
			if blank > 1 {
				continue
			}
		} else {
			blank = 0
		}
		cleaned = append(cleaned, line)
	}
	text := strings.TrimSpace(strings.Join(cleaned, "\n"))
	if text == "" {
		return "", errors.New("the .docx file has no readable text")
	}
	return text, nil
}
