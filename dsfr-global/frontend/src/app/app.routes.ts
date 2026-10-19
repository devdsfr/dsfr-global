import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

// Every route carries a title so the browser tab, history entries and screen
// readers identify the page instead of repeating the app name everywhere.
const APP = 'DSFR Global';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        title: `Sign in · ${APP}`,
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent)
      },
      {
        path: 'register',
        title: `Create account · ${APP}`,
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
        title: `Dashboard · ${APP}`,
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'resume',
        title: `My Resume · ${APP}`,
        loadComponent: () =>
          import('./features/resume/resume.component').then((m) => m.ResumeComponent)
      },
      {
        path: 'job',
        title: `Target Jobs · ${APP}`,
        loadComponent: () =>
          import('./features/job/job.component').then((m) => m.JobComponent)
      },
      {
        path: 'ai-settings',
        title: `AI Settings · ${APP}`,
        loadComponent: () =>
          import('./features/ai-settings/ai-settings.component').then((m) => m.AiSettingsComponent)
      },
      {
        path: 'prep',
        title: `Prep Pack · ${APP}`,
        loadComponent: () =>
          import('./features/prep/prep.component').then((m) => m.PrepComponent)
      },
      {
        path: 'debrief',
        title: `Debrief · ${APP}`,
        loadComponent: () =>
          import('./features/debrief/debrief.component').then((m) => m.DebriefComponent)
      },
      {
        path: 'interviews',
        title: `Interviews · ${APP}`,
        loadComponent: () =>
          import('./features/interviews/interviews.component').then((m) => m.InterviewsComponent)
      },
      {
        path: 'journey',
        title: `My Journey · ${APP}`,
        loadComponent: () =>
          import('./features/journey/journey.component').then((m) => m.JourneyComponent)
      },
      {
        path: 'gap',
        title: `GAP Analysis · ${APP}`,
        loadComponent: () =>
          import('./features/gap-analysis/gap-analysis.component').then((m) => m.GapAnalysisComponent)
      },
      {
        path: 'coach',
        title: `Coach · ${APP}`,
        loadComponent: () =>
          import('./features/coach/coach.component').then((m) => m.CoachComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      // Unknown paths under the authenticated shell get a real 404 (with sidebar
      // still visible), instead of silently falling back to the dashboard content.
      {
        path: '**',
        title: `Page not found · ${APP}`,
        loadComponent: () =>
          import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent)
      }
    ]
  },
  // Safety net for anything outside the shell's own matching (e.g. malformed URLs).
  { path: '**', redirectTo: 'dashboard' }
];
