import { Component, computed, input, signal } from '@angular/core';

import { PracticeSession } from '../../core/models/practice.model';

interface DayCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  sessions: PracticeSession[];
}

/**
 * Month view of practice activity. Each day carries a badge with how many
 * sessions were trained, and hovering (or focusing) a day reveals which job
 * was practised — the point is answering "did I train today, and for what?"
 * at a glance.
 */
@Component({
  selector: 'app-activity-calendar',
  standalone: true,
  template: `
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-semibold">Practice calendar</h2>
      <div class="flex items-center gap-1">
        <button type="button" class="rounded-lg px-2 py-1 text-gray-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                (click)="shiftMonth(-1)" aria-label="Previous month">←</button>
        <span class="text-sm text-gray-300 w-32 text-center">{{ monthLabel() }}</span>
        <button type="button" class="rounded-lg px-2 py-1 text-gray-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                (click)="shiftMonth(1)" aria-label="Next month">→</button>
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1 mb-1">
      @for (name of weekdays; track name) {
        <div class="text-center text-xs text-gray-400 py-1">{{ name }}</div>
      }
    </div>

    <div class="grid grid-cols-7 gap-1">
      @for (cell of cells(); track cell.key) {
        <div class="aspect-square rounded-lg border text-center flex flex-col items-center justify-center"
             [class]="cellClass(cell)"
             [attr.tabindex]="cell.sessions.length ? 0 : null"
             [attr.title]="cell.sessions.length ? tooltip(cell) : null"
             (mouseenter)="hovered.set(cell)"
             (mouseleave)="hovered.set(null)"
             (focus)="hovered.set(cell)"
             (blur)="hovered.set(null)">
          <span class="text-xs" [class]="cell.inMonth ? 'text-gray-300' : 'text-gray-400/40'">
            {{ cell.day }}
          </span>
          @if (cell.sessions.length) {
            <span class="mt-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
              {{ cell.sessions.length }}
            </span>
          }
        </div>
      }
    </div>

    <div class="mt-4 min-h-[3.25rem]" aria-live="polite">
      @if (hovered(); as cell) {
        @if (cell.sessions.length) {
          <div class="rounded-lg border border-surface-border bg-black/30 p-3">
            <p class="text-xs uppercase tracking-wider text-gray-400 mb-2">{{ cell.key }}</p>
            @for (s of cell.sessions; track s.id) {
              <p class="text-sm text-gray-300">
                {{ s.job_title || 'Practice session' }}
                <span class="text-gray-400">· {{ s.answers }} answers · {{ s.score }}/100</span>
              </p>
            }
          </div>
        }
      } @else if (!hasAny()) {
        <p class="text-sm text-gray-400">No sessions recorded yet — finish an interview and it shows up here.</p>
      }
    </div>
  `
})
export class ActivityCalendarComponent {
  readonly sessions = input<PracticeSession[]>([]);

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /** Offset in months from the current month; 0 = today's month. */
  private readonly monthOffset = signal(0);
  readonly hovered = signal<DayCell | null>(null);

  readonly hasAny = computed(() => this.sessions().length > 0);

  private readonly viewDate = computed(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + this.monthOffset(), 1);
  });

  readonly monthLabel = computed(() =>
    this.viewDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );

  /** Sessions bucketed by local calendar day, so timezone never shifts a day. */
  private readonly byDay = computed(() => {
    const map = new Map<string, PracticeSession[]>();
    for (const session of this.sessions()) {
      const key = this.dayKey(new Date(session.created_at));
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  });

  readonly cells = computed<DayCell[]>(() => {
    const first = this.viewDate();
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const todayKey = this.dayKey(new Date());
    const out: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = this.dayKey(date);
      out.push({
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === first.getMonth(),
        isToday: key === todayKey,
        sessions: this.byDay().get(key) ?? []
      });
    }
    return out;
  });

  cellClass(cell: DayCell): string {
    if (cell.sessions.length) {
      return 'border-brand/60 bg-brand/10 cursor-pointer';
    }
    if (cell.isToday) {
      return 'border-gray-500/60 bg-transparent';
    }
    return 'border-surface-border bg-transparent';
  }

  tooltip(cell: DayCell): string {
    return cell.sessions
      .map((s) => `${s.job_title || 'Practice session'} — ${s.score}/100`)
      .join('\n');
  }

  shiftMonth(delta: number): void {
    this.hovered.set(null);
    this.monthOffset.update((v) => v + delta);
  }

  private dayKey(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
