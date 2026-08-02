export interface Resume {
  headline: string;
  raw_text: string;
  updated_at?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  seniority: string;
  stack: string;
  raw_text: string;
  is_active: boolean;
  updated_at?: string;
}

export type JobInput = Omit<Job, 'id' | 'is_active' | 'updated_at'>;

export interface InterviewTurn {
  interviewer: string;
  answer: string;
  /** Topic id from the catalogue. Absent on scripts generated before topics existed. */
  topic?: string;
  /** Grading rubric for the answer — never shown to the candidate. */
  expected_points?: string[];
}

/** One subject a practice question can target. Served by GET /interview/topics. */
export interface Topic {
  id: string;
  label: string;
  description: string;
}

/** What the generated script should optimise for. */
export type InterviewFocus = 'language' | 'technical' | 'mixed';

/** Aggregated performance for one topic across the practice history. */
export interface TopicScore {
  topic: string;
  label: string;
  answers: number;
  average_score: number;
  average_content: number;
}

export interface Interview {
  id: string;
  level: string;
  job_id?: string;
  turns: InterviewTurn[];
  created_at: string;
}

export interface AISettings {
  provider: string;
  model: string;
  has_key: boolean;
  masked_key: string;
  server_default: boolean;
}

export interface Evaluation {
  score: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  /** 0-100 on the turn's rubric. 0 with empty covered/missed = language-only feedback. */
  content: number;
  topic: string;
  covered: string[];
  missed: string[];
  tips: string[];
  improved: string;
}

export interface Scores {
  overall_readiness: number;
  interview: number;
  speaking: number;
  technical_communication: number;
  answers_practiced: number;
  real_interviews: number;
}

export interface PrepQuestion {
  question: string;
  why: string;
  model_answer: string;
}

export interface WeakPoint {
  gap: string;
  how_to_address: string;
}

export interface PrepContent {
  opening_pitch: string;
  likely_questions: PrepQuestion[];
  questions_to_ask: string[];
  weak_points: WeakPoint[];
}

export interface PrepPack {
  id: string;
  job_id: string;
  content: PrepContent;
  created_at: string;
}

export interface DebriefQuestion {
  question: string;
  your_answer: string;
  assessment: string;
  better_answer: string;
}

export interface DebriefContent {
  score: number;
  summary: string;
  went_well: string[];
  to_improve: string[];
  questions: DebriefQuestion[];
  study_next: string[];
  follow_up_email: string;
}

export interface Debrief {
  id: string;
  job_id: string;
  notes: string;
  score: number;
  analysis: DebriefContent;
  created_at: string;
}
