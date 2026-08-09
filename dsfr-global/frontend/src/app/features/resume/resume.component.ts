import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PracticeService } from '../../core/services/practice.service';

/**
 * Text extractors are pulled from a CDN at click time rather than bundled:
 * they are only needed when the user actually uploads a file, and keeping them
 * out of package.json keeps the app bundle small.
 */
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAMMOTH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

@Component({
  selector: 'app-resume',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="p-8 max-w-4xl mx-auto">
      <header class="mb-8">
        <h1 class="text-2xl font-bold">My CV</h1>
        <p class="text-gray-400 mt-1">
          Upload your CV and we'll fill your profile automatically — or paste it below.
          The AI uses it to personalize your interview practice.
        </p>
      </header>

      <!-- Upload -->
      <div class="card mb-6 border-dashed">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1">
            <p class="font-medium text-sm mb-1">📄 Upload your CV</p>
            <p class="text-xs text-gray-500">
              PDF, Word (.docx) or plain text. We read the text in your browser — the file itself
              is never uploaded anywhere.
            </p>
          </div>
          <label class="btn-primary shrink-0 cursor-pointer text-center"
                 [class.opacity-50]="parsing()">
            {{ parsing() ? 'Reading…' : 'Choose file' }}
            <input type="file" class="hidden" accept=".pdf,.docx,.txt,.md"
                   [disabled]="parsing()" (change)="onFileSelected($event)" />
          </label>
        </div>

        @if (fileName()) {
          <p class="text-sm text-emerald-400 mt-3">
            ✓ {{ fileName() }} — {{ charCount() }} characters extracted. Review below and save.
          </p>
        }
        @if (parseError()) {
          <p class="text-sm text-red-400 mt-3">{{ parseError() }}</p>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="card space-y-5">
        <div>
          <label class="label" for="headline">Headline</label>
          <input id="headline" type="text" class="input" formControlName="headline"
                 placeholder="e.g. Backend Developer — Java / Spring Boot" />
        </div>
        <div>
          <label class="label" for="raw_text">CV text</label>
          <textarea id="raw_text" rows="14" class="input font-mono text-xs leading-relaxed"
                    formControlName="raw_text"
                    placeholder="Paste your full CV here (experience, skills, projects) or use the upload above..."></textarea>
          <p class="text-xs text-gray-500 mt-1.5">Minimum 50 characters. Any language is fine — practice output is always in English.</p>
        </div>

        @if (error()) {
          <p class="text-red-400 text-sm">{{ error() }}</p>
        }
        @if (saved()) {
          <p class="text-emerald-400 text-sm">CV saved ✓</p>
        }

        <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
          {{ saving() ? 'Saving…' : 'Save my CV' }}
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

  readonly parsing = signal(false);
  readonly parseError = signal<string | null>(null);
  readonly fileName = signal<string | null>(null);
  readonly charCount = signal(0);

  readonly form = this.fb.nonNullable.group({
    headline: ['', [Validators.maxLength(160)]],
    raw_text: ['', [Validators.required, Validators.minLength(50)]]
  });

  ngOnInit(): void {
    this.practice.getResume().subscribe({
      next: (r) => this.form.patchValue({ headline: r.headline, raw_text: r.raw_text }),
      error: () => void 0 // 404 = no CV yet, that's fine
    });
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    this.parsing.set(true);
    this.parseError.set(null);
    this.fileName.set(null);
    this.saved.set(false);

    try {
      const text = await this.extractText(file);
      const clean = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (clean.length < 50) {
        throw new Error(
          'Could not read enough text from this file. If it is a scanned PDF (an image), paste the text manually.'
        );
      }
      this.form.patchValue({ raw_text: clean });
      if (!this.form.getRawValue().headline) {
        const guess = this.guessHeadline(clean);
        if (guess) this.form.patchValue({ headline: guess });
      }
      this.fileName.set(file.name);
      this.charCount.set(clean.length);
    } catch (err: unknown) {
      this.parseError.set(err instanceof Error ? err.message : 'Could not read this file.');
    } finally {
      this.parsing.set(false);
      input.value = ''; // let the user re-pick the same file
    }
  }

  private async extractText(file: File): Promise<string> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return this.extractPdf(file);
    if (name.endsWith('.docx')) return this.extractDocx(file);
    if (name.endsWith('.txt') || name.endsWith('.md')) return file.text();
    if (name.endsWith('.doc')) {
      throw new Error('Old .doc files are not supported — save it as .docx or PDF and try again.');
    }
    throw new Error('Unsupported file type. Use PDF, .docx or a text file.');
  }

  private async extractPdf(file: File): Promise<string> {
    await this.loadScript(PDFJS_URL);
    const pdfjs = (window as any).pdfjsLib;
    if (!pdfjs) throw new Error('Could not load the PDF reader. Check your connection and try again.');
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push((content.items as any[]).map((item) => item.str ?? '').join(' '));
    }
    return pages.join('\n\n');
  }

  private async extractDocx(file: File): Promise<string> {
    await this.loadScript(MAMMOTH_URL);
    const mammoth = (window as any).mammoth;
    if (!mammoth) throw new Error('Could not load the Word reader. Check your connection and try again.');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result?.value ?? '';
  }

  /** Loads a script once and resolves when it is ready. */
  private loadScript(src: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset['loaded'] === 'true') {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load resource.')));
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load resource.'));
      document.head.appendChild(script);
    });
  }

  /**
   * Best-effort headline: the first short line that reads like a title rather
   * than contact details. The user can always edit it.
   */
  private guessHeadline(text: string): string {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 8)) {
      const looksLikeContact = /@|https?:|\+?\d[\d\s()-]{7,}|linkedin|github/i.test(line);
      if (!looksLikeContact && line.length >= 8 && line.length <= 90) {
        return line;
      }
    }
    return '';
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
