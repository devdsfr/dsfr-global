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
  tips: string[];
  improved: string;
}

export interface Scores {
  overall_readiness: number;
  interview: number;
  speaking: number;
  technical_communication: number;
  answers_practiced: number;
}
