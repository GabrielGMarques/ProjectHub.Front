import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Project, Todo } from '../../models/project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    MatCheckboxModule,
    CdkDragHandle,
    RouterModule,
  ],
  template: `
    <div class="card" [class.editing]="isEditing" [class.expanded]="expanded">
      @if (project.backgroundImage) {
        <div class="card-bg" [style.backgroundImage]="'url(' + project.backgroundImage + ')'"></div>
      }

      <div class="card-header">
        @if (!isEditing) {
          <div class="drag-handle" cdkDragHandle>
            <mat-icon>drag_indicator</mat-icon>
          </div>
        }
        @if (isEditing) {
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Company Name</mat-label>
            <input matInput [formControl]="$any(form.controls['name'])" />
          </mat-form-field>
        } @else {
          <h3 class="card-title">{{ project.name }}</h3>
        }
        <div class="card-actions">
          <a class="icon-btn" [routerLink]="['/company', project._id]" matTooltip="View Details">
            <mat-icon>open_in_new</mat-icon>
          </a>
          <button class="icon-btn" (click)="toggleExpand()" [matTooltip]="expanded ? 'Collapse' : 'Expand'">
            <mat-icon>{{ expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
          <button class="icon-btn" (click)="toggleEdit()" [matTooltip]="isEditing ? 'Save' : 'Edit'">
            <mat-icon>{{ isEditing ? 'check' : 'edit' }}</mat-icon>
          </button>
          <button class="icon-btn danger" (click)="onDelete.emit(project._id!)" matTooltip="Delete">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <div class="card-body">
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
            </div>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Niche</mat-label>
              <input matInput formControlName="niche" />
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Monetization Plan</mat-label>
              <textarea matInput formControlName="monetizationPlan" rows="4"
                placeholder="How will this company generate revenue?"></textarea>
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
              <span class="metric-value">{{ weeklyHours }}h</span>
            </div>
          </div>

          @if (project.niche) {
            <div class="tag-row">
              <span class="tag">
                <mat-icon>category</mat-icon>
                {{ project.niche }}
              </span>
            </div>
          }

          @if (project.githubRepos.length > 0) {
            <div class="repos">
              <mat-chip-set>
                @for (repo of project.githubRepos; track repo) {
                  <mat-chip>{{ repo }}</mat-chip>
                }
              </mat-chip-set>
            </div>
          }

          <!-- Expanded sections: Todos + Monetization -->
          @if (expanded) {
            <div class="section-divider"></div>

            <!-- Todo List -->
            <div class="section">
              <div class="section-header">
                <span class="section-title">
                  <mat-icon>checklist</mat-icon>
                  To-Do List
                </span>
                <span class="todo-count">{{ doneCount }}/{{ project.todos.length }}</span>
              </div>

              @if (project.todos.length > 0) {
                <div class="todo-progress">
                  <div class="todo-progress-bar" [style.width.%]="progressPercent"></div>
                </div>
              }

              <div class="todo-list">
                @for (todo of project.todos; track $index) {
                  <div class="todo-item" [class.done]="todo.done">
                    <mat-checkbox
                      [checked]="todo.done"
                      (change)="toggleTodo($index)"
                      color="primary">
                    </mat-checkbox>
                    <span class="todo-text">{{ todo.text }}</span>
                    <button class="icon-btn-sm" (click)="removeTodo($index)" matTooltip="Remove">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <div class="add-todo">
                <input
                  class="todo-input"
                  [(ngModel)]="newTodoText"
                  placeholder="Add a task..."
                  (keydown.enter)="addTodo()"
                />
                <button class="icon-btn-sm add" (click)="addTodo()" [disabled]="!newTodoText.trim()" matTooltip="Add">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
            </div>

            <!-- Monetization Plan -->
            <div class="section">
              <div class="section-header">
                <span class="section-title">
                  <mat-icon>attach_money</mat-icon>
                  Monetization Plan
                </span>
              </div>
              @if (project.monetizationPlan) {
                <p class="plan-text">{{ project.monetizationPlan }}</p>
              } @else {
                <p class="plan-empty">No monetization plan yet. Click edit to add one.</p>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      height: 100%;
    }
    .card {
      position: relative;
      overflow: hidden;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      transition: all var(--transition);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .card:hover {
      border-color: var(--color-border);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }
    .card.editing, .card.expanded {
      cursor: default;
    }
    .card.editing {
      border-color: var(--color-primary-light);
    }
    .card-bg {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 100px;
      background-size: cover;
      background-position: center;
      opacity: 0.08;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
      z-index: 1;
      margin-bottom: 0.75rem;
    }
    .drag-handle {
      cursor: grab;
      color: var(--color-text-subtle);
      display: flex;
      align-items: center;
      margin-right: 4px;
      opacity: 0;
      transition: opacity var(--transition);
    }
    .card:hover .drag-handle { opacity: 1; }
    .drag-handle:active { cursor: grabbing; }
    .drag-handle mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .card-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    .card-actions {
      display: flex;
      gap: 2px;
      margin-left: 8px;
      flex-shrink: 0;
    }
    .icon-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      border-radius: var(--radius-sm);
      color: var(--color-text-subtle);
      cursor: pointer;
      transition: all var(--transition);
    }
    .icon-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .icon-btn:hover {
      background: var(--color-border-light);
      color: var(--color-primary);
    }
    .icon-btn.danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-danger);
    }

    .card-body { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }
    .full-width { width: 100%; }
    .edit-form { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row mat-form-field { flex: 1; }

    .description {
      color: var(--color-text-subtle);
      margin: 0 0 1rem;
      line-height: 1.6;
      font-size: 0.9rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 1rem;
    }
    .metric {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      background: var(--color-bg);
      border-radius: var(--radius-sm);
    }
    .metric-label {
      font-size: 0.7rem;
      color: var(--color-text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .metric-value {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .impact-low { color: var(--color-success) !important; }
    .impact-medium { color: var(--color-warning) !important; }
    .impact-high { color: var(--color-danger) !important; }

    .tag-row { margin-top: 0.5rem; }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--color-border-light);
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }
    .tag mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .repos { margin-top: 0.75rem; }

    /* Expanded sections */
    .section-divider {
      height: 1px;
      background: var(--color-border-light);
      margin: 1rem 0;
    }
    .section {
      margin-bottom: 1rem;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--color-text);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .section-title mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-primary);
    }
    .todo-count {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text-subtle);
    }

    .todo-progress {
      height: 4px;
      background: var(--color-border-light);
      border-radius: 100px;
      margin-bottom: 0.75rem;
      overflow: hidden;
    }
    .todo-progress-bar {
      height: 100%;
      background: var(--color-primary);
      border-radius: 100px;
      transition: width 0.3s ease;
    }

    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .todo-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
      border-radius: var(--radius-sm);
    }
    .todo-item.done .todo-text {
      text-decoration: line-through;
      color: var(--color-text-subtle);
    }
    .todo-text {
      flex: 1;
      font-size: 0.88rem;
      color: var(--color-text);
    }
    .icon-btn-sm {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      border-radius: 4px;
      color: var(--color-text-subtle);
      cursor: pointer;
      transition: all var(--transition);
      opacity: 0;
    }
    .todo-item:hover .icon-btn-sm,
    .add-todo .icon-btn-sm { opacity: 1; }
    .icon-btn-sm mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .icon-btn-sm:hover {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-danger);
    }
    .icon-btn-sm.add {
      opacity: 1;
      color: var(--color-primary);
    }
    .icon-btn-sm.add:hover {
      background: rgba(212, 175, 55, 0.15);
      color: var(--color-primary);
    }
    .icon-btn-sm:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .add-todo {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
    }
    .todo-input {
      flex: 1;
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-family);
      font-size: 0.85rem;
      outline: none;
      transition: border-color var(--transition);
    }
    .todo-input::placeholder { color: var(--color-text-subtle); }
    .todo-input:focus { border-color: var(--color-primary); }

    .plan-text {
      font-size: 0.88rem;
      line-height: 1.6;
      color: var(--color-text-muted);
      margin: 0;
      white-space: pre-wrap;
    }
    .plan-empty {
      font-size: 0.85rem;
      color: var(--color-text-subtle);
      margin: 0;
      font-style: italic;
    }
  `],
})
export class ProjectCardComponent implements OnInit {
  @Input() project!: Project;
  @Output() onSave = new EventEmitter<Partial<Project>>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onLock = new EventEmitter<boolean>();

