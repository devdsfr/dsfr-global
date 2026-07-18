import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex">
      <aside class="w-64 shrink-0 border-r border-surface-border bg-surface-card flex flex-col">
        <div class="px-6 py-5 border-b border-surface-border">
          <span class="text-lg font-bold tracking-tight">DSFR <span class="text-brand">Global</span></span>
        </div>
        <nav class="flex-1 px-3 py-4 space-y-1">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-brand/10 text-brand"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              <span aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>
        <div class="px-3 py-4 border-t border-surface-border">
          <button (click)="logout()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5">
            Sign out
          </button>
        </div>
      </aside>
      <main class="flex-1 overflow-y-auto">
        <router-outlet />
      </main>
    </div>
  `
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'My Résumé', path: '/resume', icon: '📄' },
    { label: 'Target Job', path: '/job', icon: '🎯' },
    { label: 'Interviews', path: '/interviews', icon: '🎤' },
    { label: 'My Journey', path: '/journey', icon: '🧭' },
    { label: 'GAP Analysis', path: '/gap', icon: '📈' },
    { label: 'Coach', path: '/coach', icon: '🤖' }
  ];

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
