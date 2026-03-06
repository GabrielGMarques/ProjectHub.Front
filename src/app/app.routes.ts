import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'auth/callback', loadComponent: () => import('./pages/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'gantt', loadComponent: () => import('./pages/gantt/gantt.component').then(m => m.GanttComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '/dashboard' },
];
