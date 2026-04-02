import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
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
    DragDropModule,
    ProjectCardComponent,
  ],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <div>
          <h1>My Companies</h1>
          <p class="subtitle">{{ projects.length }} company{{ projects.length !== 1 ? 'ies' : '' }} in your hub</p>
        </div>
        <button class="add-btn" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          New Company
        </button>
      </div>

      @if (!loading && projects.length > 0) {
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-label">Total MRR</span>
            <span class="stat-value">\${{ totalMrr | number }}</span>
          </div>
          <div class="stat-card highlight">
            <span class="stat-label">Predicted Yearly</span>
            <span class="stat-value">\${{ totalMrr * 12 | number }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Clients</span>
            <span class="stat-value">{{ totalClients }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Hours / Week</span>
            <span class="stat-value">{{ totalHours }}h</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Companies</span>
            <span class="stat-value">{{ projects.length }}</span>
          </div>
        </div>
      }

      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (projects.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <mat-icon>folder_open</mat-icon>
          </div>
          <h2>No companies yet</h2>
          <p>Create your first company to get started!</p>
          <button class="add-btn" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Create Company
          </button>
        </div>
      } @else {
        <div class="projects-grid" cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="drop($event)">
          @for (project of projects; track project._id) {
            <div cdkDrag [cdkDragDisabled]="lockedCards.has(project._id!)" class="drag-item">
              <div class="drag-placeholder" *cdkDragPlaceholder></div>
              <app-project-card
                [project]="project"
                (onSave)="updateProject($event)"
                (onDelete)="deleteProject($event)"
                (onLock)="setCardLock(project._id!, $event)"
              />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 0 24px 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-top: 0.5rem;
    }
    .dashboard-header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 4px 0 0;
      font-size: 0.9rem;
      color: var(--color-text-subtle);
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--color-primary);
      color: white;
      font-family: var(--font-family);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
    }
    .add-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .add-btn:hover {
      background: var(--color-primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 20px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-subtle);
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: -0.02em;
    }
    .stat-card.highlight {
      border-color: var(--color-primary);
      background: rgba(212, 175, 55, 0.06);
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
      grid-auto-rows: 1fr;
    }

    .drag-item {
      display: flex;
    }
    .cdk-drag-preview {
      opacity: 0.9;
      box-shadow: var(--shadow-lg);
      border-radius: var(--radius-md);
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .drag-placeholder {
      background: var(--color-border-light);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-md);
      min-height: 200px;
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 4rem;
    }

    .empty-state {
      text-align: center;
      padding: 5rem 2rem;
    }
    .empty-icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-border-light);
      border-radius: var(--radius-md);
    }
    .empty-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--color-text-subtle);
    }
    .empty-state h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .empty-state p {
      margin: 0 0 1.5rem;
      color: var(--color-text-subtle);
      font-size: 0.95rem;
    }
  `],
})
export class DashboardComponent implements OnInit {
  projects: Project[] = [];
  loading = true;
  lockedCards = new Set<string>();

  setCardLock(id: string, locked: boolean): void {
    if (locked) {
      this.lockedCards.add(id);
    } else {
      this.lockedCards.delete(id);
    }
  }

  get totalMrr(): number {
    return this.projects.reduce((sum, p) => sum + (p.mrr || 0), 0);
  }
  get totalClients(): number {
    return this.projects.reduce((sum, p) => sum + (p.clientCount || 0), 0);
  }
  get totalHours(): number {
    return this.projects.reduce((sum, p) => {
      const s = p.schedule;
      if (!s) return sum;
      return sum + (s.monday || 0) + (s.tuesday || 0) + (s.wednesday || 0)
        + (s.thursday || 0) + (s.friday || 0) + (s.saturday || 0) + (s.sunday || 0);
    }, 0);
  }

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
        this.snackBar.open('Failed to load companies', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  drop(event: CdkDragDrop<Project[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.projects, event.previousIndex, event.currentIndex);
    const projectIds = this.projects.map(p => p._id!);
    this.projectService.reorder(projectIds).subscribe({
      error: () => this.snackBar.open('Failed to save order', 'Close', { duration: 3000 }),
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateProjectDialogComponent, {
      width: '500px',
      panelClass: 'custom-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.projectService.create(result).subscribe({
          next: (project) => {
            this.projects.unshift(project);
            this.snackBar.open('Company created!', 'Close', { duration: 2000 });
          },
          error: () => this.snackBar.open('Failed to create company', 'Close', { duration: 3000 }),
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
        this.snackBar.open('Company updated!', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update company', 'Close', { duration: 3000 }),
    });
  }

  deleteProject(id: string): void {
    this.projectService.delete(id).subscribe({
      next: () => {
        this.projects = this.projects.filter((p) => p._id !== id);
        this.snackBar.open('Company deleted', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to delete company', 'Close', { duration: 3000 }),
    });
  }
}
