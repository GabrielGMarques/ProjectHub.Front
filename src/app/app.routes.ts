import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'auth/callback', loadComponent: () => import('./pages/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'gantt', loadComponent: () => import('./pages/gantt/gantt.component').then(m => m.GanttComponent), canActivate: [authGuard] },
  { path: 'burndown', loadComponent: () => import('./pages/burndown/burndown.component').then(m => m.BurndownComponent), canActivate: [authGuard] },
  { path: 'schedule', loadComponent: () => import('./pages/schedule/schedule.component').then(m => m.ScheduleComponent), canActivate: [authGuard] },
  { path: 'hr', loadComponent: () => import('./pages/hr/hr.component').then(m => m.HrComponent), canActivate: [authGuard] },
  { path: 'applications', loadComponent: () => import('./pages/applications/applications.component').then(m => m.ApplicationsComponent), canActivate: [authGuard] },
  { path: 'telemetry', loadComponent: () => import('./pages/telemetry/telemetry.component').then(m => m.TelemetryComponent), canActivate: [authGuard] },
  { path: 'company/:id', loadComponent: () => import('./pages/project-detail/project-detail.component').then(m => m.ProjectDetailComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '/dashboard' },
];
