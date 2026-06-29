import type { JobAnalysis, StudyMonth, SkillScores } from './types'

// Simulates API latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function analyzeJobPosting(text: string): Promise<JobAnalysis> {
  await delay(2000)

  // Detect if it's a backend/fullstack/frontend role
  const isBackend = /backend|node|python|java|go|rust|api|microservice/i.test(text)
  const isFrontend = /frontend|react|vue|angular|css|html|ui|ux/i.test(text)
  const isFullstack = /fullstack|full.stack/i.test(text)

  const jobTitle = isFullstack
    ? 'Full Stack Developer'
    : isBackend
    ? 'Backend Engineer'
    : isFrontend
    ? 'Frontend Developer'
    : 'Software Engineer'

  return {
    title: jobTitle,
    company: 'Tech Company Inc.',
    expectedLevel: 'B2',
    technologies: isBackend
      ? ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS']
      : isFrontend
      ? ['React', 'TypeScript', 'CSS', 'Next.js', 'Figma']
      : ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    softSkills: [
      'Team collaboration',
      'Clear communication',
      'Problem-solving',
      'Adaptability',
      'Self-management',
    ],
    technicalTerms: [
      'Pull request', 'Code review', 'Sprint planning', 'Technical debt',
      'Refactoring', 'CI/CD pipeline', 'Deployment', 'Scalability',
    ],
    commonExpressions: [
      '"Can you elaborate on that?"',
      '"Let me walk you through it"',
      '"That\'s a good point"',
      '"In my experience..."',
      '"We should circle back on this"',
    ],
    keyPhrases: [
      'Strong communication skills required',
      'Work with international teams',
      'Daily standups in English',
      'Async-first culture',
    ],
    profileExpected: `We're looking for a ${jobTitle} who communicates fluently in English, works autonomously in remote/async environments, and actively participates in code reviews, technical discussions and team rituals.`,
  }
}

export async function generateStudyPlan(jobAnalysis: JobAnalysis, currentLevel: string): Promise<StudyMonth[]> {
  await delay(1800)

  return [
    {
      month: 1,
      title: 'Foundations & Tech Vocabulary',
      weeks: [
        { week: 1, topics: ['Greetings & Introductions', 'Self-presentation', 'Tech Vocabulary Basics', 'Daily Standup'], completed: false },
        { week: 2, topics: ['Present Simple & Continuous', 'REST APIs vocabulary', 'Backend terminology', 'Email writing'], completed: false },
        { week: 3, topics: ['Meetings in English', 'Code Review phrases', 'Pull Request vocabulary', 'Giving opinions'], completed: false },
        { week: 4, topics: ['Mock Interview #1', 'Weekly review', 'Pronunciation basics', 'Listening exercises'], completed: false },
      ],
    },
    {
      month: 2,
      title: 'Communication & Tech English',
      weeks: [
        { week: 1, topics: ['Past Simple & Perfect', 'Describing projects', 'Git vocabulary', 'Slack English'], completed: false },
        { week: 2, topics: ['Technical explanations', 'Architecture discussions', 'Asking clarifying questions', 'Agile terminology'], completed: false },
        { week: 3, topics: ['Presenting solutions', 'Debugging conversations', 'System Design basics', 'Conditional sentences'], completed: false },
        { week: 4, topics: ['Mock Interview #2', 'Behavioral questions', 'STAR method', 'Weekly review'], completed: false },
      ],
    },
    {
      month: 3,
      title: 'Fluency & Interview Prep',
      weeks: [
        { week: 1, topics: ['Idiomatic expressions', 'American vs British English', 'Async communication', 'Writing PRDs'], completed: false },
        { week: 2, topics: ['System Design Interview', 'Technical storytelling', 'Negotiating salary', 'Job offers vocabulary'], completed: false },
        { week: 3, topics: ['Advanced speaking', 'Presentation skills', 'Cross-cultural communication', 'Remote work English'], completed: false },
        { week: 4, topics: ['Final Mock Interview', 'Readiness assessment', 'Personal branding', 'Next steps'], completed: false },
      ],
    },
  ]
}

