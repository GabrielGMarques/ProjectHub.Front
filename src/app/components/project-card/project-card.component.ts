import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOptionModule } from '@angular/material/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatOptionModule,
  ],
  template: `
    <mat-card class="project-card" [class.editing]="isEditing">
      @if (project.backgroundImage) {
        <div class="card-bg" [style.backgroundImage]="'url(' + project.backgroundImage + ')'"></div>
      }
      <mat-card-header>
        @if (isEditing) {
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Project Name</mat-label>
            <input matInput [formControl]="$any(form.controls['name'])" />
          </mat-form-field>
        } @else {
          <mat-card-title>{{ project.name }}</mat-card-title>
        }
        <div class="card-actions">
          <button mat-icon-button (click)="toggleEdit()" [matTooltip]="isEditing ? 'Save' : 'Edit'">
            <mat-icon>{{ isEditing ? 'check' : 'edit' }}</mat-icon>
          </button>
          <button mat-icon-button color="warn" (click)="onDelete.emit(project._id!)" matTooltip="Delete">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </mat-card-header>

      <mat-card-content>
        @if (isEditing) {
          <form [formGroup]="form" class="edit-form">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3"></textarea>
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Background Image URL</mat-label>
              <input matInput formControlName="backgroundImage" />
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>MRR ($)</mat-label>
                <input matInput type="number" formControlName="mrr" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Clients</mat-label>
                <input matInput type="number" formControlName="clientCount" />
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Impact</mat-label>
                <mat-select formControlName="impact">
                  <mat-option value="low">Low</mat-option>
                  <mat-option value="medium">Medium</mat-option>
                  <mat-option value="high">High</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hours/Week</mat-label>
                <input matInput type="number" formControlName="timeConsumption" />
              </mat-form-field>
            </div>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Niche</mat-label>
              <input matInput formControlName="niche" />
            </mat-form-field>
          </form>
        } @else {
          <p class="description">{{ project.description || 'No description' }}</p>

          <div class="metrics">
            <div class="metric">
              <span class="metric-label">MRR</span>
              <span class="metric-value">\${{ project.mrr | number }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Clients</span>
              <span class="metric-value">{{ project.clientCount }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Impact</span>
              <span class="metric-value impact-{{ project.impact }}">{{ project.impact }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Hours/Week</span>
              <span class="metric-value">{{ project.timeConsumption }}h</span>
            </div>
          </div>

          @if (project.niche) {
            <div class="niche">
              <mat-icon>category</mat-icon>
              <span>{{ project.niche }}</span>
            </div>
          }

          @if (project.githubRepos.length > 0) {
            <div class="repos">
              <mat-icon>code</mat-icon>
              <mat-chip-set>
                @for (repo of project.githubRepos; track repo) {
                  <mat-chip>{{ repo }}</mat-chip>
                }
              </mat-chip-set>
            </div>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .project-card {
      position: relative;
      overflow: hidden;
      transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    }
    .card-bg {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 120px;
      background-size: cover;
      background-position: center;
      opacity: 0.15;
    }
    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
      z-index: 1;
    }
    .card-actions {
      display: flex;
      gap: 4px;
      margin-left: auto;
    }
    mat-card-content { position: relative; z-index: 1; }
    .full-width { width: 100%; }
    .edit-form { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row mat-form-field { flex: 1; }
    .description {
      color: rgba(0,0,0,0.6);
      margin-bottom: 1rem;
      line-height: 1.5;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .metric {
      display: flex;
      flex-direction: column;
    }
    .metric-label {
      font-size: 0.75rem;
      color: rgba(0,0,0,0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value { font-size: 1.1rem; font-weight: 600; }
    .impact-low { color: #4caf50; }
    .impact-medium { color: #ff9800; }
    .impact-high { color: #f44336; }
    .niche, .repos {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .niche mat-icon, .repos mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(0,0,0,0.5);
    }
  `],
})
export class ProjectCardComponent implements OnInit {
  @Input() project!: Project;
  @Output() onSave = new EventEmitter<Partial<Project>>();
  @Output() onDelete = new EventEmitter<string>();

  isEditing = false;
  form!: FormGroup;
  private saveSubject = new Subject<Partial<Project>>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.project.name],
      description: [this.project.description],
      backgroundImage: [this.project.backgroundImage],
      mrr: [this.project.mrr],
      clientCount: [this.project.clientCount],
      impact: [this.project.impact],
      niche: [this.project.niche],
      timeConsumption: [this.project.timeConsumption],
    });

    this.saveSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((data) => {
      this.onSave.emit({ _id: this.project._id, ...data });
    });
  }

  toggleEdit(): void {
    if (this.isEditing) {
      const formValue = this.form.value;
      this.onSave.emit({ _id: this.project._id, ...formValue });
      Object.assign(this.project, formValue);
    }
    this.isEditing = !this.isEditing;
  }
}