  isEditing = false;
  expanded = false;
  form!: FormGroup;
  newTodoText = '';
  private saveSubject = new Subject<Partial<Project>>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    if (!this.project.todos) this.project.todos = [];
    if (!this.project.monetizationPlan) this.project.monetizationPlan = '';

    this.form = this.fb.group({
      name: [this.project.name],
      description: [this.project.description],
      backgroundImage: [this.project.backgroundImage],
      mrr: [this.project.mrr],
      clientCount: [this.project.clientCount],
      impact: [this.project.impact],
      niche: [this.project.niche],
      monetizationPlan: [this.project.monetizationPlan],
    });

    this.saveSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((data) => {
      this.onSave.emit({ _id: this.project._id, ...data });
    });
  }

  get weeklyHours(): number {
    const s = this.project.schedule;
    if (!s) return 0;
    return (s.monday || 0) + (s.tuesday || 0) + (s.wednesday || 0)
      + (s.thursday || 0) + (s.friday || 0) + (s.saturday || 0) + (s.sunday || 0);
  }

  get doneCount(): number {
    return this.project.todos.filter(t => t.done).length;
  }

  get progressPercent(): number {
    if (this.project.todos.length === 0) return 0;
    return (this.doneCount / this.project.todos.length) * 100;
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;
    this.onLock.emit(this.expanded || this.isEditing);
  }

  toggleEdit(): void {
    if (this.isEditing) {
      const formValue = this.form.value;
      this.onSave.emit({ _id: this.project._id, ...formValue, todos: this.project.todos });
      Object.assign(this.project, formValue);
    }
    this.isEditing = !this.isEditing;
    if (this.isEditing) this.expanded = false;
    this.onLock.emit(this.isEditing || this.expanded);
  }

  addTodo(): void {
    const text = this.newTodoText.trim();
    if (!text) return;
    this.project.todos.push({ text, done: false });
    this.newTodoText = '';
    this.saveTodos();
  }

  toggleTodo(index: number): void {
    this.project.todos[index].done = !this.project.todos[index].done;
    this.saveTodos();
  }

  removeTodo(index: number): void {
    this.project.todos.splice(index, 1);
    this.saveTodos();
  }

  private saveTodos(): void {
    this.onSave.emit({ _id: this.project._id, todos: [...this.project.todos] });
  }
}