export interface AssessmentQuestion {
  id: string
  type: 'vocabulary' | 'grammar' | 'reading' | 'listening'
  question: string
  options: string[]
  correct: number
  explanation: string
  skill: keyof SkillScores
}

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'v1', type: 'vocabulary', skill: 'vocabulary',
    question: 'What does "deploy" mean in software development?',
    options: ['Write new code', 'Release software to production', 'Delete old files', 'Review code changes'],
    correct: 1,
    explanation: '"Deploy" means to release and make your software available in a production or live environment.',
  },
  {
    id: 'v2', type: 'vocabulary', skill: 'vocabulary',
    question: 'Choose the correct meaning of "asynchronous communication":',
    options: [
      'Talking face-to-face in real time',
      'Communication that doesn\'t require immediate response',
      'A type of database connection',
      'A JavaScript framework',
    ],
    correct: 1,
    explanation: 'Asynchronous communication (like email or Slack) doesn\'t require an immediate response, unlike synchronous (real-time) communication.',
  },
  {
    id: 'g1', type: 'grammar', skill: 'grammar',
    question: 'Complete: "I ___ working on this feature for two days now."',
    options: ['am', 'have been', 'was', 'will be'],
    correct: 1,
    explanation: 'Use Present Perfect Continuous ("have been + -ing") for actions that started in the past and continue to the present.',
  },
  {
    id: 'g2', type: 'grammar', skill: 'grammar',
    question: 'Which sentence is grammatically correct?',
    options: [
      'The team are working on the bug since yesterday.',
      'The team has been working on the bug since yesterday.',
      'The team working on the bug since yesterday.',
      'The team was working on the bug since tomorrow.',
    ],
    correct: 1,
    explanation: 'Present Perfect Continuous is used with "since" to show an action that started in the past and continues.',
  },
  {
    id: 'r1', type: 'reading', skill: 'reading',
    question: 'Read: "Our CI/CD pipeline ensures that every commit triggers automated tests before merging to main." What is the main purpose of this pipeline?',
    options: [
      'To write new features faster',
      'To automatically test code before merging',
      'To delete old branches',
      'To manage team meetings',
    ],
    correct: 1,
    explanation: 'The text clearly states the pipeline ensures automated tests run before merging — this is the core purpose of CI/CD.',
  },
  {
    id: 'r2', type: 'reading', skill: 'reading',
    question: 'Read: "We work in two-week sprints. During sprint planning, the team estimates story points and commits to deliverables." What happens during sprint planning?',
    options: [
      'The team writes code',
      'The team reviews completed work',
      'The team estimates and commits to tasks',
      'The team meets with clients',
    ],
    correct: 2,
    explanation: 'The text explicitly describes sprint planning as when the team estimates story points and commits to deliverables.',
  },
  {
    id: 'l1', type: 'listening', skill: 'listening',
    question: 'You hear: "Can you walk me through your approach to this problem?" What is the speaker asking?',
    options: [
      'To go for a walk',
      'To explain step-by-step how you solved it',
      'To write code quickly',
      'To review someone else\'s solution',
    ],
    correct: 1,
    explanation: '"Walk me through" is a common expression meaning "explain in detail, step by step."',
  },
  {
    id: 'l2', type: 'listening', skill: 'listening',
    question: 'In a standup, you hear: "I\'m blocked on the authentication service — waiting for the backend team." What does "blocked" mean?',
    options: [
      'Making great progress',
      'Unable to continue due to a dependency or obstacle',
      'Working independently',
      'Finished with the task',
    ],
    correct: 1,
    explanation: '"Blocked" in Agile means you cannot proceed with your task because of an external dependency or obstacle.',
  },
  {
    id: 's1', type: 'vocabulary', skill: 'speaking',
    question: 'You need to disagree politely in a meeting. Which phrase is most professional?',
    options: [
      '"No, that\'s wrong."',
      '"I see your point, but have we considered..."',
      '"That doesn\'t make sense."',
      '"You\'re making a mistake."',
    ],
    correct: 1,
    explanation: '"I see your point, but..." is a polite, professional way to disagree that acknowledges the other person\'s view.',
  },
  {
    id: 's2', type: 'vocabulary', skill: 'speaking',
    question: 'In a code review, how would you professionally suggest a change?',
    options: [
      '"This code is bad, rewrite it."',
      '"Consider using a map here — it might improve readability."',
      '"Wrong approach, use something else."',
      '"I don\'t like this."',
    ],
    correct: 1,
    explanation: 'Professional code review feedback suggests improvements constructively, explaining the why behind the suggestion.',
  },
]

