import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">
            <span class="logo-icon">P</span>
          </div>
          <h1>Welcome to ProjectsHub</h1>
          <p class="subtitle">Manage and monitor all your projects in one place</p>
        </div>

        <div class="login-features">
          <div class="feature">
            <mat-icon>dashboard</mat-icon>
            <span>Project Dashboard</span>
          </div>
          <div class="feature">
            <mat-icon>bar_chart</mat-icon>
            <span>Time Allocation</span>
          </div>
          <div class="feature">
            <mat-icon>code</mat-icon>
            <span>GitHub Integration</span>
          </div>
        </div>

        <button class="github-btn" (click)="login()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Sign in with GitHub
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 80px);
      padding: 2rem;
    }
    .login-card {
      max-width: 420px;
      width: 100%;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg);
      padding: 3rem 2.5rem;
      box-shadow: var(--shadow-md);
      text-align: center;
    }
    .login-header {
      margin-bottom: 2rem;
    }
    .login-logo {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .logo-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      color: #0A0A0A;
      font-weight: 700;
      font-size: 1.5rem;
      border-radius: var(--radius-md);
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 0.5rem;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: var(--color-text-subtle);
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.5;
    }

    .login-features {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 2rem;
      text-align: left;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text);
    }
    .feature mat-icon {
      color: var(--color-primary);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .github-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 24px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-elevated, var(--color-bg-card));
      color: var(--color-text);
      font-family: var(--font-family);
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
    }
    .github-btn:hover {
      background: var(--color-primary);
      color: #0A0A0A;
      border-color: var(--color-primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  `],
})
export class LoginComponent {
  constructor(private authService: AuthService) {}

  login(): void {
    this.authService.loginWithGitHub();
  }
}
