import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Debrief, Job } from '../../core/models/practice.model';
import { PracticeService } from '../../core/services/practice.service';

/** Minimal typing for the browser SpeechRecognition API (not in lib.dom). */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}

@Component({
  selector: 'app-debrief',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">Interview Debrief</h1>
        <p class="text-gray-400 mt-1">
          Just came out of a real interview? Tell what happened — what they asked, how you
          answered, where you froze. The AI turns it into coaching for the next one, and it
          counts toward your DSFR Score.
        </p>
      </header>

      <!-- New debrief -->
      <section class="card mb-8 space-y-5">
        <div>
          <label class="label" for="jobSelect">Which job was it for?</label>
          <select id="jobSelect" class="input" [(ngModel)]="jobId" name="jobId">
            <option value="">Not related to a saved job</option>
            @for (job of jobs(); track job.id) {
              <option [value]="job.id">{{ job.title }}@if (job.company) { — {{ job.company }} }</option>
            }
          </select>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="label mb-0" for="notes">What happened?</label>
            @if (micSupported()) {
              <div class="flex items-center gap-2">
                <select class="bg-surface border border-surface-border rounded-md text-xs px-2 py-1"
                        [(ngModel)]="dictationLang" name="dictationLang">
                  <option value="pt-BR">Ditar em português</option>
                  <option value="en-US">Dictate in English</option>
                </select>
                <button type="button"
                        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        [class]="recording()
                          ? 'bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse'
                          : 'bg-brand text-white hover:bg-brand-hover'"
                        (click)="toggleRecording()">
                  {{ recording() ? '⏹ Stop' : '🎤 Dictate' }}
                </button>
              </div>
            }
          </div>
          <textarea id="notes" rows="10" class="input text-sm leading-relaxed"
                    [(ngModel)]="notes" name="notes"
                    placeholder="Ex: Entrevista de 40 min com o tech lead. Perguntou como escalar um microserviço, falei de cache e réplicas mas travei na parte de Kubernetes. Depois perguntou sobre @Component e @Bean, respondi certo. No final não tinha perguntas preparadas..."></textarea>
          <p class="text-xs text-gray-500 mt-1.5">
            Write or dictate in Portuguese or English — the analysis always comes back in English.
            Minimum 40 characters.
          </p>
        </div>

        @if (error()) { <p class="text-red-400 text-sm">{{ error() }}</p> }

        <button class="btn-primary" (click)="analyze()" [disabled]="analyzing() || notes.trim().length < 40">
          {{ analyzing() ? 'Analyzing…' : '✨ Analyze my interview' }}
        </button>
      </section>

      @if (analyzing()) {
        <div class="card text-center py-16">
          <div class="inline-block h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="font-semibold">Reviewing your interview…</p>
          <p class="text-gray-400 text-sm mt-1">~30 seconds.</p>
        </div>
      }

      <!-- Results -->
      @for (d of debriefs(); track d.id) {
        <section class="card mb-6">
          <div class="flex items-baseline justify-between gap-3 mb-4">
            <div class="flex items-baseline gap-3">
              <span class="text-3xl font-bold">{{ d.score }}</span>
              <span class="text-gray-500">/100</span>
            </div>
            <span class="text-xs text-gray-500">{{ d.created_at | date:'medium' }}</span>
          </div>

          @if (d.analysis.summary) {
            <p class="text-sm text-gray-300 mb-5">{{ d.analysis.summary }}</p>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            @if (d.analysis.went_well?.length) {
              <div>
                <p class="text-xs uppercase tracking-wider text-emerald-400 mb-2">✓ Went well</p>
                <ul class="space-y-1.5">
                  @for (item of d.analysis.went_well; track item) {
                    <li class="text-sm text-gray-300">• {{ item }}</li>
                  }
                </ul>
              </div>
            }
            @if (d.analysis.to_improve?.length) {
              <div>
                <p class="text-xs uppercase tracking-wider text-amber-400 mb-2">↑ To improve</p>
                <ul class="space-y-1.5">
                  @for (item of d.analysis.to_improve; track item) {
                    <li class="text-sm text-gray-300">• {{ item }}</li>
                  }
                </ul>
              </div>
            }
          </div>

          @if (d.analysis.questions?.length) {
            <p class="text-xs uppercase tracking-wider text-gray-500 mb-3">Question by question</p>
            <div class="space-y-3 mb-5">
              @for (q of d.analysis.questions; track q.question) {
                <div class="bg-black/30 rounded-lg p-4">
                  <p class="text-sm font-medium mb-2">{{ q.question }}</p>
                  @if (q.assessment) {
                    <p class="text-xs text-gray-500 mb-2">{{ q.assessment }}</p>
                  }
                  @if (q.better_answer) {
                    <p class="text-xs uppercase tracking-wider text-gray-500 mb-1">Next time, say:</p>
                    <div class="flex items-start justify-between gap-3">
                      <p class="text-sm text-emerald-300/90 leading-relaxed">{{ q.better_answer }}</p>
                      <button class="text-xs text-brand hover:text-brand-hover shrink-0"
                              (click)="speak(q.better_answer)">🔊</button>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (d.analysis.study_next?.length) {
            <p class="text-xs uppercase tracking-wider text-gray-500 mb-2">📚 Study before the next one</p>
            <ul class="space-y-1.5 mb-5">
              @for (item of d.analysis.study_next; track item) {
                <li class="text-sm text-gray-300">• {{ item }}</li>
              }
            </ul>
          }

          @if (d.analysis.follow_up_email) {
            <details class="text-sm">
              <summary class="cursor-pointer text-brand hover:text-brand-hover">✉️ Thank-you email draft</summary>
              <p class="mt-3 text-gray-300 whitespace-pre-line bg-black/30 rounded-lg p-4">{{ d.analysis.follow_up_email }}</p>
            </details>
          }
        </section>
      } @empty {
        @if (!analyzing() && !loading()) {
          <div class="card text-center py-12">
            <p class="text-gray-400 text-sm">
              No debriefs yet. After your next real interview, come here and tell how it went —
              or <a routerLink="/prep" class="text-brand hover:text-brand-hover">build a prep pack</a> first.
            </p>
          </div>
        }
      }
    </div>
  `
})
export class DebriefComponent implements OnInit, OnDestroy {
  private readonly practice = inject(PracticeService);

  readonly jobs = signal<Job[]>([]);
  readonly debriefs = signal<Debrief[]>([]);
  readonly loading = signal(true);
  readonly analyzing = signal(false);
  readonly recording = signal(false);
  readonly micSupported = signal(false);
  readonly error = signal<string | null>(null);

  jobId = '';
  notes = '';
  dictationLang = 'pt-BR';

  private recognition: SpeechRecognitionLike | null = null;

  ngOnInit(): void {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    this.micSupported.set(!!SR);

    forkJoin({
      jobs: this.practice.listJobs().pipe(catchError(() => of([] as Job[]))),
      debriefs: this.practice.listDebriefs().pipe(catchError(() => of([] as Debrief[])))
    }).subscribe(({ jobs, debriefs }) => {
      this.jobs.set(jobs);
      this.debriefs.set(debriefs);
      this.jobId = jobs.find((j) => j.is_active)?.id ?? '';
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    speechSynthesis.cancel();
    this.stopRecognition();
  }

  analyze(): void {
    if (this.notes.trim().length < 40) return;
    this.stopRecognition();
    this.analyzing.set(true);
    this.error.set(null);
    this.practice
      .createDebrief({ notes: this.notes.trim(), ...(this.jobId ? { job_id: this.jobId } : {}) })
      .subscribe({
        next: (d) => {
          this.analyzing.set(false);
          this.debriefs.update((list) => [d, ...list]);
          this.notes = '';
        },
        error: (err) => {
          this.analyzing.set(false);
          const msg: string | undefined = err.error?.error;
          this.error.set(
            err.status === 503
              ? 'AI is not configured. Connect your API key in AI Settings.'
              : msg ?? 'Could not analyze the interview. Please try again.'
          );
        }
      });
  }

  toggleRecording(): void {
    this.recording() ? this.stopRecognition() : this.startRecognition();
  }

  /** Dictation appends to the notes so the user can mix typing and speaking. */
  private startRecognition(): void {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec: SpeechRecognitionLike = new SR();
    rec.lang = this.dictationLang;
    rec.continuous = true;
    rec.interimResults = false;

    const base = this.notes ? this.notes.trimEnd() + ' ' : '';
    let dictated = '';
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) dictated += e.results[i][0].transcript + ' ';
      }
      this.notes = (base + dictated).trim();
    };
    rec.onerror = () => {
      this.recording.set(false);
      this.error.set('Microphone error. Check that the browser has permission to use it.');
    };
    rec.onend = () => this.recording.set(false);

    this.recognition = rec;
    this.error.set(null);
    this.recording.set(true);
    rec.start();
  }

  private stopRecognition(): void {
    this.recognition?.stop();
    this.recognition = null;
    this.recording.set(false);
  }

  speak(text: string): void {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
}
