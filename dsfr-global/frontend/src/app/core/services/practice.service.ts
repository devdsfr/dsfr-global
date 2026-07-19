import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AISettings, Interview, Job, Resume } from '../models/practice.model';

/** Résumé, target job and AI interview scripts. */
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

  getJob(): Observable<Job> {
    return this.http.get<Job>(`${this.api}/job`);
  }

  saveJob(job: Job): Observable<Job> {
    return this.http.put<Job>(`${this.api}/job`, job);
  }

  latestInterview(): Observable<Interview> {
    return this.http.get<Interview>(`${this.api}/interview/latest`);
  }

  generateInterview(level: string): Observable<Interview> {
    return this.http.post<Interview>(`${this.api}/interview/generate`, { level });
  }

  getAISettings(): Observable<AISettings> {
    return this.http.get<AISettings>(`${this.api}/ai-settings`);
  }

  saveAISettings(payload: { provider: string; api_key: string; model: string }): Observable<AISettings> {
    return this.http.put<AISettings>(`${this.api}/ai-settings`, payload);
  }
}
