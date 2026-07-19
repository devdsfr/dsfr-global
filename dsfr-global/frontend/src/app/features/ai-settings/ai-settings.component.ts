import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PracticeService } from '../../core/services/practice.service';

interface ProviderOption {
  id: string;
  label: string;
  keyHint: string;
  defaultModel: string;
  consoleUrl: string;
}

@Component({
  selector: 'app-ai-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="p-8 max-w-3xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">AI Settings</h1>
        <p class="text-gray-400 mt-1">
          Connect your own AI provider. Your key is stored encrypted and used only to
          generate your interview practice.
        </p>
      </header>

      @if (current()) {
        <div class="card mb-6 border-l-4 border-l-emerald-500">
          <p class="text-sm">
            <span class="text-emerald-400">✓ Connected:</span>
            <span class="font-medium capitalize"> {{ current()!.provider }}</span>
            <span class="text-gray-500"> · key {{ current()!.masked_key }}</span>
            @if (current()!.model) {
              <span class="text-gray-500"> · model {{ current()!.model }}</span>
            }
          </p>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="card space-y-5">
        <div>
          <label class="label">Provider</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            @for (p of providers; track p.id) {
              <button type="button"
                      (click)="selectProvider(p.id)"
                      class="rounded-lg border px-4 py-3 text-sm text-left transition-colors"
                      [class]="form.value.provider === p.id
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-surface-border text-gray-300 hover:bg-white/5'">
                <span class="font-semibold block">{{ p.label }}</span>
                <span class="text-xs text-gray-500">{{ p.defaultModel }}</span>
              </button>
            }
          </div>
        </div>

        <div>
          <label class="label" for="api_key">API key</label>
          <input id="api_key" type="password" class="input font-mono" formControlName="api_key"
                 [placeholder]="selectedProvider().keyHint" autocomplete="off" />
          <p class="text-xs text-gray-500 mt-1.5">
            Create one at
            <a [href]="selectedProvider().consoleUrl" target="_blank" rel="noopener"
               class="text-brand hover:text-brand-hover">{{ selectedProvider().consoleUrl }}</a>.
            The provider account needs active credits/billing.
          </p>
        </div>

        <div>
          <label class="label" for="model">Model <span class="text-gray-500">(optional)</span></label>
          <input id="model" type="text" class="input" formControlName="model"
                 [placeholder]="'default: ' + selectedProvider().defaultModel" />
        </div>

        @if (error()) {
          <p class="text-red-400 text-sm">{{ error() }}</p>
        }
        @if (saved()) {
          <p class="text-emerald-400 text-sm">AI provider connected ✓ — you can now generate interviews.</p>
        }

        <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
          {{ saving() ? 'Saving…' : 'Save & connect' }}
        </button>
      </form>
    </div>
  `
})
export class AiSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly practice = inject(PracticeService);

  readonly providers: ProviderOption[] = [
    { id: 'openai', label: 'OpenAI', keyHint: 'sk-...', defaultModel: 'gpt-4o-mini', consoleUrl: 'https://platform.openai.com' },
    { id: 'anthropic', label: 'Anthropic', keyHint: 'sk-ant-...', defaultModel: 'claude-haiku-4.5', consoleUrl: 'https://console.anthropic.com' },
    { id: 'gemini', label: 'Google Gemini', keyHint: 'AIza...', defaultModel: 'gemini-2.0-flash', consoleUrl: 'https://aistudio.google.com' }
  ];

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);
  readonly current = signal<{ provider: string; masked_key: string; model: string } | null>(null);

  readonly form = this.fb.nonNullable.group({
    provider: ['openai', [Validators.required]],
    api_key: ['', [Validators.required, Validators.minLength(20)]],
    model: ['']
  });

  selectedProvider(): ProviderOption {
    return this.providers.find((p) => p.id === this.form.value.provider) ?? this.providers[0];
  }

  selectProvider(id: string): void {
    this.form.patchValue({ provider: id });
  }

  ngOnInit(): void {
    this.practice.getAISettings().subscribe({
      next: (s) => {
        if (s.has_key) {
          this.current.set({ provider: s.provider, masked_key: s.masked_key, model: s.model });
          this.form.patchValue({ provider: s.provider, model: s.model });
        }
      },
      error: () => void 0
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.practice.saveAISettings(this.form.getRawValue()).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.saved.set(true);
        this.current.set({ provider: s.provider, masked_key: s.masked_key, model: s.model });
        this.form.patchValue({ api_key: '' });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error ?? 'Could not save. Check the key and try again.');
      }
    });
  }
}
