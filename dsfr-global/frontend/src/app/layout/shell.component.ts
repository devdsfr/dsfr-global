import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from '../core/services/auth.service';
import { LogoComponent } from '../shared/logo.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  template: `
    <a href="#main"
       class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
      Skip to content
    </a>

    <div class="min-h-screen lg:flex">
      <!-- Mobile top bar -->
      <div class="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-surface-border bg-surface-card px-4 py-3">
        <button type="button"
                class="rounded-lg p-2 text-gray-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                [attr.aria-expanded]="menuOpen()"
                aria-controls="sidebar"
                (click)="toggleMenu()">
          <span class="sr-only">{{ menuOpen() ? 'Close menu' : 'Open menu' }}</span>
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            @if (menuOpen()) {
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            } @else {
              <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round" />
            }
          </svg>
        </button>
        <app-logo [size]="24" wordmarkClass="text-base" />
      </div>

      <!-- Backdrop closes the drawer on mobile -->
      @if (menuOpen()) {
        <div class="fixed inset-0 z-30 bg-black/60 lg:hidden" (click)="closeMenu()" aria-hidden="true"></div>
      }

      <aside id="sidebar"
             class="fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-surface-border bg-surface-card transition-transform duration-200 lg:static lg:translate-x-0 motion-reduce:transition-none"
             [class]="menuOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'">
        <div class="hidden lg:block px-6 py-5 border-b border-surface-border">
          <a routerLink="/dashboard" class="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <span class="sr-only">DSFR Global — go to dashboard</span>
            <app-logo [size]="28" />
          </a>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-brand/10 text-brand"
              ariaCurrentWhenActive="page"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none"
            >
              <span aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>
        <div class="px-3 py-4 border-t border-surface-border">
          <button (click)="logout()"
                  class="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            Sign out
          </button>
        </div>
      </aside>

      <!-- min-w-0: a flex child defaults to min-width:auto, so wide content
           (long job titles, transcripts) pushes the layout past the viewport
           and shifts the sidebar off-screen. -->
      <main id="main" tabindex="-1" class="min-w-0 flex-1 overflow-x-hidden overflow-y-auto focus:outline-none">
        <router-outlet />
      </main>
    </div>
  `
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);

  readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'My Resume', path: '/resume', icon: '📄' },
    { label: 'Target Job', path: '/job', icon: '🎯' },
    { label: 'Resume Match', path: '/tailor', icon: '🧩' },
    { label: 'Interviews', path: '/interviews', icon: '🎤' },
    { label: 'Prep Pack', path: '/prep', icon: '📋' },
    { label: 'Debrief', path: '/debrief', icon: '📝' },
    { label: 'My Journey', path: '/journey', icon: '🧭' },
    { label: 'GAP Analysis', path: '/gap', icon: '📈' },
    { label: 'Coach', path: '/coach', icon: '🤖' },
    { label: 'AI Settings', path: '/ai-settings', icon: '⚙️' }
  ];

  constructor() {
    // Close the drawer after navigating, otherwise it stays over the new page.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
