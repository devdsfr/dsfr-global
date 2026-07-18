import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-gap-analysis',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">GAP Analysis</h1>
        <p class="text-gray-400 mt-1">
          Compare your résumé against a target job to see your real compatibility —
          technical, linguistic and overall.
        </p>
      </header>

      <section class="card">
        <h2 class="font-semibold mb-2">Coming soon</h2>
        <p class="text-gray-400 text-sm">
          Résumé upload and job posting intake aren't wired up yet, so there's nothing to
          analyze here for now. This is the next module we're building — once it ships,
          this page will show your compatibility percentage, missing technologies and
          the vocabulary you need for the role.
        </p>
      </section>
    </div>
  `
})
export class GapAnalysisComponent {}
