import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

interface ScoreCard {
  label: string;
  value: number;
}

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
        <p class="text-gray-400 mt-1">
          Here is your readiness for an international role today.
        </p>
      </header>

      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        @for (card of scores; track card.label) {
          <div class="card">
            <p class="text-sm text-gray-400">{{ card.label }}</p>
            <p class="text-3xl font-bold mt-2">{{ card.value }}<span class="text-base text-gray-500">/100</span></p>
            <div class="h-1.5 bg-surface-border rounded-full mt-3 overflow-hidden">
              <div class="h-full bg-brand rounded-full" [style.width.%]="card.value"></div>
            </div>
          </div>
        }
      </section>

      <section class="card">
        <h2 class="font-semibold mb-2">Next mission</h2>
        <p class="text-gray-400 text-sm">
          Register your <a routerLink="/resume" class="text-brand hover:text-brand-hover">résumé</a>
          and your <a routerLink="/job" class="text-brand hover:text-brand-hover">target job</a>,
          then start your first
          <a routerLink="/interviews" class="text-brand hover:text-brand-hover">interview practice</a> —
          the interviewer speaks, the teleprompter shows what to answer.
        </p>
      </section>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);

  /**
   * Derived from AuthService's reactive `user` signal instead of a locally
   * fetched, one-shot value. This removes the earlier race condition: right
   * after login the signal is already populated (no flash of "Welcome 👋"
   * without a name), and on a full page reload the template automatically
   * re-renders once loadMe() resolves — no separate local state to fall out
   * of sync with the service.
   */
  readonly userName = computed(() => this.auth.user()?.name?.split(' ')[0] ?? null);

  /** Placeholder DSFR Score until the Score AI module lands. */
  readonly scores: ScoreCard[] = [
    { label: 'Overall Readiness', value: 0 },
    { label: 'Interview', value: 0 },
    { label: 'Speaking', value: 0 },
    { label: 'Technical Communication', value: 0 }
  ];

  ngOnInit(): void {
    // Skip the network round-trip if we already have the user (e.g. just
    // logged in during this session); fetch it on a cold load (page reload).
    if (!this.auth.user()) {
      this.auth.loadMe().subscribe({ error: () => void 0 });
    }
  }
}
