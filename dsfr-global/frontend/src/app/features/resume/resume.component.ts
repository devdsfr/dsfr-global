import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PracticeService } from '../../core/services/practice.service';

@Component({
  selector: 'app-resume',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">My Résumé</h1>
        <p class="text-gray-400 mt-1">
          Paste your résumé below. The AI uses it to personalize your interview practice.
          PDF upload is coming later.
        </p>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" class="card space-y-5">
        <div>
          <label class="label" for="headline">Headline</label>
          <input id="headline" type="text" class="input" formControlName="headline"
                 placeholder="e.g. Backend Developer — Java / Spring Boot" />
        </div>
        <div>
          <label class="label" for="raw_text">Résumé text</label>
          <textarea id="raw_text" rows="14" class="input font-mono text-xs leading-relaxed"
                    formControlName="raw_text"
                    placeholder="Paste your full résumé here (experience, skills, projects)..."></textarea>
          <p class="text-xs text-gray-500 mt-1.5">Minimum 50 characters. Any language is fine — practice output is always in English.</p>
        </div>

        @if (error()) {
          <p class="text-red-400 text-sm">{{ error() }}</p>
        }
        @if (saved()) {
          <p class="text-emerald-400 text-sm">Résumé saved ✓</p>
        }

        <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
          {{ saving() ? 'Saving…' : 'Save résumé' }}
        </button>
      </form>
    </div>
  `
})
export class ResumeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly practice = inject(PracticeService);

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    headline: ['', [Validators.maxLength(160)]],
    raw_text: ['', [Validators.required, Validators.minLength(50)]]
  });

  ngOnInit(): void {
    this.practice.getResume().subscribe({
      next: (r) => this.form.patchValue({ headline: r.headline, raw_text: r.raw_text }),
      error: () => void 0 // 404 = no resume yet, that's fine
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.practice.saveResume(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save. Check the minimum length and try again.');
      }
    });
  }
}
