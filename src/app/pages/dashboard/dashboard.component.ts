import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectCardComponent } from '../../components/project-card/project-card.component';
import { CreateProjectDialogComponent } from './create-project-dialog.component';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    ProjectCardComponent,
  ],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>My Projects</h1>
        <button mat-fab color="primary" (click)="openCreateDialog()" matTooltip="Add Project">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      @if (loading) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (projects.length === 0) {
        <div class="empty-state">
          <mat-icon>folder_open</mat-icon>
          <h2>No projects yet</h2>
          <p>Create your first project to get started!</p>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon> Create Project
          </button>
        </div>
      } @else {
        <div class="projects-grid">
          @for (project of projects; track project._id) {
            <app-project-card
              [project]="project"
              (onSave)="updateProject($event)"
              (onDelete)="deleteProject($event)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .dashboard-header h1 { margin: 0; font-size: 2rem; }
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 4rem;
    }
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: rgba(0,0,0,0.5);
    }
    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 1rem;
    }
  `],
})
export class DashboardComponent implements OnInit {
  projects: Project[] = [];
  loading = true;

  constructor(
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateProjectDialogComponent, { width: '500px' });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.projectService.create(result).subscribe({
          next: (project) => {
            this.projects.unshift(project);
            this.snackBar.open('Project created!', 'Close', { duration: 2000 });
          },
          error: () => this.snackBar.open('Failed to create project', 'Close', { duration: 3000 }),
        });
      }
    });
  }

  updateProject(data: Partial<Project>): void {
    if (!data._id) return;
    const { _id, ...updateData } = data;
    this.projectService.update(_id, updateData).subscribe({
      next: (updated) => {
        const idx = this.projects.findIndex((p) => p._id === _id);
        if (idx !== -1) this.projects[idx] = updated;
        this.snackBar.open('Project updated!', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update project', 'Close', { duration: 3000 }),
    });
  }

  deleteProject(id: string): void {
    this.projectService.delete(id).subscribe({
      next: () => {
        this.projects = this.projects.filter((p) => p._id !== id);
        this.snackBar.open('Project deleted', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to delete project', 'Close', { duration: 3000 }),
    });
  }
}