export interface ConversationMessage {
  role: 'ai' | 'user'
  content: string
  corrections?: string
  pronunciation?: {
    score: number
    fluency: number
    confidence: number
    accent: string
  }
}

export async function getAIResponse(userMessage: string, context: string): Promise<ConversationMessage> {
  await delay(1200)

  const responses: Record<string, string> = {
    default: "That's a great point! Let me help you practice this expression. In professional English, we often say things more directly but politely. Could you try rephrasing that with 'I think' or 'In my experience'?",
    standup: "Good standup update! In a real daily standup, keep it concise: what you did, what you're doing, any blockers. Try using: 'Yesterday I worked on X, today I'll be focusing on Y, and I'm currently blocked on Z.'",
    interview: "Excellent response! You structured it well. Remember the STAR method: Situation, Task, Action, Result. You covered the Action clearly — make sure to emphasize the Result and its business impact.",
    grammar: "I noticed a small grammar point: use Present Perfect here ('I have completed') instead of Simple Past, because you're talking about a result that's still relevant now.",
  }

  const isStandup = /standup|yesterday|today|blocked/i.test(userMessage)
  const isInterview = /tell me|strength|weakness|project|challenge/i.test(userMessage)
  const isGrammar = /\bwas\b|\bdid\b|\bwere\b/i.test(userMessage)

  const responseText = isStandup ? responses.standup : isInterview ? responses.interview : isGrammar ? responses.grammar : responses.default

  return {
    role: 'ai',
    content: responseText,
    corrections: userMessage.length > 10 ? generateCorrection(userMessage) : undefined,
    pronunciation: {
      score: 65 + Math.floor(Math.random() * 30),
      fluency: 60 + Math.floor(Math.random() * 35),
      confidence: 55 + Math.floor(Math.random() * 40),
      accent: 'Brazilian Portuguese influence detected',
    },
  }
}

function generateCorrection(text: string): string {
  // Simple mock corrections
  const corrections: Record<string, string> = {
    'I am working since': 'I have been working since',
    'I work here since': 'I have been working here since',
    'yesterday I did': 'yesterday I worked on',
    'I am agree': 'I agree',
    'more better': 'better',
    'very much important': 'very important',
  }

  for (const [wrong, right] of Object.entries(corrections)) {
    if (text.toLowerCase().includes(wrong.toLowerCase())) {
      return `💡 Consider: "${text.replace(new RegExp(wrong, 'i'), right)}"\n\nExplanation: Use Present Perfect instead of Simple Past when the action is connected to the present.`
    }
  }

  return `✅ Good English! A more natural phrasing could be: "${text.replace(/\.$/, '')} — which is something native speakers often say in professional contexts."`
}

export interface InterviewQuestion {
  question: string
  type: 'behavioral' | 'technical' | 'cultural'
  hint: string
}

export const interviewQuestions: InterviewQuestion[] = [
  { question: "Tell me about yourself and your background as a developer.", type: 'behavioral', hint: 'Keep it 2 minutes. Cover your stack, experience, and why you\'re excited about this role.' },
  { question: "What are your greatest technical strengths?", type: 'behavioral', hint: 'Name 2-3 specific skills with concrete examples.' },
  { question: "Describe a time you faced a difficult technical challenge. How did you solve it?", type: 'behavioral', hint: 'Use STAR: Situation, Task, Action, Result.' },
  { question: "How do you handle code reviews — both giving and receiving feedback?", type: 'technical', hint: 'Show you value collaboration. Mention specific techniques.' },
  { question: "How do you communicate technical decisions to non-technical stakeholders?", type: 'cultural', hint: 'Show your ability to simplify complex topics.' },
  { question: "What does your ideal remote work setup look like?", type: 'cultural', hint: 'Mention async communication, time zones, documentation.' },
  { question: "Where do you see yourself in 3 years?", type: 'behavioral', hint: 'Align your growth with the company\'s trajectory.' },
]

