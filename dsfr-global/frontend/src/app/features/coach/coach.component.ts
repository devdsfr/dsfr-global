import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-coach',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">DSFR Coach</h1>
        <p class="text-gray-400 mt-1">
          Your AI mentor — remembers your history, tracks your evolution and keeps you
          moving toward an international offer.
        </p>
      </header>

      <section class="card">
        <h2 class="font-semibold mb-2">Coming soon</h2>
        <p class="text-gray-400 text-sm">
          The Coach isn't available yet. Back to the
          <a routerLink="/dashboard" class="text-brand hover:text-brand-hover">Dashboard</a>
          for now.
        </p>
      </section>
    </div>
  `
})
export class CoachComponent {}
