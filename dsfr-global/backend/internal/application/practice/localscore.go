package practice

import (
	"fmt"
	"sort"
	"strings"
)

// Offline answer scoring.
//
// Grading every answer with the LLM cost one API call per question: eight calls
// per session, several seconds of waiting each, and it burns through provider
// free-tier limits (Gemini caps free requests per minute). This engine grades
// the same answer in microseconds with no network and no tokens, by comparing
// what the candidate said against the model answer they were reading.
//
// What it measures honestly:
//   - content:    how many of the model answer's key terms were actually said
//   - vocabulary: how much of the domain/technical language was reused
//   - fluency:    length against the target, filler density, repetition
//   - grammar:    a curated list of high-frequency spoken-English mistakes
//
// It does not attempt open-ended language critique — that is what the optional
// AI review at the end of a session is for.

// localScore is the result of grading one spoken answer offline.
type localScore struct {
	Score      int
	Content    int
	Vocabulary int
	Fluency    int
	Grammar    int
	Covered    []string
	Missed     []string
	Tips       []string
}

// stopWords are ignored when deciding what a model answer is "about".
var stopWords = map[string]bool{
	"the": true, "and": true, "for": true, "with": true, "that": true, "this": true,
	"have": true, "has": true, "had": true, "was": true, "were": true, "are": true,
	"you": true, "your": true, "our": true, "their": true, "its": true, "his": true,
	"her": true, "they": true, "them": true, "she": true, "him": true, "who": true,
	"what": true, "when": true, "where": true, "which": true, "there": true,
	"here": true, "from": true, "into": true, "onto": true, "over": true,
	"very": true, "much": true, "many": true, "some": true, "also": true,
	"then": true, "than": true, "because": true, "about": true, "would": true,
	"could": true, "should": true, "will": true, "can": true, "not": true,
	"but": true, "all": true, "any": true, "how": true, "why": true, "get": true,
	"got": true, "use": true, "used": true, "using": true, "make": true,
	"made": true, "like": true, "just": true, "more": true, "most": true,
	"work": true, "working": true, "worked": true, "need": true, "needs": true,
	"want": true, "good": true, "well": true, "helps": true, "help": true,
	"one": true, "two": true, "way": true, "time": true, "team": true,
	"thank": true, "hello": true, "opportunity": true, "years": true, "year": true,
}

// fillerWords cost fluency points when they pile up.
var fillerWords = map[string]bool{
	"uh": true, "um": true, "eh": true, "ah": true, "er": true, "hmm": true,
	"like": true, "basically": true, "actually": true, "literally": true,
	"kinda": true, "sorta": true, "stuff": true, "things": true,
}

// grammarRule is a spoken-English mistake that can be detected reliably from a
// transcript without a parser. Kept deliberately small: every rule here is a
// real error, so a hit is never a false alarm.
type grammarRule struct {
	pattern string
	tip     string
}

var grammarRules = []grammarRule{
	{"i is", "Say \"I am\", never \"I is\"."},
	{"i has", "Say \"I have\", never \"I has\"."},
	{"i are", "Say \"I am\", never \"I are\"."},
	{"he have", "Third person takes -s: \"he has\"."},
	{"she have", "Third person takes -s: \"she has\"."},
	{"it have", "Third person takes -s: \"it has\"."},
	{"they is", "Plural takes \"are\": \"they are\"."},
	{"we is", "Plural takes \"are\": \"we are\"."},
	{"people is", "\"People\" is plural: \"people are\"."},
	{"more better", "Drop \"more\": just \"better\"."},
	{"more easier", "Drop \"more\": just \"easier\"."},
	{"informations", "\"Information\" has no plural."},
	{"advices", "\"Advice\" has no plural."},
	{"feedbacks", "\"Feedback\" has no plural."},
	{"softwares", "\"Software\" has no plural."},
	{"knowledges", "\"Knowledge\" has no plural."},
	{"explain me", "Say \"explain to me\"."},
	{"i am agree", "Say \"I agree\"."},
	{"depend of", "Say \"depends on\"."},
	{"responsible for make", "Use the -ing form: \"responsible for making\"."},
	{"i have experience in work", "Use the -ing form: \"experience in working\"."},
}

