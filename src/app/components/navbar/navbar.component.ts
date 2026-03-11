import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <nav class="navbar">
      <div class="navbar-inner">
        <a class="logo" routerLink="/">
          <span class="logo-icon">P</span>
          ProjectsHub
        </a>
        <span class="spacer"></span>
        @if (authService.isLoggedIn) {
          <div class="nav-links">
            <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">
              <mat-icon>dashboard</mat-icon>
              <span>Dashboard</span>
            </a>
            <a class="nav-link" routerLink="/gantt" routerLinkActive="active">
              <mat-icon>bar_chart</mat-icon>
              <span>Time Chart</span>
            </a>
            <a class="nav-link" routerLink="/burndown" routerLinkActive="active">
              <mat-icon>checklist</mat-icon>
              <span>Burndown</span>
            </a>
            <a class="nav-link" routerLink="/schedule" routerLinkActive="active">
              <mat-icon>calendar_month</mat-icon>
              <span>Schedule</span>
            </a>
          </div>
          <button class="avatar-btn" [matMenuTriggerFor]="userMenu">
            @if (currentUser?.avatarUrl) {
              <img [src]="currentUser!.avatarUrl" class="avatar" alt="avatar" />
            } @else {
              <div class="avatar-placeholder">
                {{ (currentUser?.username || 'U')[0] | uppercase }}
              </div>
            }
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="menu-user-info" mat-menu-item disabled>
              <strong>{{ currentUser?.displayName || currentUser?.username }}</strong>
            </div>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Sign Out
            </button>
          </mat-menu>
        } @else {
          <a class="nav-link login-link" routerLink="/login">
            <mat-icon>login</mat-icon>
            <span>Login</span>
          </a>
        }
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 12px 24px;
      background: var(--color-bg);
    }
    .navbar-inner {
      display: flex;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: 8px 20px;
      box-shadow: var(--shadow-sm);
    }
    .spacer { flex: 1 1 auto; }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.15rem;
      color: var(--color-text);
      text-decoration: none;
      letter-spacing: -0.02em;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      color: #0A0A0A;
      font-weight: 700;
      font-size: 0.9rem;
      border-radius: var(--radius-sm);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: 12px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-subtle);
      cursor: pointer;
      transition: all var(--transition);
      text-decoration: none;
      border: none;
      background: none;
    }
    .nav-link mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .nav-link:hover {
      color: var(--color-primary);
      background: var(--color-border-light);
    }
    .nav-link.active {
      color: var(--color-primary);
      background: var(--color-border-light);
      font-weight: 600;
    }
    .login-link {
      color: var(--color-primary);
      font-weight: 600;
    }

    .avatar-btn {
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      border-radius: 50%;
      transition: box-shadow var(--transition);
    }
    .avatar-btn:hover { box-shadow: 0 0 0 3px var(--color-border); }
    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--color-border);
    }
    .avatar-placeholder {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #0A0A0A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .menu-user-info {
      font-size: 0.9rem;
      color: var(--color-text);
    }
  `],
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn) {
      this.authService.getProfile().subscribe({
        next: (user) => (this.currentUser = user),
      });
    }
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
