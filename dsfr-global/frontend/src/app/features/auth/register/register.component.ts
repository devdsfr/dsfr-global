import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="card w-full max-w-md">
        <h1 class="text-2xl font-bold mb-1">Start your journey</h1>
        <p class="text-gray-400 text-sm mb-6">
          From your first application to your first international offer.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="label" for="name">Full name</label>
            <input id="name" type="text" class="input" formControlName="name" placeholder="Ada Lovelace" />
          </div>
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" type="email" class="input" formControlName="email" placeholder="you@example.com" />
          </div>
          <div>
            <label class="label" for="password">Password</label>
            <input id="password" type="password" class="input" formControlName="password" placeholder="Min. 8 characters" />
          </div>

          @if (error()) {
            <p class="text-red-400 text-sm">{{ error() }}</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>

        <p class="text-sm text-gray-400 mt-6 text-center">
          Already have an account?
          <a routerLink="/auth/login" class="text-brand hover:text-brand-hover">Sign in</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { name, email, password } = this.form.getRawValue();
    this.auth.register(name, email, password).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err) => {
        this.error.set(err.status === 409 ? 'This email is already registered.' : 'Something went wrong. Try again.');
        this.loading.set(false);
      }
    });
  }
}
