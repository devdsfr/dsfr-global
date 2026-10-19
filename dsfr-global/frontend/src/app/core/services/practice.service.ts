import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AISettings, Debrief, Evaluation, Interview, InterviewFocus, Job, JobInput, MatchAnalysis, PracticeSession, PrepPack, Resume, Scores, SessionScore, Tailoring, Topic, TopicScore } from '../models/practice.model';

/** Resume, target job and AI interview scripts. */
@Injectable({ providedIn: 'root' })
export class PracticeService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getResume(): Observable<Resume> {
    return this.http.get<Resume>(`${this.api}/resume`);
  }

  saveResume(resume: Resume): Observable<Resume> {
    return this.http.put<Resume>(`${this.api}/resume`, resume);
  }

  listJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.api}/jobs`);
  }

  createJob(job: JobInput): Observable<Job> {
    return this.http.post<Job>(`${this.api}/jobs`, job);
  }

  updateJob(id: string, job: JobInput): Observable<Job> {
    return this.http.put<Job>(`${this.api}/jobs/${id}`, job);
  }

  deleteJob(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/jobs/${id}`);
  }

  activateJob(id: string): Observable<void> {
    return this.http.post<void>(`${this.api}/jobs/${id}/activate`, {});
  }

  getScores(): Observable<Scores> {
    return this.http.get<Scores>(`${this.api}/scores`);
  }

  /** Catalogue of practice topics. Served by the API so ids never drift from the prompts. */
  listTopics(): Observable<Topic[]> {
    return this.http.get<Topic[]>(`${this.api}/interview/topics`);
  }

  /** Per-topic averages across the user's evaluated answers. */
  getTopicBreakdown(): Observable<TopicScore[]> {
    return this.http.get<TopicScore[]>(`${this.api}/scores/topics`);
  }

  evaluateAnswer(payload: { interview_id: string; turn_index: number; transcript: string }): Observable<Evaluation> {
    return this.http.post<Evaluation>(`${this.api}/interview/evaluate`, payload);
  }

  /** Grades a whole session at once, so nothing interrupts the interview. */
  scoreSession(payload: {
    interview_id: string;
    answers: { turn_index: number; transcript: string }[];
  }): Observable<SessionScore> {
    return this.http.post<SessionScore>(`${this.api}/interview/score-session`, payload);
  }

  listSessions(): Observable<PracticeSession[]> {
    return this.http.get<PracticeSession[]>(`${this.api}/sessions`);
  }

  /** Turns a job screenshot or a resume PDF/DOCX into editable text. */
  extractDocument(kind: 'job' | 'resume', mimeType: string, base64: string): Observable<{ text: string }> {
    return this.http.post<{ text: string }>(`${this.api}/tailor/extract`, {
      kind,
      mime_type: mimeType,
      data: base64
    });
  }

  analyzeMatch(jobText: string, resumeText: string): Observable<MatchAnalysis> {
    return this.http.post<MatchAnalysis>(`${this.api}/tailor/analyze`, {
      job_text: jobText,
      resume_text: resumeText
    });
  }

  tailorResume(payload: {
    job_title: string;
    job_text: string;
    resume_text: string;
    confirmations: { requirement: string; note: string }[];
    before: MatchAnalysis | null;
  }): Observable<Tailoring> {
    return this.http.post<Tailoring>(`${this.api}/tailor`, payload);
  }

  listTailorings(): Observable<Tailoring[]> {
    return this.http.get<Tailoring[]>(`${this.api}/tailor`);
  }

  getPrepPack(jobId: string): Observable<PrepPack> {
    return this.http.get<PrepPack>(`${this.api}/prep/${jobId}`);
  }

  generatePrepPack(jobId: string): Observable<PrepPack> {
    return this.http.post<PrepPack>(`${this.api}/prep/generate`, { job_id: jobId });
  }

  listDebriefs(): Observable<Debrief[]> {
    return this.http.get<Debrief[]>(`${this.api}/debrief`);
  }

  createDebrief(payload: { job_id?: string; notes: string }): Observable<Debrief> {
    return this.http.post<Debrief>(`${this.api}/debrief`, payload);
  }

  latestInterview(): Observable<Interview> {
    return this.http.get<Interview>(`${this.api}/interview/latest`);
  }

  generateInterview(
    level: string,
    jobId?: string,
    topics: string[] = [],
    focus: InterviewFocus = 'mixed'
  ): Observable<Interview> {
    return this.http.post<Interview>(`${this.api}/interview/generate`, {
      level,
      focus,
      ...(jobId ? { job_id: jobId } : {}),
      ...(topics.length ? { topics } : {})
    });
  }

  getAISettings(): Observable<AISettings> {
    return this.http.get<AISettings>(`${this.api}/ai-settings`);
  }

  saveAISettings(payload: { provider: string; api_key: string; model: string }): Observable<AISettings> {
    return this.http.put<AISettings>(`${this.api}/ai-settings`, payload);
  }
}
