import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Evaluation, Interview, Job } from '../../core/models/practice.model';
import { PracticeService } from '../../core/services/practice.service';

type Stage = 'loading' | 'setup' | 'ready' | 'generating' | 'practicing' | 'finished';

/** Minimal typing for the browser SpeechRecognition API (not in lib.dom). */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}

@Component({
  selector: 'app-interviews',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      @switch (stage()) {

        @case ('loading') { <div class="card animate-pulse h-40"></div> }

        @case ('setup') {
          <header class="mb-8">
            <h1 class="text-2xl font-bold">DSFR Interview</h1>
            <p class="text-gray-400 mt-1">Practice a realistic interview, speak your answers, and get scored.</p>
          </header>
          <div class="card">
            <h2 class="font-semibold mb-3">Before you start</h2>
            <ul class="space-y-2 text-sm">
              <li class="flex items-center gap-2">
                <span [class]="hasResume() ? 'text-emerald-400' : 'text-gray-500'">{{ hasResume() ? '✓' : '○' }}</span>
                <a routerLink="/resume" class="text-brand hover:text-brand-hover">Register your résumé</a>
              </li>
              <li class="flex items-center gap-2">
                <span [class]="jobs().length ? 'text-emerald-400' : 'text-gray-500'">{{ jobs().length ? '✓' : '○' }}</span>
                <a routerLink="/job" class="text-brand hover:text-brand-hover">Add a target job</a>
              </li>
            </ul>
          </div>
        }

        @case ('ready') {
          <header class="mb-8">
            <h1 class="text-2xl font-bold">DSFR Interview</h1>
            <p class="text-gray-400 mt-1">The interviewer speaks, the teleprompter guides you, and the AI scores what you say.</p>
          </header>

          @if (!aiReady()) {
            <div class="card mb-4 border-l-4 border-l-amber-500">
              <p class="text-sm text-gray-300">
                ⚠️ No AI provider connected.
                <a routerLink="/ai-settings" class="text-brand hover:text-brand-hover">Connect your API key</a> first.
              </p>
            </div>
          }
          @if (!micSupported()) {
            <div class="card mb-4 border-l-4 border-l-amber-500">
              <p class="text-sm text-gray-300">
                ⚠️ Voice recording needs Chrome or Edge. You can still practice reading aloud, but answers won't be scored.
              </p>
            </div>
          }

          <div class="card space-y-4">
            <div>
              <label class="label" for="jobSelect">Practice for</label>
              <select id="jobSelect" class="input" [value]="selectedJobId()"
                      (change)="selectJob($any($event.target).value)">
                @for (job of jobs(); track job.id) {
                  <option [value]="job.id">{{ job.title }}@if (job.company) { — {{ job.company }} }</option>
                }
              </select>
            </div>

            @if (interview()) {
              <p class="text-sm text-gray-400">
                Saved script: {{ interview()!.turns.length }} questions ({{ interview()!.level }}).
              </p>
            }
            <div class="flex flex-wrap gap-3">
              @if (interview()) {
                <button class="btn-primary" (click)="startPractice()">▶ Start practice</button>
              }
              <button class="btn-primary" [class]="interview() ? 'bg-surface-border hover:bg-surface-border/70' : ''"
                      (click)="generate()">
                {{ interview() ? '↻ Generate new interview' : '✨ Generate my interview' }}
              </button>
            </div>
            @if (error()) { <p class="text-red-400 text-sm">{{ error() }}</p> }
          </div>
        }

        @case ('generating') {
          <div class="card text-center py-16">
            <div class="inline-block h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="font-semibold">Building your interview…</p>
            <p class="text-gray-400 text-sm mt-1">Reading your résumé and the job posting. ~20 seconds.</p>
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

          <div class="card mb-6 border-l-4 border-l-brand">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wider text-gray-500 mb-2">🎙 Interviewer</p>
                <p class="text-lg">{{ turn().interviewer }}</p>
              </div>
              <button class="shrink-0 text-sm text-brand hover:text-brand-hover"
                      (click)="speak()" [disabled]="speaking()">
                {{ speaking() ? '🔊 Speaking…' : '🔊 Repeat' }}
              </button>
            </div>
          </div>

          <div class="card bg-black/40 border-brand/30 mb-6">
            <p class="text-xs uppercase tracking-wider text-gray-500 mb-4">📺 Teleprompter — read this aloud</p>
            <p class="text-2xl leading-relaxed font-medium tracking-wide">{{ turn().answer }}</p>
          </div>

          <!-- Recorder -->
          <div class="card mb-6">
            <div class="flex items-center justify-between gap-4 mb-3">
              <p class="text-xs uppercase tracking-wider text-gray-500">🎤 Your answer</p>
              @if (micSupported()) {
                <button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        [class]="recording()
                          ? 'bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse'
                          : 'bg-brand text-white hover:bg-brand-hover'"
                        (click)="toggleRecording()">
                  {{ recording() ? '⏹ Stop recording' : '● Record my answer' }}
                </button>
              }
            </div>

            @if (transcript()) {
              <p class="text-sm text-gray-300 bg-black/30 rounded-lg p-3 mb-3">{{ transcript() }}</p>
            } @else if (recording()) {
              <p class="text-sm text-gray-500 italic">Listening… speak now.</p>
            } @else {
              <p class="text-sm text-gray-500 italic">Press record and read the teleprompter out loud.</p>
            }

            @if (transcript() && !evaluation() && !evaluating()) {
              <button class="btn-primary text-sm" (click)="evaluate()">✓ Get my score</button>
            }
            @if (evaluating()) {
              <p class="text-sm text-gray-400">Evaluating your answer…</p>
            }
            @if (evalError()) { <p class="text-red-400 text-sm">{{ evalError() }}</p> }
          </div>

          <!-- Feedback -->
          @if (evaluation(); as ev) {
            <div class="card mb-6 border-l-4 border-l-emerald-500">
              <div class="flex items-baseline gap-3 mb-4">
                <span class="text-3xl font-bold">{{ ev.score }}</span>
                <span class="text-gray-500">/100</span>
              </div>
              <div class="grid grid-cols-3 gap-3 mb-5">
                @for (m of metrics(ev); track m.label) {
                  <div>
                    <p class="text-xs text-gray-500 mb-1">{{ m.label }}</p>
                    <div class="h-1.5 bg-surface-border rounded-full overflow-hidden">
                      <div class="h-full bg-brand rounded-full" [style.width.%]="m.value"></div>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">{{ m.value }}</p>
                  </div>
                }
              </div>
              @if (ev.tips.length) {
                <p class="text-xs uppercase tracking-wider text-gray-500 mb-2">Tips</p>
                <ul class="space-y-1.5 mb-4">
                  @for (tip of ev.tips; track tip) {
                    <li class="text-sm text-gray-300">• {{ tip }}</li>
                  }
                </ul>
              }
              @if (ev.improved) {
                <p class="text-xs uppercase tracking-wider text-gray-500 mb-2">Better way to say it</p>
                <p class="text-sm text-emerald-300/90 italic">"{{ ev.improved }}"</p>
              }
            </div>
          }

          <div class="flex justify-between">
            <button class="btn-primary bg-surface-border hover:bg-surface-border/70"
                    (click)="previous()" [disabled]="current() === 0">← Previous</button>
            <button class="btn-primary" (click)="next()">
              {{ current() === interview()!.turns.length - 1 ? 'Finish ✓' : 'Next question →' }}
            </button>
          </div>
        }

        @case ('finished') {
          <div class="card text-center py-14">
            <p class="text-4xl mb-4">🎉</p>
            <h1 class="text-2xl font-bold mb-2">Session complete!</h1>
            @if (sessionScores().length) {
              <p class="text-gray-400 text-sm mb-6">
                You scored {{ sessionAverage() }}/100 across {{ sessionScores().length }} evaluated
                {{ sessionScores().length === 1 ? 'answer' : 'answers' }}.
              </p>
              <div class="max-w-xs mx-auto mb-8">
                <div class="h-2 bg-surface-border rounded-full overflow-hidden">
                  <div class="h-full bg-brand rounded-full" [style.width.%]="sessionAverage()"></div>
                </div>
              </div>
            } @else {
              <p class="text-gray-400 text-sm mb-8">
                You practiced {{ interview()!.turns.length }} answers. Record your answers next time
                to get scored feedback.
              </p>
            }
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
  private readonly route = inject(ActivatedRoute);

  readonly stage = signal<Stage>('loading');
  readonly interview = signal<Interview | null>(null);
  readonly jobs = signal<Job[]>([]);
  readonly selectedJobId = signal<string>('');
  readonly current = signal(0);
  readonly speaking = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasResume = signal(false);
  readonly aiReady = signal(false);

  readonly recording = signal(false);
  readonly transcript = signal('');
  readonly evaluation = signal<Evaluation | null>(null);
  readonly evaluating = signal(false);
  readonly evalError = signal<string | null>(null);
  readonly sessionScores = signal<number[]>([]);

  readonly turn = computed(() => this.interview()!.turns[this.current()]);
  readonly micSupported = signal(false);

  private recognition: SpeechRecognitionLike | null = null;

  metrics(ev: Evaluation) {
    return [
      { label: 'Fluency', value: ev.fluency },
      { label: 'Grammar', value: ev.grammar },
      { label: 'Vocabulary', value: ev.vocabulary }
    ];
  }

  sessionAverage(): number {
    const s = this.sessionScores();
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0;
  }

  ngOnInit(): void {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    this.micSupported.set(!!SR);

    forkJoin({
      resume: this.practice.getResume().pipe(catchError(() => of(null))),
      jobs: this.practice.listJobs().pipe(catchError(() => of([] as Job[]))),
      script: this.practice.latestInterview().pipe(catchError(() => of(null))),
      aiSettings: this.practice.getAISettings().pipe(catchError(() => of(null)))
    }).subscribe(({ resume, jobs, script, aiSettings }) => {
      this.hasResume.set(!!resume);
      this.jobs.set(jobs);
      this.aiReady.set(!!aiSettings && (aiSettings.has_key || aiSettings.server_default));
      this.interview.set(script);

      const queryJob = this.route.snapshot.queryParamMap.get('job');
      const active = jobs.find((j) => j.is_active) ?? jobs[0];
      this.selectedJobId.set(queryJob ?? active?.id ?? '');
      this.stage.set(resume && jobs.length ? 'ready' : 'setup');
    });
  }

  ngOnDestroy(): void {
    speechSynthesis.cancel();
    this.stopRecognition();
  }

  selectJob(id: string): void {
    this.selectedJobId.set(id);
  }

  generate(): void {
    this.stage.set('generating');
    this.error.set(null);
    this.practice.generateInterview('beginner', this.selectedJobId() || undefined).subscribe({
      next: (script) => {
        this.interview.set(script);
        this.startPractice();
      },
      error: (err) => {
        this.stage.set('ready');
        const serverMessage: string | undefined = err.error?.error;
        if (err.status === 503) {
          this.error.set('AI is not configured yet. Connect your API key in AI Settings.');
        } else if (serverMessage) {
          this.error.set(serverMessage);
        } else {
          this.error.set('Could not generate the interview. Please try again.');
        }
      }
    });
  }

  startPractice(): void {
    this.current.set(0);
    this.sessionScores.set([]);
    this.resetAnswerState();
    this.stage.set('practicing');
    this.speak();
  }

  next(): void {
    speechSynthesis.cancel();
    this.stopRecognition();
    if (this.current() === this.interview()!.turns.length - 1) {
      this.stage.set('finished');
      return;
    }
    this.current.update((i) => i + 1);
    this.resetAnswerState();
    this.speak();
  }

  previous(): void {
    if (this.current() === 0) return;
    speechSynthesis.cancel();
    this.stopRecognition();
    this.current.update((i) => i - 1);
    this.resetAnswerState();
    this.speak();
  }

  endSession(): void {
    speechSynthesis.cancel();
    this.stopRecognition();
    this.stage.set('ready');
  }

  private resetAnswerState(): void {
    this.transcript.set('');
    this.evaluation.set(null);
    this.evalError.set(null);
    this.evaluating.set(false);
  }

  /** The interviewer reads the current question aloud (browser TTS, English voice). */
  speak(): void {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(this.turn().interviewer);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    const voice =
      speechSynthesis.getVoices().find((v) => v.lang.startsWith('en') && /female|samantha|zira|aria|jenny/i.test(v.name)) ??
      speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => this.speaking.set(true);
    utterance.onend = () => this.speaking.set(false);
    utterance.onerror = () => this.speaking.set(false);
    speechSynthesis.speak(utterance);
  }

  toggleRecording(): void {
    this.recording() ? this.stopRecognition() : this.startRecognition();
  }

  private startRecognition(): void {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    speechSynthesis.cancel(); // don't let the interviewer's voice bleed into the mic

    const rec: SpeechRecognitionLike = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = '';
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk + ' ';
        else interim += chunk;
      }
      this.transcript.set((finalText + interim).trim());
    };
    rec.onerror = () => {
      this.recording.set(false);
      this.evalError.set('Microphone error. Check that the browser has permission to use it.');
    };
    rec.onend = () => this.recording.set(false);

    this.recognition = rec;
    this.evaluation.set(null);
    this.evalError.set(null);
    this.transcript.set('');
    this.recording.set(true);
    rec.start();
  }

  private stopRecognition(): void {
    this.recognition?.stop();
    this.recognition = null;
    this.recording.set(false);
  }

  evaluate(): void {
    const script = this.interview();
    if (!script || !this.transcript()) return;
    this.evaluating.set(true);
    this.evalError.set(null);
    this.practice
      .evaluateAnswer({ interview_id: script.id, turn_index: this.current(), transcript: this.transcript() })
      .subscribe({
        next: (ev) => {
          this.evaluating.set(false);
          this.evaluation.set(ev);
          this.sessionScores.update((s) => [...s, ev.score]);
        },
        error: (err) => {
          this.evaluating.set(false);
          this.evalError.set(err.error?.error ?? 'Could not evaluate your answer. Try again.');
        }
      });
  }
}
