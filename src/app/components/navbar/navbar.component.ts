import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
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
        @if (currentProjectName) {
          <div class="project-indicator">
            <mat-icon class="pi-sep">chevron_right</mat-icon>
            <a class="pi-name" [routerLink]="['/project', currentProjectId]">{{ currentProjectName }}</a>
          </div>
        }
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
            <a class="nav-link" routerLink="/hr" routerLinkActive="active">
              <mat-icon>groups</mat-icon>
              <span>HR</span>
            </a>
            <a class="nav-link" routerLink="/telemetry" routerLinkActive="active">
              <mat-icon>monitoring</mat-icon>
              <span>Telemetry</span>
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

    .project-indicator {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 4px;
      overflow: hidden;
    }
    .pi-sep {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-text-subtle);
      opacity: 0.5;
      flex-shrink: 0;
    }
    .pi-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .pi-name:hover { opacity: 0.8; }

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
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  currentProjectName = '';
  currentProjectId = '';
  private routerSub!: Subscription;

  constructor(
    public authService: AuthService,
    private router: Router,
    private projectService: ProjectService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn) {
      this.authService.getProfile().subscribe({
        next: (user) => (this.currentUser = user),
      });
    }

    // Watch route changes to detect project pages
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe((e) => this.checkProjectRoute(e.urlAfterRedirects));

    // Check initial route
    this.checkProjectRoute(this.router.url);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private checkProjectRoute(url: string): void {
    const match = url.match(/\/project\/([a-f0-9]+)/);
    if (match) {
      const id = match[1];
      if (id !== this.currentProjectId) {
        this.currentProjectId = id;
        this.currentProjectName = '';
        this.projectService.getById(id).subscribe({
          next: (p) => this.currentProjectName = p.name,
          error: () => this.currentProjectName = '',
        });
      }
    } else {
      this.currentProjectId = '';
      this.currentProjectName = '';
    }
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }
}
