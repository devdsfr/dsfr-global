import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-interviews',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">DSFR Interview</h1>
        <p class="text-gray-400 mt-1">
          Simulated interviews — HR, Tech Lead, Pair Programming, Architecture, Client and
          Daily Scrum — with feedback and a grade after each session.
        </p>
      </header>

      <section class="card">
        <h2 class="font-semibold mb-2">Coming soon</h2>
        <p class="text-gray-400 text-sm">
          Mock interviews aren't available yet. Back to the
          <a routerLink="/dashboard" class="text-brand hover:text-brand-hover">Dashboard</a>
          for now.
        </p>
      </section>
    </div>
  `
})
export class InterviewsComponent {}