// tokenize lowercases the text and splits it into comparable words, keeping the
// characters that appear in technical terms (c#, node.js, ci/cd).
func tokenize(text string) []string {
	lowered := strings.ToLower(text)
	fields := strings.FieldsFunc(lowered, func(r rune) bool {
		switch {
		case r >= 'a' && r <= 'z':
			return false
		case r >= '0' && r <= '9':
			return false
		case r == '+' || r == '#' || r == '.':
			return false
		default:
			return true
		}
	})
	tokens := make([]string, 0, len(fields))
	for _, f := range fields {
		trimmed := strings.Trim(f, ".")
		if trimmed != "" {
			tokens = append(tokens, trimmed)
		}
	}
	return tokens
}

// keyTerms are the words that carry the meaning of the model answer, ordered by
// how much weight they should get (longer, rarer words first).
func keyTerms(expected string) []string {
	seen := map[string]bool{}
	terms := []string{}
	for _, token := range tokenize(expected) {
		if len(token) < 4 || stopWords[token] || seen[token] {
			continue
		}
		seen[token] = true
		terms = append(terms, token)
	}
	sort.SliceStable(terms, func(i, j int) bool { return len(terms[i]) > len(terms[j]) })
	return terms
}

// editDistance is the standard Levenshtein distance, capped for short words.
func editDistance(a, b string) int {
	ra, rb := []rune(a), []rune(b)
	prev := make([]int, len(rb)+1)
	curr := make([]int, len(rb)+1)
	for j := range prev {
		prev[j] = j
	}
	for i := 1; i <= len(ra); i++ {
		curr[0] = i
		for j := 1; j <= len(rb); j++ {
			cost := 1
			if ra[i-1] == rb[j-1] {
				cost = 0
			}
			min := prev[j] + 1
			if curr[j-1]+1 < min {
				min = curr[j-1] + 1
			}
			if prev[j-1]+cost < min {
				min = prev[j-1] + cost
			}
			curr[j] = min
		}
		copy(prev, curr)
	}
	return prev[len(rb)]
}

// spokenAs reports whether a transcript token is a plausible rendering of a
// target term. Speech engines mangle technical words into everyday ones, so an
// exact match alone would punish the candidate for the engine's mistake.
func spokenAs(token, target string) bool {
	if token == target {
		return true
	}
	// Plural/verb endings: "container" vs "containers", "deploy" vs "deployed".
	if strings.HasPrefix(token, target) && len(token)-len(target) <= 3 {
		return true
	}
	if strings.HasPrefix(target, token) && len(target)-len(token) <= 3 {
		return true
	}
	if len(target) >= 6 && editDistance(token, target) <= 2 {
		return true
	}
	if len(target) >= 4 && len(target) < 6 && editDistance(token, target) <= 1 {
		return true
	}
	return false
}

// clamp keeps a computed score inside 0..100.
func clamp(v int) int {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}

