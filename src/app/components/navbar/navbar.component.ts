import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <mat-toolbar color="primary">
      <span class="logo" routerLink="/">ProjectsHub</span>
      <span class="spacer"></span>
      @if (authService.isLoggedIn) {
        <button mat-button routerLink="/dashboard" routerLinkActive="active">
          <mat-icon>dashboard</mat-icon> Dashboard
        </button>
        <button mat-button routerLink="/gantt" routerLinkActive="active">
          <mat-icon>bar_chart</mat-icon> Gantt Chart
        </button>
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          @if (currentUser?.avatarUrl) {
            <img [src]="currentUser!.avatarUrl" class="avatar" alt="avatar" />
          } @else {
            <mat-icon>account_circle</mat-icon>
          }
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-info" mat-menu-item disabled>
            {{ currentUser?.displayName || currentUser?.username }}
          </div>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </mat-menu>
      } @else {
        <button mat-button routerLink="/login">
          <mat-icon>login</mat-icon> Login
        </button>
      }
    </mat-toolbar>
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    .logo { cursor: pointer; font-weight: 700; font-size: 1.2rem; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; }
    .active { background: rgba(255,255,255,0.1); }
    .user-info { font-size: 0.9rem; opacity: 0.8; }
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
