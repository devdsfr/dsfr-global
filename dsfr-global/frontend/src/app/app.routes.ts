import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
      }
    ]
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'journey',
        loadComponent: () =>
          import('./features/journey/journey.component').then((m) => m.JourneyComponent)
      },
      {
        path: 'gap',
        loadComponent: () =>
          import('./features/gap-analysis/gap-analysis.component').then((m) => m.GapAnalysisComponent)
      },
      {
        path: 'interviews',
        loadComponent: () =>
          import('./features/interviews/interviews.component').then((m) => m.InterviewsComponent)
      },
      {
        path: 'coach',
        loadComponent: () =>
          import('./features/coach/coach.component').then((m) => m.CoachComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      // Unknown paths under the authenticated shell get a real 404 (with sidebar
      // still visible), instead of silently falling back to the dashboard content.
      {
        path: '**',
        loadComponent: () =>
          import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent)
      }
    ]
  },
  // Safety net for anything outside the shell's own matching (e.g. malformed URLs).
  { path: '**', redirectTo: 'dashboard' }
];
