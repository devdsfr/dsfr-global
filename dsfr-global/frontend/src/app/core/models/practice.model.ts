export interface Resume {
  headline: string;
  raw_text: string;
  updated_at?: string;
}

export interface Job {
  title: string;
  seniority: string;
  stack: string;
  raw_text: string;
  updated_at?: string;
}

export interface InterviewTurn {
  interviewer: string;
  answer: string;
}

export interface Interview {
  id: string;
  level: string;
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
