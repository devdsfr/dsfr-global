import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Job, PrepPack } from '../../core/models/practice.model';
import { PracticeService } from '../../core/services/practice.service';

@Component({
  selector: 'app-prep',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">Interview Prep Pack</h1>
        <p class="text-gray-400 mt-1">
          A personalized study dossier for a real interview: the questions most likely to come up,
          strong answers built from your résumé, questions to ask back, and how to handle your weak spots.
          Study it so the answers are yours.
        </p>
      </header>

      @if (loading()) {
        <div class="card h-32 animate-pulse"></div>
      } @else if (jobs().length === 0) {
        <div class="card text-center py-14">
          <p class="text-4xl mb-3">🎯</p>
          <p class="font-semibold mb-1">Add a target job first</p>
          <p class="text-gray-400 text-sm mb-6">The prep pack is built from a specific job + your résumé.</p>
          <a routerLink="/job" class="btn-primary inline-block">Add a target job</a>
        </div>
      } @else {
        <div class="card mb-6">
          <label class="label" for="jobSelect">Prepare for</label>
          <div class="flex flex-col sm:flex-row gap-3">
            <select id="jobSelect" class="input flex-1" [value]="selectedJobId()"
                    (change)="onJobChange($any($event.target).value)">
              @for (job of jobs(); track job.id) {
                <option [value]="job.id">{{ job.title }}@if (job.company) { — {{ job.company }} }</option>
              }
            </select>
            <button class="btn-primary shrink-0" (click)="generate()" [disabled]="generating()">
              {{ generating() ? 'Building…' : (pack() ? '↻ Regenerate' : '✨ Build prep pack') }}
            </button>
          </div>
          @if (error()) { <p class="text-red-400 text-sm mt-3">{{ error() }}</p> }
        </div>

        @if (generating()) {
          <div class="card text-center py-16">
            <div class="inline-block h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="font-semibold">Building your prep pack…</p>
            <p class="text-gray-400 text-sm mt-1">Analyzing the job against your résumé. ~30 seconds.</p>
          </div>
        } @else if (pack()) {
          @if (pack(); as p) {
          <!-- Opening pitch -->
          @if (p.content.opening_pitch) {
            <section class="card mb-6 border-l-4 border-l-brand">
              <div class="flex items-center justify-between mb-2">
                <h2 class="font-semibold">🗣 Your opening pitch</h2>
                <button class="text-sm text-brand hover:text-brand-hover" (click)="speak(p.content.opening_pitch)">🔊 Listen</button>
              </div>
              <p class="text-sm text-gray-200 leading-relaxed">{{ p.content.opening_pitch }}</p>
            </section>
          }

          <!-- Likely questions -->
          <section class="mb-6">
            <h2 class="font-semibold mb-3">❓ Likely questions ({{ p.content.likely_questions.length }})</h2>
            <div class="space-y-3">
              @for (q of p.content.likely_questions; track q.question; let i = $index) {
                <div class="card">
                  <button class="w-full text-left flex items-start justify-between gap-3" (click)="toggle(i)">
                    <span class="font-medium">{{ i + 1 }}. {{ q.question }}</span>
                    <span class="text-gray-500 shrink-0">{{ open().has(i) ? '−' : '+' }}</span>
                  </button>
                  @if (open().has(i)) {
                    @if (q.why) { <p class="text-xs text-gray-500 mt-2">Why: {{ q.why }}</p> }
                    <div class="mt-3 flex items-start justify-between gap-3">
                      <p class="text-sm text-emerald-300/90 leading-relaxed">{{ q.model_answer }}</p>
                      <button class="text-xs text-brand hover:text-brand-hover shrink-0" (click)="speak(q.model_answer)">🔊</button>
                    </div>
                  }
                </div>
              }
            </div>
          </section>

          <!-- Questions to ask -->
          @if (p.content.questions_to_ask.length) {
            <section class="card mb-6">
              <h2 class="font-semibold mb-3">🙋 Smart questions to ask them</h2>
              <ul class="space-y-2">
                @for (q of p.content.questions_to_ask; track q) {
                  <li class="text-sm text-gray-300">• {{ q }}</li>
                }
              </ul>
            </section>
          }

          <!-- Weak points -->
          @if (p.content.weak_points.length) {
            <section class="card border-l-4 border-l-amber-500">
              <h2 class="font-semibold mb-3">⚠️ Your weak spots (and how to handle them)</h2>
              <div class="space-y-4">
                @for (w of p.content.weak_points; track w.gap) {
                  <div>
                    <p class="text-sm font-medium text-amber-300/90">{{ w.gap }}</p>
                    <p class="text-sm text-gray-400 mt-1">{{ w.how_to_address }}</p>
                  </div>
                }
              </div>
            </section>
          }
          }
        } @else {
          <div class="card text-center py-12">
            <p class="text-gray-400 text-sm">No prep pack for this job yet. Build one to start studying.</p>
          </div>
        }
      }
    </div>
  `
})
export class PrepComponent implements OnInit {
  private readonly practice = inject(PracticeService);

  readonly jobs = signal<Job[]>([]);
  readonly selectedJobId = signal<string>('');
  readonly pack = signal<PrepPack | null>(null);
  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly error = signal<string | null>(null);
  readonly open = signal<Set<number>>(new Set());

  ngOnInit(): void {
    this.practice.listJobs().pipe(catchError(() => of([] as Job[]))).subscribe((jobs) => {
      this.jobs.set(jobs);
      this.loading.set(false);
      const active = jobs.find((j) => j.is_active) ?? jobs[0];
      if (active) {
        this.selectedJobId.set(active.id);
        this.loadPack(active.id);
      }
    });
  }

  onJobChange(id: string): void {
    this.selectedJobId.set(id);
    this.pack.set(null);
    this.open.set(new Set());
    this.loadPack(id);
  }

  private loadPack(jobId: string): void {
    this.practice.getPrepPack(jobId).pipe(catchError(() => of(null))).subscribe((p) => this.pack.set(p));
  }

  generate(): void {
    const jobId = this.selectedJobId();
    if (!jobId) return;
    this.generating.set(true);
    this.error.set(null);
    this.open.set(new Set());
    this.practice.generatePrepPack(jobId).subscribe({
      next: (p) => {
        this.generating.set(false);
        this.pack.set(p);
      },
      error: (err) => {
        this.generating.set(false);
        const msg: string | undefined = err.error?.error;
        if (err.status === 503) {
          this.error.set('AI is not configured. Connect your API key in AI Settings.');
        } else {
          this.error.set(msg ?? 'Could not build the prep pack. Please try again.');
        }
      }
    });
  }

  toggle(i: number): void {
    this.open.update((s) => {
      const next = new Set(s);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
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
