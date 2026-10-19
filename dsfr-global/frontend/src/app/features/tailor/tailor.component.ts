import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Job, MatchAnalysis, Tailoring } from '../../core/models/practice.model';
import { PracticeService } from '../../core/services/practice.service';

type Stage = 'input' | 'analyzing' | 'result' | 'tailoring' | 'tailored';
type JobSource = 'paste' | 'file' | 'saved';
type ResumeSource = 'saved' | 'paste' | 'file';

/** A gap the candidate can confirm they genuinely have experience with. */
interface Pick {
  requirement: string;
  kind: 'missing' | 'partial' | 'keyword';
  checked: boolean;
  note: string;
}

const STRONG_MATCH = 8;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Component({
  selector: 'app-tailor',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  template: `
    <div class="p-4 sm:p-8 max-w-5xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">Resume Match</h1>
        <p class="text-gray-400 mt-1">
          Score your resume against a job from 0 to 10. Below {{ strongMatch }}, tell us which
          missing skills you really have and get a version tailored to the role.
        </p>
      </header>

      <!-- ===================== STEP 1 · INPUT ===================== -->
      @if (stage() === 'input' || stage() === 'analyzing') {
        <div class="grid lg:grid-cols-2 gap-6 mb-6">
          <!-- Job -->
          <section class="card space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">1 · The job</h2>
              <div class="flex rounded-lg border border-surface-border p-0.5 text-xs" role="tablist">
                @for (s of jobSources; track s.value) {
                  <button type="button" role="tab" [attr.aria-selected]="jobSource() === s.value"
                          class="px-2.5 py-1 rounded-md transition-colors"
                          [class]="jobSource() === s.value ? 'bg-brand text-white' : 'text-gray-400 hover:text-gray-200'"
                          (click)="jobSource.set(s.value)">{{ s.label }}</button>
                }
              </div>
            </div>

            @if (jobSource() === 'saved') {
              @if (savedJobs().length) {
                <select class="input" (change)="useSavedJob($any($event.target).value)" aria-label="Saved job">
                  <option value="">Choose a saved job…</option>
                  @for (j of savedJobs(); track j.id) {
                    <option [value]="j.id">{{ j.title }}@if (j.company) { — {{ j.company }} }</option>
                  }
                </select>
              } @else {
                <p class="text-sm text-gray-400">
                  No saved jobs yet — <a routerLink="/job" class="text-brand hover:text-brand-hover">add one</a>,
                  or paste the posting.
                </p>
              }
            }

            @if (jobSource() === 'file') {
              <label class="block rounded-lg border border-dashed border-surface-border p-4 text-center text-sm text-gray-400 hover:border-brand cursor-pointer">
                <input type="file" class="sr-only" accept="image/png,image/jpeg,image/webp,application/pdf"
                       (change)="onFile('job', $event)" />
                {{ extracting() === 'job' ? 'Reading the posting…' : 'Upload a screenshot or PDF of the job' }}
              </label>
            }

            <div>
              <label class="label" for="jobTitle">Job title <span class="text-gray-400">(optional)</span></label>
              <input id="jobTitle" class="input" [(ngModel)]="jobTitle" placeholder="e.g. Senior Java Engineer — Acme" />
            </div>
            <div>
              <label class="label" for="jobText">Job posting</label>
              <textarea id="jobText" rows="12" class="input text-xs font-mono leading-relaxed"
                        [(ngModel)]="jobText"
                        placeholder="Paste the full job description — requirements, stack, responsibilities…"></textarea>
            </div>
          </section>

          <!-- Resume -->
          <section class="card space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">2 · Your resume</h2>
              <div class="flex rounded-lg border border-surface-border p-0.5 text-xs" role="tablist">
                @for (s of resumeSources; track s.value) {
                  <button type="button" role="tab" [attr.aria-selected]="resumeSource() === s.value"
                          class="px-2.5 py-1 rounded-md transition-colors"
                          [class]="resumeSource() === s.value ? 'bg-brand text-white' : 'text-gray-400 hover:text-gray-200'"
                          (click)="setResumeSource(s.value)">{{ s.label }}</button>
                }
              </div>
            </div>

            @if (resumeSource() === 'saved' && !hasSavedResume()) {
              <p class="text-sm text-gray-400">
                No saved resume — <a routerLink="/resume" class="text-brand hover:text-brand-hover">add one</a>,
                upload a file or paste it.
              </p>
            }

            @if (resumeSource() === 'file') {
              <label class="block rounded-lg border border-dashed border-surface-border p-4 text-center text-sm text-gray-400 hover:border-brand cursor-pointer">
                <input type="file" class="sr-only"
                       accept=".pdf,.docx,.txt,application/pdf,{{ docxMime }},text/plain"
                       (change)="onFile('resume', $event)" />
                {{ extracting() === 'resume' ? 'Reading your resume…' : 'Upload your resume (PDF, DOCX or TXT)' }}
              </label>
            }

            <div>
              <label class="label" for="resumeText">Resume text</label>
              <textarea id="resumeText" rows="15" class="input text-xs font-mono leading-relaxed"
                        [(ngModel)]="resumeText"
                        placeholder="Your resume as text — experience, skills, education…"></textarea>
            </div>
          </section>
        </div>

        <div aria-live="polite">
          @if (error()) { <p class="text-red-400 text-sm mb-3" role="alert">{{ error() }}</p> }
        </div>
        <button class="btn-primary" (click)="analyze()"
                [disabled]="stage() === 'analyzing' || jobText.trim().length < 40 || resumeText.trim().length < 80">
          {{ stage() === 'analyzing' ? 'Scoring your match…' : '✨ Score my match' }}
        </button>
      }

      <!-- ===================== STEP 2 · RESULT ===================== -->
      @if (analysis(); as a) {
        @if (stage() === 'result' || stage() === 'tailoring') {
          <section class="card mb-6">
            <div class="flex flex-wrap items-center gap-6">
              <div class="text-center">
                <p class="text-6xl font-bold" [class]="scoreColor(a.score)">{{ a.score | number: '1.1-1' }}</p>
                <p class="text-xs text-gray-400 mt-1">match out of 10</p>
              </div>
              <div class="flex-1 min-w-[16rem]">
                <p class="text-sm text-gray-200 mb-4">{{ a.summary }}</p>
                <div class="grid grid-cols-2 gap-3">
                  @for (m of breakdown(a); track m.label) {
                    <div>
                      <div class="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{{ m.label }}</span><span>{{ m.value | number: '1.1-1' }}</span>
                      </div>
                      <div class="h-1.5 bg-surface-border rounded-full overflow-hidden">
                        <div class="h-full bg-brand rounded-full" [style.width.%]="m.value * 10"></div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>

          <section class="card mb-6">
            <h2 class="font-semibold mb-3">Requirements</h2>
            <ul class="space-y-2">
              @for (r of a.requirements; track r.requirement) {
                <li class="flex gap-3 text-sm">
                  <span class="shrink-0 w-16 text-xs font-medium uppercase tracking-wide pt-0.5"
                        [class]="r.status === 'met' ? 'text-emerald-400' : r.status === 'partial' ? 'text-amber-400' : 'text-red-400'">
                    {{ r.status }}
                  </span>
                  <span>
                    <span class="text-gray-200">{{ r.requirement }}</span>
                    @if (r.evidence) { <span class="block text-xs text-gray-400 italic">"{{ r.evidence }}"</span> }
                  </span>
                </li>
              }
            </ul>
            @if (a.missing_keywords.length) {
              <p class="text-xs uppercase tracking-wider text-gray-400 mt-5 mb-2">Missing keywords</p>
              <div class="flex flex-wrap gap-2">
                @for (k of a.missing_keywords; track k) {
                  <span class="text-xs px-2 py-1 rounded-full border border-red-500/40 text-red-300">{{ k }}</span>
                }
              </div>
            }
          </section>

          @if (a.score >= strongMatch) {
            <section class="card mb-6 border-l-4 border-l-emerald-500">
              <p class="font-semibold text-emerald-300 mb-1">Strong match — no rewrite needed.</p>
              <p class="text-sm text-gray-300">
                Your resume already scores {{ a.score | number: '1.1-1' }}/10 for this job. Spend the
                time preparing instead — <a routerLink="/prep" class="text-brand hover:text-brand-hover">build a prep pack</a>.
              </p>
              <button class="btn-primary bg-surface-border hover:bg-surface-border/70 mt-4 text-sm" (click)="tailor()"
                      [disabled]="stage() === 'tailoring'">Polish it anyway</button>
            </section>
          } @else {
            <section class="card mb-6 border-l-4 border-l-amber-500">
              <h2 class="font-semibold mb-1">Which of these do you actually have?</h2>
              <p class="text-sm text-gray-400 mb-4">
                In tech nobody lists every tool they've used. Tick only what you have really worked with and
                say where — that becomes a real line in your resume. Anything you leave unticked stays out.
              </p>
              <div class="space-y-3">
                @for (p of picks; track p.requirement) {
                  <div class="rounded-lg border p-3 transition-colors"
                       [class]="p.checked ? 'border-brand/60 bg-brand/5' : 'border-surface-border'">
                    <label class="flex items-start gap-3 text-sm cursor-pointer">
                      <input type="checkbox" class="mt-0.5 accent-indigo-500" [(ngModel)]="p.checked" />
                      <span class="text-gray-200">{{ p.requirement }}
                        <span class="ml-1 text-xs text-gray-400">({{ p.kind === 'partial' ? 'partly covered' : p.kind === 'keyword' ? 'keyword' : 'missing' }})</span>
                      </span>
                    </label>
                    @if (p.checked) {
                      <input class="input mt-2 text-xs" [(ngModel)]="p.note" maxlength="500"
                             [attr.aria-label]="'Where you used ' + p.requirement"
                             placeholder="Where and how? e.g. used at Acme to publish payment events, ~1 year" />
                    }
                  </div>
                }
              </div>
              <div aria-live="polite" class="mt-4">
                @if (error()) { <p class="text-red-400 text-sm mb-3" role="alert">{{ error() }}</p> }
              </div>
              <div class="flex flex-wrap gap-3">
                <button class="btn-primary" (click)="tailor()" [disabled]="stage() === 'tailoring'">
                  {{ stage() === 'tailoring' ? 'Tailoring your resume… (~30s)' : '✨ Generate tailored resume' }}
                </button>
                <button class="btn-primary bg-surface-border hover:bg-surface-border/70" (click)="restart()">
                  ← Edit inputs
                </button>
              </div>
            </section>
          }
        }
      }

      <!-- ===================== STEP 3 · TAILORED ===================== -->
      @if (stage() === 'tailored') {
        @if (result(); as t) {
          <section class="card mb-6">
            <div class="flex flex-wrap items-center gap-6 mb-4">
              <div class="flex items-baseline gap-3">
                <span class="text-3xl font-bold text-gray-400">{{ t.before.score | number: '1.1-1' }}</span>
                <span class="text-gray-400" aria-hidden="true">→</span>
                <span class="text-5xl font-bold" [class]="scoreColor(t.after.score)">{{ t.after.score | number: '1.1-1' }}</span>
                <span class="text-sm text-gray-400">/10</span>
              </div>
              <p class="flex-1 min-w-[16rem] text-sm text-gray-300">{{ t.after.summary }}</p>
            </div>

            @if (t.after.score < strongMatch && stillMissing(t).length) {
              <div class="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 mb-4 text-sm">
                <p class="text-amber-300 font-medium mb-1">Still below {{ strongMatch }} — honestly.</p>
                <p class="text-gray-300">
                  To go higher you need real experience in: <span class="text-gray-100">{{ stillMissing(t).join(', ') }}</span>.
                  Worth studying before applying — or practice how to talk about the gap in a
                  <a routerLink="/prep" class="text-brand hover:text-brand-hover">prep pack</a>.
                </p>
              </div>
            }

            @if (t.changes.length) {
              <p class="text-xs uppercase tracking-wider text-gray-400 mb-2">What changed</p>
              <ul class="space-y-1 mb-2">
                @for (c of t.changes; track c) { <li class="text-sm text-gray-300">• {{ c }}</li> }
              </ul>
            }
          </section>

          <section class="card mb-6">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 class="font-semibold">Tailored resume</h2>
              <div class="flex flex-wrap gap-2">
                <button class="text-xs px-3 py-1.5 rounded-lg border border-surface-border hover:bg-white/5" (click)="copy(tailoredText)">
                  {{ copied() ? 'Copied ✓' : 'Copy' }}
                </button>
                <button class="text-xs px-3 py-1.5 rounded-lg border border-surface-border hover:bg-white/5" (click)="download(tailoredText, t.job_title)">
                  Download .txt
                </button>
                <button class="text-xs px-3 py-1.5 rounded-lg border border-brand/50 text-brand hover:bg-brand/10" (click)="printPdf(tailoredText, t.job_title)">
                  Save as PDF
                </button>
              </div>
            </div>
            <p class="text-xs text-gray-400 mb-2">Review every line before sending — you can edit it here.</p>
            <textarea rows="24" class="input text-xs font-mono leading-relaxed" [(ngModel)]="tailoredText"
                      aria-label="Tailored resume"></textarea>
          </section>

          <button class="btn-primary" (click)="restart(true)">↻ Match another job</button>
        }
      }

      <!-- ===================== HISTORY ===================== -->
      @if (history().length && stage() !== 'tailored') {
        <section class="card mt-10">
          <h2 class="font-semibold mb-3">Previous tailored resumes</h2>
          <ul class="divide-y divide-surface-border">
            @for (h of history(); track h.id) {
              <li class="py-3 flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm text-gray-200 truncate">{{ h.job_title || 'Untitled job' }}</p>
                  <p class="text-xs text-gray-400">{{ h.created_at | date: 'mediumDate' }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm">
                    <span class="text-gray-400">{{ h.before.score | number: '1.1-1' }}</span>
                    <span class="text-gray-400" aria-hidden="true"> → </span>
                    <span class="font-semibold" [class]="scoreColor(h.after.score)">{{ h.after.score | number: '1.1-1' }}</span>
                  </span>
                  <button class="text-xs px-3 py-1.5 rounded-lg border border-surface-border hover:bg-white/5" (click)="open(h)">Open</button>
                </div>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `
})
export class TailorComponent implements OnInit {
  private readonly practice = inject(PracticeService);

