import { Component, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

interface ScoreCard {
  label: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">
          Welcome{{ userName() ? ', ' + userName() : '' }} 👋
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
          Upload your résumé and paste a job posting to unlock your first GAP Analysis —
          we will tell you exactly how compatible you are with the role.
        </p>
      </section>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly userName = signal('');

  /** Placeholder DSFR Score until the Score AI module lands. */
  readonly scores: ScoreCard[] = [
    { label: 'Overall Readiness', value: 0 },
    { label: 'Interview', value: 0 },
    { label: 'Speaking', value: 0 },
    { label: 'Technical Communication', value: 0 }
  ];

  ngOnInit(): void {
    this.auth.loadMe().subscribe({
      next: (u) => this.userName.set(u.name.split(' ')[0]),
      error: () => void 0
    });
  }
}