// scoreAnswerLocally grades one spoken answer against the answer the candidate
// was practising. rubric holds the key points for the turn when the script
// carries them; when it is empty the model answer itself supplies them.
func scoreAnswerLocally(expected, transcript string, rubric []string) localScore {
	said := tokenize(transcript)

	// --- Content: which key terms of the model answer were actually said ---
	terms := keyTerms(expected)
	covered := []string{}
	missed := []string{}
	for _, term := range terms {
		hit := false
		for _, token := range said {
			if spokenAs(token, term) {
				hit = true
				break
			}
		}
		if hit {
			covered = append(covered, term)
		} else {
			missed = append(missed, term)
		}
	}
	content := 100
	if len(terms) > 0 {
		content = clamp(len(covered) * 100 / len(terms))
	}

	// Rubric points, when present, are the real content signal: each point is a
	// phrase, and it counts as covered when most of its words were said.
	if len(rubric) > 0 {
		hits := 0
		rubricMissed := []string{}
		for _, point := range rubric {
			pointTerms := keyTerms(point)
			if len(pointTerms) == 0 {
				continue
			}
			matched := 0
			for _, term := range pointTerms {
				for _, token := range said {
					if spokenAs(token, term) {
						matched++
						break
					}
				}
			}
			if matched*2 >= len(pointTerms) {
				hits++
			} else {
				rubricMissed = append(rubricMissed, point)
			}
		}
		if len(rubric) > 0 {
			content = clamp(hits * 100 / len(rubric))
			missed = rubricMissed
			covered = []string{}
			for _, point := range rubric {
				isMissed := false
				for _, m := range rubricMissed {
					if m == point {
						isMissed = true
						break
					}
				}
				if !isMissed {
					covered = append(covered, point)
				}
			}
		}
	}

	// --- Vocabulary: reuse of the answer's longer, domain-specific words ---
	domain := []string{}
	for _, term := range terms {
		if len(term) >= 6 {
			domain = append(domain, term)
		}
	}
	vocabulary := 100
	if len(domain) > 0 {
		used := 0
		for _, term := range domain {
			for _, token := range said {
				if spokenAs(token, term) {
					used++
					break
				}
			}
		}
		vocabulary = clamp(used * 100 / len(domain))
	}

	// --- Fluency: length against target, fillers, repetition ---
	expectedWords := len(tokenize(expected))
	spokenWords := len(said)
	fluency := 100
	tips := []string{}

	if expectedWords > 0 && spokenWords > 0 {
		ratio := float64(spokenWords) / float64(expectedWords)
		switch {
		case ratio < 0.5:
			fluency -= 35
			tips = append(tips, fmt.Sprintf("Too short — you said %d words, aim for around %d.", spokenWords, expectedWords))
		case ratio < 0.75:
			fluency -= 15
			tips = append(tips, "Slightly short — add one more sentence of detail.")
		case ratio > 2.0:
			fluency -= 15
			tips = append(tips, "Too long — tighten the answer, interviewers value directness.")
		}
	}
	if spokenWords == 0 {
		return localScore{Tips: []string{"Nothing was recorded for this answer."}}
	}

	fillers := 0
	for _, token := range said {
		if fillerWords[token] {
			fillers++
		}
	}
	if fillers*100/spokenWords >= 8 {
		fluency -= 20
		tips = append(tips, "Cut filler words (um, like, basically) — pause instead.")
	} else if fillers >= 3 {
		fluency -= 10
		tips = append(tips, "A few filler words slipped in — a short pause sounds more confident.")
	}

	// Immediate word repetition ("the the", "I I") signals hesitation.
	repeats := 0
	for i := 1; i < len(said); i++ {
		if said[i] == said[i-1] && len(said[i]) > 2 {
			repeats++
		}
	}
	if repeats >= 3 {
		fluency -= 10
		tips = append(tips, "You repeated words while thinking — slow down slightly.")
	}
	fluency = clamp(fluency)

	// --- Grammar: curated high-frequency mistakes ---
	grammar := 100
	joined := " " + strings.Join(said, " ") + " "
	for _, rule := range grammarRules {
		if strings.Contains(joined, " "+rule.pattern+" ") {
			grammar -= 15
			tips = append(tips, rule.tip)
		}
	}
	grammar = clamp(grammar)

	// --- Content tips ---
	if len(missed) > 0 {
		shown := missed
		if len(shown) > 4 {
			shown = shown[:4]
		}
		tips = append(tips, "Missing from your answer: "+strings.Join(shown, ", ")+".")
	}
	if len(tips) == 0 {
		tips = append(tips, "Solid answer — you covered the key points clearly.")
	}
	if len(tips) > 4 {
		tips = tips[:4]
	}

	// Content is what an interviewer actually judges, so it carries the most weight.
	overall := clamp((content*4 + vocabulary*2 + fluency*2 + grammar*2) / 10)

	return localScore{
		Score:      overall,
		Content:    content,
		Vocabulary: vocabulary,
		Fluency:    fluency,
		Grammar:    grammar,
		Covered:    covered,
		Missed:     missed,
		Tips:       tips,
	}
}
