import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PracticeService } from '../../core/services/practice.service';

@Component({
  selector: 'app-job',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">Target Job</h1>
        <p class="text-gray-400 mt-1">
          The position you're preparing for. Your interview practice is generated from
          this job + your résumé.
        </p>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" class="card space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="label" for="title">Job title</label>
            <input id="title" type="text" class="input" formControlName="title"
                   placeholder="e.g. Java Developer" />
          </div>
          <div>
            <label class="label" for="seniority">Seniority</label>
            <select id="seniority" class="input" formControlName="seniority">
              <option value="">Select…</option>
              <option value="Junior">Junior</option>
              <option value="Mid-level">Mid-level (Pleno)</option>
              <option value="Senior">Senior</option>
              <option value="Staff / Principal">Staff / Principal</option>
            </select>
          </div>
          <div>
            <label class="label" for="stack">Main stack</label>
            <input id="stack" type="text" class="input" formControlName="stack"
                   placeholder="e.g. Java, Spring Boot, AWS" />
          </div>
        </div>
        <div>
          <label class="label" for="raw_text">Job posting</label>
          <textarea id="raw_text" rows="10" class="input font-mono text-xs leading-relaxed"
                    formControlName="raw_text"
                    placeholder="Paste the full job description here..."></textarea>
        </div>

        @if (error()) {
          <p class="text-red-400 text-sm">{{ error() }}</p>
        }
        @if (saved()) {
          <p class="text-emerald-400 text-sm">Target job saved ✓</p>
        }

        <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
          {{ saving() ? 'Saving…' : 'Save target job' }}
        </button>
      </form>
    </div>
  `
})
export class JobComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly practice = inject(PracticeService);

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    seniority: [''],
    stack: [''],
    raw_text: ['', [Validators.required, Validators.minLength(30)]]
  });

  ngOnInit(): void {
    this.practice.getJob().subscribe({
      next: (j) => this.form.patchValue(j),
      error: () => void 0 // 404 = no job yet
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.practice.saveJob(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save. Check the fields and try again.');
      }
    });
  }
}
