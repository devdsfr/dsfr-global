import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">My Journey</h1>
        <p class="text-gray-400 mt-1">
          Your personalized path — Speaking, Listening, Reading, Vocabulary and mock interviews,
          adapted as you progress.
        </p>
      </header>

      <section class="card">
        <h2 class="font-semibold mb-2">Coming soon</h2>
        <p class="text-gray-400 text-sm">
          Your learning path is generated once the Learning AI has your résumé and target job
          on file. In the meantime, head back to the
          <a routerLink="/dashboard" class="text-brand hover:text-brand-hover">Dashboard</a>
          to see your current readiness.
        </p>
      </section>
    </div>
  `
})
export class JourneyComponent {}
