import { Component, input } from '@angular/core';

/**
 * The DSFR Global mark: a globe crossed by a rising line — international reach
 * plus career growth, the two ideas the product is built on.
 *
 * Inline SVG rather than an <img> so it inherits the current text colour,
 * stays crisp at any size and costs no extra request.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-2.5">
      <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32"
           fill="none" aria-hidden="true" class="shrink-0">
        <!-- Globe -->
        <circle cx="16" cy="16" r="12.5" class="stroke-gray-500" stroke-width="1.5" />
        <ellipse cx="16" cy="16" rx="5.2" ry="12.5" class="stroke-gray-500" stroke-width="1.25" />
        <path d="M4.2 12.2h23.6M4.2 19.8h23.6" class="stroke-gray-500" stroke-width="1.25" />
        <!-- Ascent -->
        <path d="M7.5 21.5 13 15.5l3.6 3.4L24.5 10"
              class="stroke-brand" stroke-width="2.75"
              stroke-linecap="round" stroke-linejoin="round" />
        <path d="M19.8 10h4.7v4.7" class="stroke-brand" stroke-width="2.75"
              stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      @if (showWordmark()) {
        <span class="font-bold tracking-tight" [class]="wordmarkClass()">
          DSFR <span class="text-brand">Global</span>
        </span>
      }
    </span>
  `
})
export class LogoComponent {
  readonly size = input(28);
  readonly showWordmark = input(true);
  readonly wordmarkClass = input('text-lg');
}