export async function evaluateInterviewAnswer(question: string, answer: string): Promise<{
  score: number
  strengths: string[]
  improvements: string[]
  betterPhrase: string
}> {
  await delay(1500)

  const wordCount = answer.split(' ').length
  const hasSTAR = /situation|task|action|result|when|then|so|outcome/i.test(answer)
  const hasConcrete = /\d+|percent|team|project|implemented|built|improved/i.test(answer)

  const score = Math.min(95, 40 + (wordCount > 30 ? 20 : 0) + (hasSTAR ? 20 : 0) + (hasConcrete ? 15 : 0))

  return {
    score,
    strengths: [
      wordCount > 50 ? 'Good answer length — detailed and substantive' : 'Clear and concise',
      hasConcrete ? 'Used concrete examples and metrics' : 'Showed relevant experience',
      'Professional vocabulary used throughout',
    ].filter(Boolean),
    improvements: [
      !hasSTAR ? 'Structure with STAR method (Situation, Task, Action, Result)' : null,
      !hasConcrete ? 'Add specific metrics or outcomes (e.g., "reduced load time by 40%")' : null,
      wordCount < 30 ? 'Expand your answer with more context and detail' : null,
      'Practice transitional phrases: "What happened next was...", "As a result..."',
    ].filter(Boolean) as string[],
    betterPhrase: `"${answer.slice(0, 60)}..." — Consider starting with: "In my previous role at [Company], I was tasked with... The situation required me to... I then took the following steps... As a result..."`,
  }
}

export async function generateRecommendations(weakSkill: keyof SkillScores): Promise<{
  videos: string[]
  podcasts: string[]
  articles: string[]
  exercises: string[]
}> {
  await delay(800)

  const recs = {
    listening: {
      videos: ['TED: How to speak so people want to listen', 'English for Tech Professionals - YouTube', 'Daily English Conversations - EnglishPod'],
      podcasts: ['Command Line Heroes', 'The Changelog', 'Soft Skills Engineering'],
      articles: ['BBC Learning English - Tech Edition', 'Listening exercises for professionals - British Council'],
      exercises: ['Shadow a TED talk (repeat what you hear)', 'Watch a coding tutorial without subtitles', 'Transcribe 2 minutes of a podcast'],
    },
    speaking: {
      videos: ['Pronunciation with Rachel\'s English', 'Business English Pod - Meetings', 'TED-Ed: The art of public speaking'],
      podcasts: ['All Ears English', '6 Minute English - BBC', 'Speak Up - ESL Podcast'],
      articles: ['How to sound confident in English meetings', 'Phrases for code reviews in English'],
      exercises: ['Record yourself answering interview questions', 'Join English-speaking Discord communities', 'Do a 5-minute daily standup in English'],
    },
    grammar: {
      videos: ['English Grammar Boot Camp - YouTube', 'Grammar Girl Quick Tips', 'Perfect English Grammar - YouTube'],
      podcasts: ['Grammar Girl Podcast', 'A Way with Words', 'Lexicon Valley'],
      articles: ['British Council Grammar Guide', 'Grammarly Blog - Business Writing', 'Common Grammar Mistakes in Tech Writing'],
      exercises: ['Write a daily journal entry in English', 'Summarize a GitHub PR in English', 'Translate Slack messages to perfect English'],
    },
    vocabulary: {
      videos: ['Tech English with Cari - YouTube', 'English Vocabulary for Developers', 'Agile/Scrum English Vocabulary'],
      podcasts: ['Vocabulary.com Daily Challenge', 'Word of the Day - Merriam-Webster', 'Tech in Plain English'],
      articles: ['Glossary of Software Development Terms', '50 Essential English Phrases for Developers', 'Remote Work Vocabulary Guide'],
      exercises: ['Build a personal Anki flashcard deck', 'Read 2 tech articles in English daily', 'Write comments in your code in English'],
    },
    reading: {
      videos: ['Speed Reading for Professionals', 'How to read documentation effectively', 'Skimming and Scanning techniques'],
      podcasts: ['The Reading Brain', 'Books on Dev', 'Hacker News Recap'],
      articles: ['Read Hacker News daily', 'Follow dev.to in English', 'Stripe/Vercel engineering blogs'],
      exercises: ['Read one GitHub README per day', 'Summarize a Medium article in 3 sentences', 'Read pull request descriptions on open-source projects'],
    },
  }

  return recs[weakSkill] || recs.vocabulary
}
