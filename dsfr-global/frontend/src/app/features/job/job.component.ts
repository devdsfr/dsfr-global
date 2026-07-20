import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Job } from '../../core/models/practice.model';
import { PracticeService } from '../../core/services/practice.service';

@Component({
  selector: 'app-job',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="p-8 max-w-5xl mx-auto">
      <header class="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">Target Jobs</h1>
          <p class="text-gray-400 mt-1">
            Track every opening you're applying to. Pick one as active — that's the job your
            interview practice is built from.
          </p>
        </div>
        @if (!showForm()) {
          <button class="btn-primary shrink-0" (click)="newJob()">+ Add job</button>
        }
      </header>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="save()" class="card space-y-5 mb-8">
          <h2 class="font-semibold">{{ editingId() ? 'Edit job' : 'New job' }}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label" for="title">Job title</label>
              <input id="title" type="text" class="input" formControlName="title" placeholder="e.g. Java Developer" />
            </div>
            <div>
              <label class="label" for="company">Company</label>
              <input id="company" type="text" class="input" formControlName="company" placeholder="e.g. Acme Corp" />
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
              <input id="stack" type="text" class="input" formControlName="stack" placeholder="e.g. Java, Spring Boot, AWS" />
            </div>
          </div>
          <div>
            <label class="label" for="raw_text">Job posting</label>
            <textarea id="raw_text" rows="8" class="input font-mono text-xs leading-relaxed"
                      formControlName="raw_text" placeholder="Paste the full job description here..."></textarea>
          </div>
          @if (error()) { <p class="text-red-400 text-sm">{{ error() }}</p> }
          <div class="flex gap-3">
            <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : 'Save job' }}
            </button>
            <button type="button" class="btn-primary bg-surface-border hover:bg-surface-border/70" (click)="cancel()">
              Cancel
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <div class="card h-32 animate-pulse"></div>
      } @else if (jobs().length === 0 && !showForm()) {
        <div class="card text-center py-14">
          <p class="text-4xl mb-3">🎯</p>
          <p class="font-semibold mb-1">No target jobs yet</p>
          <p class="text-gray-400 text-sm mb-6">Add the openings you're preparing for.</p>
          <button class="btn-primary" (click)="newJob()">+ Add your first job</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (job of jobs(); track job.id) {
            <div class="card flex flex-col"
                 [class]="job.is_active ? 'border-brand ring-1 ring-brand/40' : ''">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 class="font-semibold">{{ job.title }}</h3>
                  <p class="text-sm text-gray-400">
                    {{ job.company || 'Company not set' }}
                    @if (job.seniority) { <span> · {{ job.seniority }}</span> }
                  </p>
                </div>
                @if (job.is_active) {
                  <span class="shrink-0 text-xs px-2 py-1 rounded-full bg-brand/20 text-brand">Active</span>
                }
              </div>
              @if (job.stack) {
                <p class="text-xs text-gray-500 mb-4">{{ job.stack }}</p>
              }
              <div class="mt-auto flex flex-wrap gap-2 pt-2">
                @if (!job.is_active) {
                  <button class="text-xs px-3 py-1.5 rounded-lg border border-surface-border hover:bg-white/5"
                          (click)="activate(job)">Set active</button>
                }
                <button class="text-xs px-3 py-1.5 rounded-lg border border-brand/50 text-brand hover:bg-brand/10"
                        (click)="practice(job)">🎤 Practice</button>
                <button class="text-xs px-3 py-1.5 rounded-lg border border-surface-border hover:bg-white/5"
                        (click)="edit(job)">Edit</button>
                <button class="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-red-400 hover:bg-red-500/10"
                        (click)="remove(job)">Delete</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class JobComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly practiceSvc = inject(PracticeService);
  private readonly router = inject(Router);

  readonly jobs = signal<Job[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    company: [''],
    seniority: [''],
    stack: [''],
    raw_text: ['', [Validators.required, Validators.minLength(30)]]
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.practiceSvc.listJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  newJob(): void {
    this.editingId.set(null);
    this.form.reset();
    this.error.set(null);
    this.showForm.set(true);
  }

  edit(job: Job): void {
    this.editingId.set(job.id);
    this.form.patchValue(job);
    this.error.set(null);
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    const payload = this.form.getRawValue();
    const id = this.editingId();
    const req = id ? this.practiceSvc.updateJob(id, payload) : this.practiceSvc.createJob(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form.reset();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error ?? 'Could not save. Check the fields and try again.');
      }
    });
  }

  activate(job: Job): void {
    this.practiceSvc.activateJob(job.id).subscribe({ next: () => this.load() });
  }

  remove(job: Job): void {
    if (!confirm(`Delete "${job.title}"? This also removes its practice history.`)) return;
    this.practiceSvc.deleteJob(job.id).subscribe({ next: () => this.load() });
  }

  /** Make this job active, then jump straight into practice for it. */
  practice(job: Job): void {
    this.practiceSvc.activateJob(job.id).subscribe({
      next: () => this.router.navigate(['/interviews'], { queryParams: { job: job.id } })
    });
  }
}