  readonly strongMatch = STRONG_MATCH;
  readonly docxMime = DOCX_MIME;

  readonly jobSources: ReadonlyArray<{ value: JobSource; label: string }> = [
    { value: 'paste', label: 'Paste' },
    { value: 'file', label: 'Screenshot' },
    { value: 'saved', label: 'Saved job' }
  ];
  readonly resumeSources: ReadonlyArray<{ value: ResumeSource; label: string }> = [
    { value: 'saved', label: 'My resume' },
    { value: 'file', label: 'Upload' },
    { value: 'paste', label: 'Paste' }
  ];

  readonly stage = signal<Stage>('input');
  readonly jobSource = signal<JobSource>('paste');
  readonly resumeSource = signal<ResumeSource>('saved');
  readonly extracting = signal<'job' | 'resume' | null>(null);
  readonly savedJobs = signal<Job[]>([]);
  readonly analysis = signal<MatchAnalysis | null>(null);
  readonly result = signal<Tailoring | null>(null);
  readonly history = signal<Tailoring[]>([]);
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);

  private savedResume = '';
  readonly hasSavedResume = signal(false);

  jobTitle = '';
  jobText = '';
  resumeText = '';
  tailoredText = '';
  picks: Pick[] = [];

  readonly canAnalyze = computed(() => this.stage() === 'input');

  ngOnInit(): void {
    forkJoin({
      jobs: this.practice.listJobs().pipe(catchError(() => of([] as Job[]))),
      resume: this.practice.getResume().pipe(catchError(() => of(null))),
      history: this.practice.listTailorings().pipe(catchError(() => of([] as Tailoring[])))
    }).subscribe(({ jobs, resume, history }) => {
      this.savedJobs.set(jobs);
      this.history.set(history);
      if (resume?.raw_text) {
        this.savedResume = resume.raw_text;
        this.hasSavedResume.set(true);
        this.resumeText = resume.raw_text;
      } else {
        this.resumeSource.set('paste');
      }
    });
  }

  setResumeSource(source: ResumeSource): void {
    this.resumeSource.set(source);
    if (source === 'saved') this.resumeText = this.savedResume;
  }

  useSavedJob(id: string): void {
    const job = this.savedJobs().find((j) => j.id === id);
    if (!job) return;
    this.jobTitle = job.company ? `${job.title} — ${job.company}` : job.title;
    const header = [job.title, job.company, job.seniority, job.stack ? `Stack: ${job.stack}` : '']
      .filter(Boolean)
      .join('\n');
    this.jobText = `${header}\n\n${job.raw_text}`.trim();
  }

  /** Reads an uploaded file and asks the backend to turn it into text. */
  onFile(kind: 'job' | 'resume', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      this.error.set('That file is larger than 8 MB.');
      return;
    }
    const mime = this.mimeOf(file);
    this.error.set(null);
    this.extracting.set(kind);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] ?? '';
      this.practice.extractDocument(kind, mime, base64).subscribe({
        next: ({ text }) => {
          this.extracting.set(null);
          if (kind === 'job') this.jobText = text;
          else this.resumeText = text;
        },
        error: (err) => {
          this.extracting.set(null);
          this.error.set(err.error?.error ?? 'Could not read that file. Try pasting the text instead.');
        }
      });
    };
    reader.onerror = () => {
      this.extracting.set(null);
      this.error.set('Could not read that file.');
    };
    reader.readAsDataURL(file);
  }

  /** Some systems report an empty MIME type for .docx; fall back to the extension. */
  private mimeOf(file: File): string {
    if (file.type) return file.type;
    const name = file.name.toLowerCase();
    if (name.endsWith('.docx')) return DOCX_MIME;
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
  }

  analyze(): void {
    this.error.set(null);
    this.stage.set('analyzing');
    this.practice.analyzeMatch(this.jobText.trim(), this.resumeText.trim()).subscribe({
      next: (a) => {
        this.analysis.set(a);
        this.picks = this.buildPicks(a);
        this.stage.set('result');
      },
      error: (err) => {
        this.stage.set('input');
        this.error.set(this.messageFor(err, 'Could not score the match. Please try again.'));
      }
    });
  }

  /** Gaps to offer for confirmation: weak requirements, then missing keywords
   *  that are not already covered by one of those requirements. */
  private buildPicks(a: MatchAnalysis): Pick[] {
    const picks: Pick[] = a.requirements
      .filter((r) => r.status !== 'met')
      .map((r) => ({ requirement: r.requirement, kind: r.status as 'missing' | 'partial', checked: false, note: '' }));
    const covered = picks.map((p) => p.requirement.toLowerCase());
    for (const keyword of a.missing_keywords) {
      const k = keyword.toLowerCase();
      if (!covered.some((c) => c.includes(k) || k.includes(c))) {
        picks.push({ requirement: keyword, kind: 'keyword', checked: false, note: '' });
        covered.push(k);
      }
    }
    return picks;
  }

  tailor(): void {
    this.error.set(null);
    this.stage.set('tailoring');
    const confirmations = this.picks
      .filter((p) => p.checked)
      .map((p) => ({ requirement: p.requirement, note: p.note.trim() }));
    this.practice
      .tailorResume({
        job_title: this.jobTitle.trim(),
        job_text: this.jobText.trim(),
        resume_text: this.resumeText.trim(),
        confirmations,
        before: this.analysis()
      })
      .subscribe({
        next: (t) => {
          this.result.set(t);
          this.tailoredText = t.tailored_resume;
          this.history.update((list) => [t, ...list]);
          this.stage.set('tailored');
        },
        error: (err) => {
          this.stage.set('result');
          this.error.set(this.messageFor(err, 'Could not tailor the resume. Please try again.'));
        }
      });
  }

  open(t: Tailoring): void {
    this.result.set(t);
    this.analysis.set(t.before);
    this.tailoredText = t.tailored_resume;
    this.jobTitle = t.job_title;
    this.jobText = t.job_text;
    this.resumeText = t.original_resume;
    this.stage.set('tailored');
    window.scrollTo({ top: 0 });
  }

  restart(clearJob = false): void {
    this.stage.set('input');
    this.analysis.set(null);
    this.result.set(null);
    this.error.set(null);
    if (clearJob) {
      this.jobTitle = '';
      this.jobText = '';
    }
  }

  stillMissing(t: Tailoring): string[] {
    return t.after.requirements.filter((r) => r.status === 'missing').map((r) => r.requirement);
  }

  breakdown(a: MatchAnalysis) {
    return [
      { label: 'Hard skills', value: a.breakdown.hard_skills },
      { label: 'Experience', value: a.breakdown.experience },
      { label: 'Keywords', value: a.breakdown.keywords },
      { label: 'Impact', value: a.breakdown.impact }
    ];
  }

  scoreColor(score: number): string {
    if (score >= STRONG_MATCH) return 'text-emerald-400';
    if (score >= 6) return 'text-amber-400';
    return 'text-red-400';
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  download(text: string, title: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.slug(title) || 'resume'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Opens a clean, ATS-friendly printable page; the browser's "Save as PDF" does the rest. */
  printPdf(text: string, title: string): void {
    const win = window.open('', '_blank');
    if (!win) {
      this.error.set('Your browser blocked the print window — allow pop-ups for this site.');
      return;
    }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>${this.escape(title || 'Resume')}</title>
      <style>
        @page { margin: 18mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #111; max-width: 760px; margin: 0 auto; }
        h1 { font-size: 18pt; margin: 0 0 4px; }
        h2 { font-size: 11pt; letter-spacing: .06em; border-bottom: 1px solid #999; padding-bottom: 2px; margin: 16px 0 6px; }
        p { margin: 2px 0; }
        ul { margin: 2px 0 6px 18px; padding: 0; }
        li { margin: 1px 0; }
      </style></head><body>${this.resumeToHtml(text)}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  /** Plain-text resume → semantic HTML: CAPS lines become headings, "- " lines list items. */
  private resumeToHtml(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];
    let inList = false;
    let first = true;
    const closeList = () => {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        closeList();
        continue;
      }
      if (first) {
        out.push(`<h1>${this.escape(line)}</h1>`);
        first = false;
        continue;
      }
      const isHeading = /[A-Z]/.test(line) && line === line.toUpperCase() && line.length <= 40;
      if (isHeading) {
        closeList();
        out.push(`<h2>${this.escape(line)}</h2>`);
      } else if (/^[-•*]\s+/.test(line)) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push(`<li>${this.escape(line.replace(/^[-•*]\s+/, ''))}</li>`);
      } else {
        closeList();
        out.push(`<p>${this.escape(line)}</p>`);
      }
    }
    closeList();
    return out.join('\n');
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private slug(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  private messageFor(err: any, fallback: string): string {
    if (err?.status === 503) return 'AI is not configured. Connect your API key in AI Settings.';
    return err?.error?.error ?? fallback;
  }
}
