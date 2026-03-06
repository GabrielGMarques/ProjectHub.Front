import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Welcome to ProjectsHub</mat-card-title>
          <mat-card-subtitle>Manage and monitor your projects in one place</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Sign in with your GitHub account to get started.</p>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-raised-button color="primary" (click)="login()">
            <mat-icon>code</mat-icon>
            Sign in with GitHub
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    .login-card {
      max-width: 400px;
      width: 100%;
      padding: 2rem;
    }
    mat-card-content { margin: 1.5rem 0; }
  `],
})
export class LoginComponent {
  constructor(private authService: AuthService) {}

  login(): void {
    this.authService.loginWithGitHub();
  }
}
