import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-6xl mx-auto">
      <div class="card text-center py-16">
        <h1 class="text-2xl font-bold mb-2">Page not found</h1>
        <p class="text-gray-400 text-sm mb-6">
          This page doesn't exist or hasn't been built yet.
        </p>
        <a routerLink="/dashboard" class="btn-primary inline-block">Back to Dashboard</a>
      </div>
    </div>
  `
})
export class NotFoundComponent {}
