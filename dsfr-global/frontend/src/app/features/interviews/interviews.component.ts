import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Interview } from '../../core/models/practice.model';
import { PracticeService } from '../../core/services/practice.service';

type Stage = 'loading' | 'setup' | 'ready' | 'generating' | 'practicing' | 'finished';

@Component({
  selector: 'app-interviews',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      @switch (stage()) {

        @case ('loading') {
          <div class="card animate-pulse h-40"></div>
        }

        @case ('setup') {
          <header class="mb-8">
            <h1 class="text-2xl font-bold">DSFR Interview</h1>
            <p class="text-gray-400 mt-1">Practice a realistic interview for your target job, with a teleprompter guiding every answer.</p>
          </header>
          <div class="card">
            <h2 class="font-semibold mb-3">Before you start</h2>
            <p class="text-gray-400 text-sm mb-4">The AI needs two things to build your personalized interview:</p>
            <ul class="space-y-2 text-sm">
              <li class="flex items-center gap-2">
                <span [class]="hasResume() ? 'text-emerald-400' : 'text-gray-500'">{{ hasResume() ? '✓' : '○' }}</span>
                <a routerLink="/resume" class="text-brand hover:text-brand-hover">Register your résumé</a>
              </li>
              <li class="flex items-center gap-2">
                <span [class]="hasJob() ? 'text-emerald-400' : 'text-gray-500'">{{ hasJob() ? '✓' : '○' }}</span>
                <a routerLink="/job" class="text-brand hover:text-brand-hover">Register your target job</a>
              </li>
            </ul>
          </div>
        }

        @case ('ready') {
          <header class="mb-8">
            <h1 class="text-2xl font-bold">DSFR Interview</h1>
            <p class="text-gray-400 mt-1">Your personalized mock interview. The interviewer speaks — the teleprompter shows what to answer.</p>
          </header>
          @if (!aiReady()) {
            <div class="card mb-4 border-l-4 border-l-amber-500">
              <p class="text-sm text-gray-300">
                ⚠️ No AI provider connected yet.
                <a routerLink="/ai-settings" class="text-brand hover:text-brand-hover">Connect your API key</a>
                (OpenAI, Anthropic or Gemini) to generate interviews.
              </p>
            </div>
          }
          <div class="card space-y-4">
            @if (interview()) {
              <p class="text-sm text-gray-400">
                You have a saved interview script ({{ interview()!.turns.length }} questions,
                {{ interview()!.level }} level).
              </p>
              <div class="flex flex-wrap gap-3">
                <button class="btn-primary" (click)="startPractice()">▶ Start practice</button>
                <button class="btn-primary bg-surface-border hover:bg-surface-border/70" (click)="generate()">
                  ↻ Generate new interview
                </button>
              </div>
            } @else {
              <p class="text-sm text-gray-400">Ready! Generate your first personalized interview script.</p>
              <button class="btn-primary" (click)="generate()">✨ Generate my interview</button>
            }
            @if (error()) {
              <p class="text-red-400 text-sm">{{ error() }}</p>
            }
          </div>
        }

        @case ('generating') {
          <div class="card text-center py-16">
            <div class="inline-block h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="font-semibold">Building your interview…</p>
            <p class="text-gray-400 text-sm mt-1">The AI is reading your résumé and the job posting. ~20 seconds.</p>
          </div>
        }

        @case ('practicing') {
          <div class="mb-6 flex items-center justify-between">
            <p class="text-sm text-gray-400">Question {{ current() + 1 }} of {{ interview()!.turns.length }}</p>
            <button class="text-sm text-gray-500 hover:text-gray-300" (click)="endSession()">End session</button>
          </div>
          <div class="h-1.5 bg-surface-border rounded-full mb-8 overflow-hidden">
            <div class="h-full bg-brand rounded-full transition-all duration-500"
                 [style.width.%]="((current() + 1) / interview()!.turns.length) * 100"></div>
          </div>

          <!-- Interviewer -->
          <div class="card mb-6 border-l-4 border-l-brand">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wider text-gray-500 mb-2">🎙 Interviewer</p>
                <p class="text-lg">{{ turn().interviewer }}</p>
              </div>
              <button class="shrink-0 text-sm text-brand hover:text-brand-hover" (click)="speak()"
                      [disabled]="speaking()">
                {{ speaking() ? '🔊 Speaking…' : '🔊 Repeat' }}
              </button>
            </div>
          </div>

          <!-- Teleprompter -->
          <div class="card bg-black/40 border-brand/30 mb-6">
            <p class="text-xs uppercase tracking-wider text-gray-500 mb-4">📺 Teleprompter — read this aloud</p>
            <p class="text-2xl leading-relaxed font-medium tracking-wide">{{ turn().answer }}</p>
          </div>

          <div class="flex justify-between">
            <button class="btn-primary bg-surface-border hover:bg-surface-border/70"
                    (click)="previous()" [disabled]="current() === 0">← Previous</button>
            <button class="btn-primary" (click)="next()">
              {{ current() === interview()!.turns.length - 1 ? 'Finish ✓' : 'Next question →' }}
            </button>
          </div>
        }

        @case ('finished') {
          <div class="card text-center py-16">
            <p class="text-4xl mb-4">🎉</p>
            <h1 class="text-2xl font-bold mb-2">Session complete!</h1>
            <p class="text-gray-400 text-sm mb-8">
              You practiced {{ interview()!.turns.length }} answers out loud. Repetition builds fluency —
              come back tomorrow and run it again, or generate a fresh interview.
            </p>
            <div class="flex justify-center gap-3">
              <button class="btn-primary" (click)="startPractice()">↻ Practice again</button>
              <button class="btn-primary bg-surface-border hover:bg-surface-border/70" (click)="generate()">
                ✨ New interview
              </button>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class InterviewsComponent implements OnInit, OnDestroy {
  private readonly practice = inject(PracticeService);

  readonly stage = signal<Stage>('loading');
  readonly interview = signal<Interview | null>(null);
  readonly current = signal(0);
  readonly speaking = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasResume = signal(false);
  readonly hasJob = signal(false);
  readonly aiReady = signal(false);

  readonly turn = computed(() => this.interview()!.turns[this.current()]);

  ngOnInit(): void {
    forkJoin({
      resume: this.practice.getResume().pipe(catchError(() => of(null))),
      job: this.practice.getJob().pipe(catchError(() => of(null))),
      script: this.practice.latestInterview().pipe(catchError(() => of(null))),
      aiSettings: this.practice.getAISettings().pipe(catchError(() => of(null)))
    }).subscribe(({ resume, job, script, aiSettings }) => {
      this.hasResume.set(!!resume);
      this.hasJob.set(!!job);
      this.aiReady.set(!!aiSettings && (aiSettings.has_key || aiSettings.server_default));
      this.interview.set(script);
      this.stage.set(resume && job ? 'ready' : 'setup');
    });
  }

  ngOnDestroy(): void {
    speechSynthesis.cancel();
  }

  generate(): void {
    this.stage.set('generating');
    this.error.set(null);
    this.practice.generateInterview('beginner').subscribe({
      next: (script) => {
        this.interview.set(script);
        this.startPractice();
      },
      error: (err) => {
        this.stage.set('ready');
        const serverMessage: string | undefined = err.error?.error;
        if (err.status === 503) {
          this.error.set('AI is not configured on the server yet (missing API key). Ask the admin to set it.');
        } else if (serverMessage) {
          // Surface the real upstream error (e.g. AI provider quota/billing issues)
          // so the user knows what to fix instead of retrying blindly.
          this.error.set(serverMessage);
        } else {
          this.error.set('Could not generate the interview. Please try again.');
        }
      }
    });
  }

  startPractice(): void {
    this.current.set(0);
    this.stage.set('practicing');
    this.speak();
  }

  next(): void {
    speechSynthesis.cancel();
    if (this.current() === this.interview()!.turns.length - 1) {
      this.stage.set('finished');
      return;
    }
    this.current.update((i) => i + 1);
    this.speak();
  }

  previous(): void {
    if (this.current() === 0) return;
    speechSynthesis.cancel();
    this.current.update((i) => i - 1);
    this.speak();
  }

  endSession(): void {
    speechSynthesis.cancel();
    this.stage.set('ready');
  }

  /** The interviewer reads the current question aloud (browser TTS, English voice). */
  speak(): void {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(this.turn().interviewer);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    const voice = speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith('en') && /female|samantha|zira|aria|jenny/i.test(v.name))
      ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => this.speaking.set(true);
    utterance.onend = () => this.speaking.set(false);
    utterance.onerror = () => this.speaking.set(false);
    speechSynthesis.speak(utterance);
  }
}
