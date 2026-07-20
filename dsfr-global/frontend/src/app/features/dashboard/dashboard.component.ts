import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Job, Scores } from '../../core/models/practice.model';
import { AuthService } from '../../core/services/auth.service';
import { PracticeService } from '../../core/services/practice.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold h-9 flex items-center">
          @if (userName(); as name) {
            Welcome, {{ name }} 👋
          } @else {
            <span class="inline-block h-6 w-48 bg-surface-border/60 rounded animate-pulse"></span>
          }
        </h1>
        <p class="text-gray-400 mt-1">Here is your readiness for an international role today.</p>
      </header>

      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        @for (card of cards(); track card.label) {
          <div class="card">
            <p class="text-sm text-gray-400">{{ card.label }}</p>
            <p class="text-3xl font-bold mt-2">{{ card.value }}<span class="text-base text-gray-500">/100</span></p>
            <div class="h-1.5 bg-surface-border rounded-full mt-3 overflow-hidden">
              <div class="h-full bg-brand rounded-full transition-all duration-700" [style.width.%]="card.value"></div>
            </div>
          </div>
        }
      </section>

      @if (scores(); as s) {
        @if (s.answers_practiced === 0) {
          <section class="card mb-8">
            <h2 class="font-semibold mb-2">Next mission</h2>
            <p class="text-gray-400 text-sm">
              Your scores are still at zero because you haven't practiced yet. Register your
              <a routerLink="/resume" class="text-brand hover:text-brand-hover">résumé</a>, add a
              <a routerLink="/job" class="text-brand hover:text-brand-hover">target job</a>, then
              <a routerLink="/interviews" class="text-brand hover:text-brand-hover">record your first interview answer</a> —
              the AI scores what you say and these cards start filling up.
            </p>
          </section>
        } @else {
          <section class="card mb-8">
            <h2 class="font-semibold mb-2">Keep going</h2>
            <p class="text-gray-400 text-sm">
              Based on your last {{ s.answers_practiced }} scored
              {{ s.answers_practiced === 1 ? 'answer' : 'answers' }}.
              <a routerLink="/interviews" class="text-brand hover:text-brand-hover">Practice again</a>
              to raise your score — fluency grows with repetition.
            </p>
          </section>
        }
      }

      <section class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">Target jobs</h2>
          <a routerLink="/job" class="text-sm text-brand hover:text-brand-hover">Manage →</a>
        </div>
        @if (jobs().length === 0) {
          <p class="text-gray-400 text-sm">No target jobs yet. Add the openings you're preparing for.</p>
        } @else {
          <ul class="space-y-2">
            @for (job of jobs(); track job.id) {
              <li class="flex items-center justify-between text-sm">
                <span>
                  {{ job.title }}
                  @if (job.company) { <span class="text-gray-500">· {{ job.company }}</span> }
                </span>
                @if (job.is_active) {
                  <span class="text-xs px-2 py-0.5 rounded-full bg-brand/20 text-brand">Active</span>
                }
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly practice = inject(PracticeService);

  readonly scores = signal<Scores | null>(null);
  readonly jobs = signal<Job[]>([]);

  /**
   * Derived from AuthService's reactive `user` signal instead of a locally
   * fetched, one-shot value — no race condition between login and render.
   */
  readonly userName = computed(() => this.auth.user()?.name?.split(' ')[0] ?? null);

  /** DSFR Score, computed by the backend from real AI evaluations. */
  readonly cards = computed(() => {
    const s = this.scores();
    return [
      { label: 'Overall Readiness', value: s?.overall_readiness ?? 0 },
      { label: 'Interview', value: s?.interview ?? 0 },
      { label: 'Speaking', value: s?.speaking ?? 0 },
      { label: 'Technical Communication', value: s?.technical_communication ?? 0 }
    ];
  });

  ngOnInit(): void {
    if (!this.auth.user()) {
      this.auth.loadMe().subscribe({ error: () => void 0 });
    }
    forkJoin({
      scores: this.practice.getScores().pipe(catchError(() => of(null))),
      jobs: this.practice.listJobs().pipe(catchError(() => of([] as Job[])))
    }).subscribe(({ scores, jobs }) => {
      this.scores.set(scores);
      this.jobs.set(jobs);
    });
  }
}
