package career

// Topic is a technical subject a practice question can target. The catalogue
// lives in the domain so the API, the prompts and the frontend all agree on the
// same ids — a topic string that reaches the database is always one of these.
type Topic struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

// Topics is the canonical catalogue. Ids are stable and stored on evaluations,
// so rename Label freely but never an ID.
var Topics = []Topic{
	{"behavioral", "Behavioral", "Conflict, failure, leadership — questions that want a story, not theory."},
	{"architecture", "Architecture", "Monolith vs services, layering, scaling trade-offs."},
	{"apis", "APIs & REST", "Endpoint design, versioning, idempotency, contracts."},
	{"data", "Data & Persistence", "Modelling, queries, transactions, ORM pitfalls."},
	{"testing", "Testing", "Test pyramid, mocks, TDD, coverage that means something."},
	{"performance", "Performance", "Profiling, caching, concurrency, I/O bottlenecks."},
	{"design", "Design & Patterns", "SOLID, design patterns, when abstraction stops paying off."},
	{"cloud", "Cloud & DevOps", "Deploys, CI/CD, observability, infrastructure cost."},
	{"security", "Security", "AuthN/AuthZ, secret handling, common vulnerabilities."},
	{"system-design", "System Design", "Open-ended design of a system under real constraints."},
}

// topicIndex allows O(1) validation without exposing a mutable map.
var topicIndex = func() map[string]Topic {
	m := make(map[string]Topic, len(Topics))
	for _, t := range Topics {
		m[t.ID] = t
	}
	return m
}()

// ValidTopic reports whether id belongs to the catalogue.
func ValidTopic(id string) bool {
	_, ok := topicIndex[id]
	return ok
}

// TopicLabel returns the human label, falling back to the id when unknown so
// older rows written before a catalogue change still render.
func TopicLabel(id string) string {
	if t, ok := topicIndex[id]; ok {
		return t.Label
	}
	return id
}

// FilterTopics keeps only ids present in the catalogue, preserving order and
// dropping duplicates. An empty result means "no preference".
func FilterTopics(ids []string) []string {
	seen := make(map[string]bool, len(ids))
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if ValidTopic(id) && !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// TopicScore is the aggregated performance for one topic, used to tell the
// candidate where to keep drilling.
type TopicScore struct {
	Topic        string `json:"topic"`
	Label        string `json:"label"`
	Answers      int    `json:"answers"`
	AverageScore int    `json:"average_score"`
	AverageContent int  `json:"average_content"`
}
