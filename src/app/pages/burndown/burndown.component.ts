import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProjectService } from '../../services/project.service';
import { Project, Todo, WeeklySchedule } from '../../models/project.model';

interface ProjectGroup {
  project: Project;
  color: string;
  totalTodos: number;
  doneTodos: number;
  progressPercent: number;
  weeklyHours: number;
}

interface ChartBar {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ChartProject {
  id: string;
  name: string;
  color: string;
  estimatedBars: ChartBar[];
  spentBars: ChartBar[];
  visible: boolean;
}

const COLORS = [
  '#D4AF37', '#22C55E', '#3B82F6', '#EC4899', '#F97316',
  '#A78BFA', '#06B6D4', '#EF4444', '#EAB308', '#8B5CF6',
];

@Component({
  selector: 'app-burndown',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    DragDropModule,
  ],
  template: `
    <div class="burndown-page">
      <div class="page-header">
        <h1>Burndown</h1>
        <p class="subtitle">All your todos across active projects</p>
      </div>

      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (groups.length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">checklist</mat-icon>
          <h2>No todos yet</h2>
          <p>Add todos to projects that have time allocated to see them here.</p>
        </div>
      } @else {
        <!-- Stats + Chart row -->
        <div class="top-row" [class.chart-is-expanded]="chartExpanded">
          <!-- Left: stats + progress -->
          <div class="stats-col">
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-value">{{ totalAll }}</span>
                <span class="stat-label">Total</span>
              </div>
              <div class="stat">
                <span class="stat-value done-value">{{ doneAll }}</span>
                <span class="stat-label">Done</span>
              </div>
              <div class="stat">
                <span class="stat-value remaining-value">{{ totalAll - doneAll }}</span>
                <span class="stat-label">Remaining</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ globalPercent | number:'1.0-0' }}%</span>
                <span class="stat-label">Progress</span>
              </div>
            </div>
            <div class="progress-row">
              <div class="global-progress-track">
                <div class="global-progress-fill" [style.width.%]="globalPercent"></div>
              </div>
            </div>
          </div>

          <!-- Right: mini chart (or full-width when expanded) -->
          <div class="chart-card" [class.chart-expanded]="chartExpanded">
            <div class="chart-top">
              <span class="chart-title">Daily Breakdown</span>
              <div class="chart-legend">
                @for (cp of chartProjects; track cp.id) {
                  <button class="legend-btn" [class.legend-hidden]="!cp.visible" (click)="toggleChartProject(cp)">
                    <span class="legend-swatch" [style.backgroundColor]="cp.color"></span>
                    <span>{{ cp.name }}</span>
                  </button>
                }
              </div>
              <button class="chart-expand-btn" (click)="chartExpanded = !chartExpanded" [title]="chartExpanded ? 'Collapse' : 'Expand'">
                <mat-icon>{{ chartExpanded ? 'close_fullscreen' : 'open_in_full' }}</mat-icon>
              </button>
            </div>
            @if (chartExpanded) {
              <div class="chart-subtitle">
                <span class="chart-sub-item"><span class="sub-bar faded"></span> Allocated</span>
                <span class="chart-sub-item"><span class="sub-bar filled"></span> Spent</span>
              </div>
            }
            <svg viewBox="0 0 800 350" class="chart-svg" preserveAspectRatio="xMidYMid meet">
              <!-- Horizontal grid -->
              @for (tick of chartYTicks; track tick) {
                <line [attr.x1]="55" [attr.y1]="yScale(tick)" [attr.x2]="785" [attr.y2]="yScale(tick)"
                      stroke="var(--color-border-light)" stroke-dasharray="4,4" />
                <text [attr.x]="48" [attr.y]="yScale(tick) + 4" text-anchor="end"
                      fill="var(--color-text-subtle)" font-size="11" font-family="inherit">{{ tick }}h</text>
              }
              <!-- Vertical grid + day labels -->
              @for (day of dayLabels; track $index) {
                <line [attr.x1]="xPos($index)" [attr.y1]="15" [attr.x2]="xPos($index)" [attr.y2]="315"
                      stroke="var(--color-border-light)" stroke-dasharray="2,4" opacity="0.5" />
                <text [attr.x]="xPos($index)" y="335" text-anchor="middle"
                      fill="var(--color-text-subtle)" font-size="12" font-family="inherit">{{ day }}</text>
              }
              <!-- Baseline -->
              <line x1="55" y1="315" x2="785" y2="315" stroke="var(--color-border)" stroke-width="1" />
              <!-- Project data (bars) -->
              @for (cp of chartProjects; track cp.id) {
                @if (cp.visible) {
                  @for (bar of cp.estimatedBars; track $index) {
                    @if (bar.height > 0) {
                      <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.width" [attr.height]="bar.height"
                            [attr.fill]="cp.color" opacity="0.25" rx="2" />
                      <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.width" [attr.height]="bar.height"
                            fill="none" [attr.stroke]="cp.color" stroke-width="1" stroke-dasharray="3,2" opacity="0.6" rx="2" />
                    }
                  }
                  @for (bar of cp.spentBars; track $index) {
                    @if (bar.height > 0) {
                      <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.width" [attr.height]="bar.height"
                            [attr.fill]="cp.color" opacity="0.7" rx="2" />
                    }
                  }
                }
              }
            </svg>
          </div>
        </div>

        <!-- Project groups (drag-drop) -->
        <div cdkDropList (cdkDropListDropped)="dropGroup($event)">
          @for (group of groups; track group.project._id) {
            <div class="project-group" cdkDrag>
              <div class="drag-placeholder" *cdkDragPlaceholder></div>
              <div class="group-header">
                <div class="group-title-row">
                  <div class="drag-handle" cdkDragHandle>
                    <mat-icon>drag_indicator</mat-icon>
                  </div>
                  <span class="color-dot" [style.backgroundColor]="group.color"></span>
                  <a class="group-name" [routerLink]="['/project', group.project._id]">{{ group.project.name }}</a>
                  <span class="group-hours">{{ group.weeklyHours }}h/w</span>
                  <span class="group-count">{{ group.doneTodos }}/{{ group.totalTodos }}</span>
                  <button
                    class="group-sort-btn"
                    (click)="moveGroup($index, -1)"
                    [class.disabled]="$index === 0"
                    title="Move up"
                  >
                    <mat-icon>keyboard_arrow_up</mat-icon>
                  </button>
                  <button
                    class="group-sort-btn"
                    (click)="moveGroup($index, 1)"
                    [class.disabled]="$index === groups.length - 1"
                    title="Move down"
                  >
                    <mat-icon>keyboard_arrow_down</mat-icon>
                  </button>
                </div>
                <div class="group-progress-track">
                  <div
                    class="group-progress-fill"
                    [style.width.%]="group.progressPercent"
                    [style.backgroundColor]="group.color"
                  ></div>
                </div>
              </div>

              <!-- Day-by-day time tracker (collapsible) -->
              <div class="day-tracker">
                <button class="tracker-toggle" (click)="toggleTracker(group)">
                  <mat-icon class="tracker-toggle-icon" [class.expanded]="expandedTrackers.has(group.project._id!)">expand_more</mat-icon>
                  <span class="tracker-summary">
                    <span class="tracker-summary-label">Time:</span>
                    <span class="tracker-summary-spent" [class.over]="getDaySpentTotal(group) > group.weeklyHours">
                      {{ getDaySpentTotal(group) | number:'1.0-1' }}h
                    </span>
                    <span class="tracker-summary-sep">/</span>
                    <span class="tracker-summary-est">{{ group.weeklyHours }}h</span>
                  </span>
                </button>
                @if (expandedTrackers.has(group.project._id!)) {
                  <div class="day-tracker-grid">
                    <div class="day-tracker-row header-row">
                      <span class="day-tracker-label"></span>
                      @for (day of dayLabels; track $index) {
                        <span class="day-col-header">{{ day }}</span>
                      }
                      <span class="day-col-header total-col">Total</span>
                    </div>
                    <div class="day-tracker-row">
                      <span class="day-tracker-label est-label">Est.</span>
                      @for (key of dayKeys; track $index) {
                        <span class="day-est-val">{{ getScheduleDay(group, key) }}</span>
                      }
                      <span class="day-est-val total-col">{{ group.weeklyHours }}</span>
                    </div>
                    <div class="day-tracker-row">
                      <span class="day-tracker-label spent-label">Spent</span>
                      @for (key of dayKeys; track $index) {
                        <input
                          class="day-input"
                          type="number" min="0" step="0.5"
                          [value]="getDaySpent(group, key)"
                          (change)="updateDaySpent(group, key, $event)"
                        />
                      }
                      <span class="day-spent-total total-col" [class.over]="getDaySpentTotal(group) > group.weeklyHours">
                        {{ getDaySpentTotal(group) | number:'1.0-1' }}
                      </span>
                    </div>
                  </div>
                }
              </div>

              <div class="todo-list">
                <ng-container
                  *ngTemplateOutlet="todoListTpl; context: { $implicit: group.project.todos, path: [], group: group, depth: 0 }"
                ></ng-container>
              </div>
            </div>
          }
        </div>
      }

      <!-- Recursive todo template -->
      <ng-template #todoListTpl let-todos let-path="path" let-group="group" let-depth="depth">
        @for (todo of todos; track $index) {
          <div
            class="todo-row"
            [class.done]="todo.done"
            [class.drag-over]="todoDragOver === makeKey(group, path.concat($index))"
            [style.paddingLeft.px]="depth * 24"
            draggable="true"
            (dragstart)="onTodoDragStart($event, group, path.concat($index))"
            (dragover)="onTodoDragOver($event, group, path.concat($index))"
            (dragleave)="onTodoDragLeave($event)"
            (drop)="onTodoDrop($event, group, path.concat($index))"
            (dragend)="onTodoDragEnd()"
          >
            <div class="todo-drag-handle">
              <mat-icon>drag_indicator</mat-icon>
            </div>
            <mat-checkbox
              [checked]="todo.done"
              (change)="toggleTodo(group, path.concat($index))"
              [color]="'primary'"
            ></mat-checkbox>
            @if (editingKey === makeKey(group, path.concat($index))) {
              <input
                class="todo-edit-input"
                [(ngModel)]="editingText"
                (keydown)="onEditKeydown($event, group, path.concat($index))"
                (blur)="onEditBlur(group, path.concat($index))"
                (paste)="onEditPaste($event, group, path.concat($index))"
              />
            } @else {
              <span
                class="todo-text"
                (click)="startEdit(group, path.concat($index))"
              >{{ todo.text }}</span>
            }
            <button
              class="todo-delete-btn"
              (click)="removeTodo(group, path.concat($index))"
              title="Remove todo"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <!-- Render children recursively -->
          @if (todo.children && todo.children.length > 0) {
            <ng-container
              *ngTemplateOutlet="todoListTpl; context: { $implicit: todo.children, path: path.concat($index), group: group, depth: depth + 1 }"
            ></ng-container>
          }
        }
        <!-- Add todo at this level -->
        <div class="add-todo-row" [style.paddingLeft.px]="depth * 24">
          <mat-icon class="add-icon">add</mat-icon>
          <input
            class="add-todo-input"
            [placeholder]="depth === 0 ? 'Add a todo (paste multi-line to bulk add)...' : 'Add sub-item...'"
            (keydown.enter)="addTodoAtPath(group, path, $event)"
            (paste)="onPaste(group, path, $event)"
          />
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .burndown-page {
      padding: 0 24px 2rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .page-header {
      margin-bottom: 1.5rem;
      padding-top: 0.5rem;
    }
    .page-header h1 {
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

    .loading {
      display: flex;
      justify-content: center;
      padding: 4rem;
    }
    .empty-state {
      text-align: center;
      padding: 5rem 2rem;
      color: var(--color-text-subtle);
    }
    .empty-state h2 {
      color: var(--color-text);
      font-weight: 700;
      margin: 0.75rem 0 0.25rem;
    }
    .empty-state p { margin: 0; }
    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-border);
    }

    /* Top row: stats + chart side-by-side */
    .top-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      align-items: stretch;
    }
    .top-row.chart-is-expanded {
      flex-direction: column;
    }
    .stats-col {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .top-row:not(.chart-is-expanded) .stats-col {
      flex: 1 1 0;
    }
    .top-row:not(.chart-is-expanded) .chart-card {
      flex: 1 1 0;
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      flex: 1;
    }
    .stat {
      flex: 1;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .done-value { color: #22C55E; }
    .remaining-value { color: var(--color-primary); }
    .stat-label {
      font-size: 0.72rem;
      color: var(--color-text-subtle);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Global progress */
    .progress-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .global-progress-track {
      flex: 1;
      height: 6px;
      background: var(--color-border-light);
      border-radius: 100px;
      overflow: hidden;
    }
    .global-progress-fill {
      height: 100%;
      background: var(--color-primary);
      border-radius: 100px;
      transition: width 0.4s ease;
    }

    /* Drag-drop */
    .drag-handle {
      cursor: grab;
      color: var(--color-text-subtle);
      display: flex;
      align-items: center;
      opacity: 0.4;
      transition: opacity var(--transition);
    }
    .drag-handle:hover { opacity: 1; }
    .drag-handle mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .drag-placeholder {
      background: var(--color-border-light);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-md);
      min-height: 60px;
      margin-bottom: 0.75rem;
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drag-preview {
      box-shadow: var(--shadow-md);
      border-radius: var(--radius-md);
      opacity: 0.9;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .project-group:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* Project groups */
    .project-group {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
      box-shadow: var(--shadow-sm);
    }
    .group-header {
      margin-bottom: 0.5rem;
    }
    .group-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .group-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--color-text);
      text-decoration: none;
      transition: color var(--transition);
    }
    .group-name:hover {
      color: var(--color-primary);
    }
    .group-hours {
      margin-left: auto;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--color-primary);
    }
    .group-count {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--color-text-subtle);
      background: var(--color-border-light);
      padding: 2px 10px;
      border-radius: 100px;
    }
    .group-progress-track {
      height: 4px;
      background: var(--color-border-light);
      border-radius: 100px;
      overflow: hidden;
    }
    .group-progress-fill {
      height: 100%;
      border-radius: 100px;
      transition: width 0.4s ease;
    }

    /* Burndown chart */
    .chart-card {
      flex: 1;
      min-width: 0;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 0.5rem 0.75rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
    }
    .chart-card .chart-svg {
      flex: 1;
      min-height: 0;
    }
    .chart-card.chart-expanded {
      padding: 1rem 1.25rem;
    }
    .chart-top {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 4px;
    }
    .chart-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--color-text);
      margin-right: auto;
    }
    .chart-expand-btn {
      background: none;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm);
      padding: 2px;
      cursor: pointer;
      color: var(--color-text-subtle);
      display: flex;
      align-items: center;
      transition: color var(--transition), border-color var(--transition);
      flex-shrink: 0;
    }
    .chart-expand-btn:hover {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
    .chart-expand-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .legend-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      background: none;
      border: 1px solid var(--color-border-light);
      border-radius: 100px;
      padding: 3px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text);
      cursor: pointer;
      transition: opacity var(--transition), border-color var(--transition);
      font-family: inherit;
    }
    .legend-btn:hover { border-color: var(--color-border); }
    .legend-btn.legend-hidden { opacity: 0.35; }
    .legend-swatch {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .chart-subtitle {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }
    .chart-sub-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      color: var(--color-text-subtle);
      font-weight: 500;
    }
    .sub-bar {
      width: 12px;
      height: 10px;
      border-radius: 2px;
      background: var(--color-text-subtle);
    }
    .sub-bar.faded { opacity: 0.3; border: 1px dashed var(--color-text-subtle); background: transparent; }
    .sub-bar.filled { opacity: 0.75; }
    .chart-svg {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Day tracker */
    .day-tracker {
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      padding: 6px 10px;
      margin-bottom: 10px;
    }
    .tracker-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 0;
      width: 100%;
      font-family: inherit;
      color: var(--color-text-subtle);
      transition: color var(--transition);
    }
    .tracker-toggle:hover { color: var(--color-text); }
    .tracker-toggle-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      transition: transform 0.2s ease;
      transform: rotate(-90deg);
    }
    .tracker-toggle-icon.expanded { transform: rotate(0deg); }
    .tracker-summary {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .tracker-summary-label { color: var(--color-text-subtle); }
    .tracker-summary-spent { color: #22C55E; }
    .tracker-summary-spent.over { color: #EF4444; }
    .tracker-summary-sep { color: var(--color-text-subtle); opacity: 0.5; }
    .tracker-summary-est { color: var(--color-text-subtle); }
    .day-tracker-grid { margin-top: 6px; }
    .day-tracker-row {
      display: grid;
      grid-template-columns: 40px repeat(7, 1fr) 44px;
      gap: 3px;
      align-items: center;
      margin-bottom: 2px;
    }
    .day-tracker-row:last-child { margin-bottom: 0; }
    .day-col-header {
      text-align: center;
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--color-text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .day-tracker-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--color-text-subtle);
    }
    .est-label { color: var(--color-text-subtle); }
    .spent-label { color: var(--color-primary); }
    .day-est-val {
      text-align: center;
      font-size: 0.72rem;
      color: var(--color-text-subtle);
      font-weight: 500;
    }
    .day-input {
      width: 100%;
      min-width: 0;
      text-align: center;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm);
      padding: 3px 2px;
      font-size: 0.75rem;
      font-weight: 600;
      background: transparent;
      color: var(--color-text);
      font-family: inherit;
      outline: none;
      -moz-appearance: textfield;
    }
    .day-input::-webkit-inner-spin-button,
    .day-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .day-input:focus { border-color: var(--color-primary); }
    .total-col {
      text-align: center;
      font-weight: 700;
      font-size: 0.75rem;
    }
    .day-spent-total {
      color: #22C55E;
    }
    .day-spent-total.over { color: #EF4444; }

    /* Todos */
    .todo-list {
      display: flex;
      flex-direction: column;
    }
    .todo-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 0;
      border-bottom: 1px solid var(--color-border-light);
      position: relative;
    }
    .todo-row:last-child {
      border-bottom: none;
    }
    .todo-text {
      font-size: 0.9rem;
      color: var(--color-text);
      transition: all var(--transition);
      cursor: text;
      flex: 1;
    }
    .todo-row.done .todo-text {
      text-decoration: line-through;
      color: var(--color-text-subtle);
      opacity: 0.6;
    }
    .todo-edit-input {
      flex: 1;
      background: transparent;
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-sm);
      padding: 4px 8px;
      font-size: 0.9rem;
      color: var(--color-text);
      outline: none;
      font-family: inherit;
    }
    .group-sort-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: var(--color-text-subtle);
      display: flex;
      align-items: center;
      transition: color var(--transition);
    }
    .group-sort-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .group-sort-btn:hover { color: var(--color-primary); }
    .group-sort-btn.disabled {
      pointer-events: none;
      opacity: 0.2;
    }
    .todo-drag-handle {
      cursor: grab;
      color: var(--color-text-subtle);
      display: flex;
      align-items: center;
      opacity: 0;
      transition: opacity var(--transition);
    }
    .todo-drag-handle mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .todo-row:hover .todo-drag-handle { opacity: 0.4; }
    .todo-drag-handle:hover { opacity: 1 !important; }
    .todo-row.drag-over {
      border-top: 2px solid var(--color-primary);
    }
    .todo-action-btn,
    .todo-delete-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: var(--color-text-subtle);
      opacity: 0;
      transition: opacity var(--transition), color var(--transition);
      display: flex;
      align-items: center;
    }
    .todo-action-btn mat-icon,
    .todo-delete-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .todo-row:hover .todo-action-btn,
    .todo-row:hover .todo-delete-btn {
      opacity: 1;
    }
    .todo-action-btn:hover {
      color: var(--color-primary);
    }
    .todo-delete-btn:hover {
      color: #EF4444;
    }

    /* Add todo */
    .add-todo-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0 2px;
    }
    .add-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--color-text-subtle);
    }
    .add-todo-input {
      flex: 1;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--color-border-light);
      padding: 4px 0;
      font-size: 0.88rem;
      color: var(--color-text);
      outline: none;
      font-family: inherit;
    }
    .add-todo-input::placeholder {
      color: var(--color-text-subtle);
      opacity: 0.6;
    }
    .add-todo-input:focus {
      border-bottom-color: var(--color-primary);
    }
  `],
})
export class BurndownComponent implements OnInit {
  groups: ProjectGroup[] = [];
  loading = true;
  totalAll = 0;
  doneAll = 0;
  editingKey: string | null = null;
  editingText = '';
  chartExpanded = false;
  expandedTrackers = new Set<string>();

  get globalPercent(): number {
    return this.totalAll > 0 ? (this.doneAll / this.totalAll) * 100 : 0;
  }

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => {
        const active = projects.filter(p => this.calcWeeklyHours(p) > 0);
        active.sort((a, b) => {
          const aOrder = (a.burndownSortOrder != null && a.burndownSortOrder >= 0) ? a.burndownSortOrder : (a.sortOrder ?? 0);
          const bOrder = (b.burndownSortOrder != null && b.burndownSortOrder >= 0) ? b.burndownSortOrder : (b.sortOrder ?? 0);
          return aOrder - bOrder;
        });
        this.groups = active.map((project, idx) => this.buildGroup(project, idx));
        // Default chart: only first project visible
        this.groups.forEach((g, i) => {
          if (i > 0) this.hiddenProjects.add(g.project._id!);
        });
        this.recalcGlobal();
        this.buildChart();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  // --- Chart ---

  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly dayKeys: (keyof WeeklySchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  chartProjects: ChartProject[] = [];
  chartYTicks: number[] = [];
  private chartTopY = 1;
  private hiddenProjects = new Set<string>();

  // Chart coordinate helpers
  xPos(i: number): number { return 55 + i * (730 / 6); }
  yScale(v: number): number { return 315 - (v / this.chartTopY) * 300; }

  toggleTracker(group: ProjectGroup): void {
    const id = group.project._id!;
    if (this.expandedTrackers.has(id)) {
      this.expandedTrackers.delete(id);
    } else {
      this.expandedTrackers.add(id);
    }
  }

  toggleChartProject(cp: ChartProject): void {
    cp.visible = !cp.visible;
    if (cp.visible) {
      this.hiddenProjects.delete(cp.id);
    } else {
      this.hiddenProjects.add(cp.id);
    }
    this.buildChart();
  }

  private buildChart(): void {
    const visibleGroups = this.groups.filter(g => !this.hiddenProjects.has(g.project._id!));
    const visibleCount = visibleGroups.length;

    const projectData = this.groups.map(g => {
      const estDaily: number[] = [];
      const spentDaily: number[] = [];
      for (const key of this.dayKeys) {
        estDaily.push((g.project.schedule as any)?.[key] || 0);
        spentDaily.push((g.project.timeSpentPerDay as any)?.[key] || 0);
      }
      return { group: g, estDaily, spentDaily };
    });

    const visibleData = projectData.filter(pd => !this.hiddenProjects.has(pd.group.project._id!));
    const allValues = visibleData.flatMap(pd => [...pd.estDaily, ...pd.spentDaily]);
    const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1;

    this.chartYTicks = this.computeYTicks(maxVal);
    this.chartTopY = this.chartYTicks[this.chartYTicks.length - 1] || 1;

    // Bar layout: for each day slot, group bars by project (estimated + spent side by side)
    const daySlotWidth = 730 / 7; // total width / 7 days
    const groupWidth = visibleCount > 0 ? (daySlotWidth * 0.8) / visibleCount : daySlotWidth * 0.8;
    const barWidth = Math.min(groupWidth / 2 - 1, 28);

    let visibleIndex = 0;
    const visibleIndexMap = new Map<string, number>();
    for (const g of visibleGroups) {
      visibleIndexMap.set(g.project._id!, visibleIndex++);
    }

    this.chartProjects = projectData.map(pd => {
      const id = pd.group.project._id!;
      const visible = !this.hiddenProjects.has(id);
      const vIdx = visibleIndexMap.get(id) ?? 0;

      const estimatedBars: ChartBar[] = [];
      const spentBars: ChartBar[] = [];

      for (let i = 0; i < 7; i++) {
        const dayCenterX = this.xPos(i);
        const totalGroupsWidth = visibleCount > 0 ? groupWidth * visibleCount : groupWidth;
        const groupStartX = dayCenterX - totalGroupsWidth / 2 + vIdx * groupWidth;

        const estVal = pd.estDaily[i];
        const spentVal = pd.spentDaily[i];

        estimatedBars.push({
          x: groupStartX,
          y: this.yScale(estVal),
          width: barWidth,
          height: 315 - this.yScale(estVal),
        });

        spentBars.push({
          x: groupStartX + barWidth + 1,
          y: this.yScale(spentVal),
          width: barWidth,
          height: 315 - this.yScale(spentVal),
        });
      }

      return {
        id,
        name: pd.group.project.name,
        color: pd.group.color,
        estimatedBars,
        spentBars,
        visible,
      };
    });
  }

  private computeYTicks(maxVal: number): number[] {
    if (maxVal <= 0) return [0, 1];
    const step = maxVal <= 5 ? 1 : maxVal <= 10 ? 2 : Math.ceil(maxVal / 5);
    const ticks: number[] = [];
    for (let v = 0; v <= maxVal; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < maxVal) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  // --- Day tracker ---

  getScheduleDay(group: ProjectGroup, key: string): number {
    return (group.project.schedule as any)?.[key] || 0;
  }

  getDaySpent(group: ProjectGroup, key: string): number {
    return (group.project.timeSpentPerDay as any)?.[key] || 0;
  }

  getDaySpentTotal(group: ProjectGroup): number {
    const s = group.project.timeSpentPerDay;
    if (!s) return 0;
    return (s.monday || 0) + (s.tuesday || 0) + (s.wednesday || 0)
      + (s.thursday || 0) + (s.friday || 0) + (s.saturday || 0) + (s.sunday || 0);
  }

  updateDaySpent(group: ProjectGroup, key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Math.max(0, parseFloat(input.value) || 0);
    if (!group.project.timeSpentPerDay) {
      group.project.timeSpentPerDay = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
    }
    const old = (group.project.timeSpentPerDay as any)[key] || 0;
    (group.project.timeSpentPerDay as any)[key] = value;
    this.buildChart();
    this.projectService.update(group.project._id!, { timeSpentPerDay: group.project.timeSpentPerDay }).subscribe({
      error: () => {
        (group.project.timeSpentPerDay as any)[key] = old;
        this.buildChart();
        this.snackBar.open('Failed to save', 'Close', { duration: 3000 });
      },
    });
  }

  // --- Helpers to navigate nested todos by path ---

  makeKey(group: ProjectGroup, path: number[]): string {
    return group.project._id + '-' + path.join('-');
  }

  private getTodoAt(todos: Todo[], path: number[]): Todo {
    let current = todos[path[0]];
    for (let i = 1; i < path.length; i++) {
      current = current.children![path[i]];
    }
    return current;
  }

  private getParentList(todos: Todo[], path: number[]): Todo[] {
    if (path.length === 1) return todos;
    let current = todos[path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      current = current.children![path[i]];
    }
    if (!current.children) current.children = [];
    return current.children;
  }

  // --- Drag-drop groups ---

  dropGroup(event: CdkDragDrop<ProjectGroup[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.groups, event.previousIndex, event.currentIndex);
    this.groups.forEach((g, idx) => g.color = COLORS[idx % COLORS.length]);
    const projectIds = this.groups.map(g => g.project._id!);
    this.projectService.reorder(projectIds, 'burndownSortOrder').subscribe({
      error: () => this.snackBar.open('Failed to save order', 'Close', { duration: 3000 }),
    });
  }

  // --- Toggle ---

  toggleTodo(group: ProjectGroup, path: number[]): void {
    const todo = this.getTodoAt(group.project.todos, path);
    todo.done = !todo.done;
    this.recalcGroupProgress(group);
    this.recalcGlobal();
    this.saveTodos(group, () => {
      todo.done = !todo.done;
      this.recalcGroupProgress(group);
      this.recalcGlobal();
    });
  }

  // --- Edit ---

  private editingGroup: ProjectGroup | null = null;
  private editingPath: number[] = [];
  private skipBlurSave = false;
  private pendingNew = false; // true when editing a newly inserted item (not yet saved)

  startEdit(group: ProjectGroup, path: number[]): void {
    // Save any in-progress edit first
    if (this.editingKey && this.editingGroup) {
      this.finishEdit();
    }
    const todo = this.getTodoAt(group.project.todos, path);
    this.editingKey = this.makeKey(group, path);
    this.editingGroup = group;
    this.editingPath = path;
    this.editingText = todo.text;
    this.pendingNew = false;
    setTimeout(() => {
      const input = document.querySelector('.todo-edit-input') as HTMLInputElement;
      input?.focus();
    });
  }

  cancelEdit(): void {
    this.editingKey = null;
    this.editingGroup = null;
    this.editingPath = [];
    this.editingText = '';
    this.pendingNew = false;
  }

  onEditKeydown(event: KeyboardEvent, group: ProjectGroup, path: number[]): void {
    if (event.key === 'Escape') {
      if (this.pendingNew) {
        // Remove the unsaved pending item
        this.removePending(group, path);
      }
      this.cancelEdit();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.skipBlurSave = true;
      const saved = this.finishEdit();
      if (!saved) return; // text was empty, item removed — don't insert new
      if (event.shiftKey) {
        this.insertSibling(group, path);
      } else {
        this.insertChild(group, path);
      }
    }
  }

  onEditBlur(group: ProjectGroup, path: number[]): void {
    if (this.skipBlurSave) {
      this.skipBlurSave = false;
      return;
    }
    if (!this.editingKey) return;
    this.finishEdit();
  }

  /** Finishes editing. Returns true if text was saved, false if item was empty/removed. */
  private finishEdit(): boolean {
    if (!this.editingKey || !this.editingGroup) return false;
    const text = this.editingText.trim();
    const group = this.editingGroup;
    const path = this.editingPath;
    const wasPending = this.pendingNew;

    if (!text) {
      // Empty text: if it was a new pending item, remove it
      if (wasPending) {
        this.removePending(group, path);
      }
      this.cancelEdit();
      return false;
    }

    const todo = this.getTodoAt(group.project.todos, path);
    const oldText = todo.text;
    todo.text = text;
    this.cancelEdit();

    if (wasPending) {
      // First save of a new item
      this.saveTodos(group, () => {
        this.removePending(group, path);
      });
    } else if (text !== oldText) {
      this.saveTodos(group, () => { todo.text = oldText; });
    }
    return true;
  }

  private removePending(group: ProjectGroup, path: number[]): void {
    const list = this.getParentList(group.project.todos, path);
    const idx = path[path.length - 1];
    list.splice(idx, 1);
    this.recalcGroupProgress(group);
    this.recalcGlobal();
  }

  private insertChild(group: ProjectGroup, path: number[]): void {
    const todo = this.getTodoAt(group.project.todos, path);
    if (!todo.children) todo.children = [];
    todo.children.push({ text: '', done: false, children: [] });
    this.recalcGroupProgress(group);
    this.recalcGlobal();
    const childPath = [...path, todo.children.length - 1];
    // Don't save yet — wait for user to type text
    this.editingKey = this.makeKey(group, childPath);
    this.editingGroup = group;
    this.editingPath = childPath;
    this.editingText = '';
    this.pendingNew = true;
    setTimeout(() => {
      const input = document.querySelector('.todo-edit-input') as HTMLInputElement;
      input?.focus();
    });
  }

  private insertSibling(group: ProjectGroup, path: number[]): void {
    const parentList = this.getParentList(group.project.todos, path);
    const idx = path[path.length - 1];
    parentList.splice(idx + 1, 0, { text: '', done: false, children: [] });
    this.recalcGroupProgress(group);
    this.recalcGlobal();
    const siblingPath = [...path.slice(0, -1), idx + 1];
    // Don't save yet — wait for user to type text
    this.editingKey = this.makeKey(group, siblingPath);
    this.editingGroup = group;
    this.editingPath = siblingPath;
    this.editingText = '';
    this.pendingNew = true;
    setTimeout(() => {
      const input = document.querySelector('.todo-edit-input') as HTMLInputElement;
      input?.focus();
    });
  }

  // --- Add ---

  addTodoAtPath(group: ProjectGroup, path: number[], event: Event): void {
    const input = event.target as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    const list = path.length === 0 ? group.project.todos : this.getParentList(group.project.todos, [...path, 0]);
    list.push({ text, done: false, children: [] });
    this.recalcGroupProgress(group);
    this.recalcGlobal();
    input.value = '';
    this.saveTodos(group, () => {
      list.pop();
      this.recalcGroupProgress(group);
      this.recalcGlobal();
    });
  }

  // --- Paste ---

  onPaste(group: ProjectGroup, path: number[], event: ClipboardEvent): void {
    const raw = event.clipboardData?.getData('text') || '';
    const rawLines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (rawLines.length === 0) return;
    event.preventDefault();

    const list = path.length === 0 ? group.project.todos : this.getParentList(group.project.todos, [...path, 0]);
    const countBefore = list.length;

    const parsed = this.parseIndentedLines(rawLines);
    list.push(...parsed);

    this.recalcGroupProgress(group);
    this.recalcGlobal();
    this.saveTodos(group, () => {
      list.splice(countBefore, parsed.length);
      this.recalcGroupProgress(group);
      this.recalcGlobal();
    });

    // Start editing last added item
    const lastIdx = list.length - 1;
    const lastPath = path.length === 0 ? [lastIdx] : [...path, lastIdx];
    setTimeout(() => this.startEdit(group, lastPath));
  }

  onEditPaste(event: ClipboardEvent, group: ProjectGroup, path: number[]): void {
    const raw = event.clipboardData?.getData('text') || '';
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) return; // single line = normal paste into input
    event.preventDefault();
    this.skipBlurSave = true;

    // Commit current edit text + pasted first line as current item's text
    const currentText = this.editingText + lines[0].trim();
    const todo = this.getTodoAt(group.project.todos, path);
    const wasPending = this.pendingNew;
    const oldText = todo.text;
    todo.text = currentText;
    this.cancelEdit();

    // Insert remaining lines as siblings after current item
    const parentList = this.getParentList(group.project.todos, path);
    const idx = path[path.length - 1];
    const remaining = lines.slice(1).map(l => ({
      text: l.replace(/^[\s]*[-*•]\s*/, '').trim(),
      done: false,
      children: [] as Todo[],
    }));
    parentList.splice(idx + 1, 0, ...remaining);

    this.recalcGroupProgress(group);
    this.recalcGlobal();
    this.saveTodos(group, () => {
      todo.text = oldText;
      parentList.splice(idx + 1, remaining.length);
      if (wasPending) parentList.splice(idx, 1);
      this.recalcGroupProgress(group);
      this.recalcGlobal();
    });

    // Start editing last inserted sibling
    const lastPath = [...path.slice(0, -1), idx + remaining.length];
    setTimeout(() => this.startEdit(group, lastPath));
  }

  private parseIndentedLines(lines: string[]): Todo[] {
    const result: Todo[] = [];
    const stack: { todo: Todo; indent: number }[] = [];

    for (const rawLine of lines) {
      const stripped = rawLine.replace(/^[\s]*[-*•]\s*/, '').replace(/^\s+/, '');
      const indent = rawLine.search(/\S/);
      const todo: Todo = { text: stripped || rawLine.trim(), done: false, children: [] };

      // Find parent: walk back the stack to find correct nesting level
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(todo);
      } else {
        const parent = stack[stack.length - 1].todo;
        if (!parent.children) parent.children = [];
        parent.children.push(todo);
      }
      stack.push({ todo, indent });
    }
    return result;
  }

  // --- Todo drag-drop reorder ---

  todoDragOver: string | null = null;
  private dragSourceGroup: ProjectGroup | null = null;
  private dragSourcePath: number[] = [];

  onTodoDragStart(event: DragEvent, group: ProjectGroup, path: number[]): void {
    this.dragSourceGroup = group;
    this.dragSourcePath = path;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', '');
  }

  onTodoDragOver(event: DragEvent, group: ProjectGroup, path: number[]): void {
    if (!this.dragSourceGroup || this.dragSourceGroup !== group) return;
    // Only allow reorder within same parent level
    const srcParent = this.dragSourcePath.slice(0, -1).join('-');
    const tgtParent = path.slice(0, -1).join('-');
    if (srcParent !== tgtParent) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.todoDragOver = this.makeKey(group, path);
  }

  onTodoDragLeave(event: DragEvent): void {
    this.todoDragOver = null;
  }

  onTodoDrop(event: DragEvent, group: ProjectGroup, path: number[]): void {
    event.preventDefault();
    this.todoDragOver = null;
    if (!this.dragSourceGroup || this.dragSourceGroup !== group) return;
    const srcParent = this.dragSourcePath.slice(0, -1).join('-');
    const tgtParent = path.slice(0, -1).join('-');
    if (srcParent !== tgtParent) return;

    const list = this.getParentList(group.project.todos, path);
    const fromIdx = this.dragSourcePath[this.dragSourcePath.length - 1];
    const toIdx = path[path.length - 1];
    if (fromIdx === toIdx) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    this.saveTodos(group, () => {
      // rollback
      const [item] = list.splice(toIdx, 1);
      list.splice(fromIdx, 0, item);
    });
  }

  onTodoDragEnd(): void {
    this.todoDragOver = null;
    this.dragSourceGroup = null;
    this.dragSourcePath = [];
  }

  // --- Move group (reorder) ---

  moveGroup(index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.groups.length) return;
    [this.groups[index], this.groups[newIndex]] = [this.groups[newIndex], this.groups[index]];
    this.groups.forEach((g, i) => g.color = COLORS[i % COLORS.length]);
    const projectIds = this.groups.map(g => g.project._id!);
    this.projectService.reorder(projectIds, 'burndownSortOrder').subscribe({
      error: () => this.snackBar.open('Failed to save order', 'Close', { duration: 3000 }),
    });
  }

  // --- Remove ---

  removeTodo(group: ProjectGroup, path: number[]): void {
    const list = this.getParentList(group.project.todos, path);
    const idx = path[path.length - 1];
    const removed = list.splice(idx, 1)[0];
    this.recalcGroupProgress(group);
    this.recalcGlobal();
    this.saveTodos(group, () => {
      list.splice(idx, 0, removed);
      this.recalcGroupProgress(group);
      this.recalcGlobal();
    });
  }

  // --- Save & counting ---

  private saveTodos(group: ProjectGroup, rollback: () => void): void {
    this.projectService.update(group.project._id!, { todos: [...group.project.todos] }).subscribe({
      error: () => {
        rollback();
        this.snackBar.open('Failed to save todo', 'Close', { duration: 3000 });
      },
    });
  }

  private buildGroup(project: Project, idx: number): ProjectGroup {
    const totalTodos = this.countTodos(project.todos);
    const doneTodos = this.countDone(project.todos);
    return {
      project,
      color: COLORS[idx % COLORS.length],
      totalTodos,
      doneTodos,
      progressPercent: totalTodos > 0 ? (doneTodos / totalTodos) * 100 : 0,
      weeklyHours: this.calcWeeklyHours(project),
    };
  }

  private recalcGroupProgress(group: ProjectGroup): void {
    group.totalTodos = this.countTodos(group.project.todos);
    group.doneTodos = this.countDone(group.project.todos);
    group.progressPercent = group.totalTodos > 0
      ? (group.doneTodos / group.totalTodos) * 100
      : 0;
  }

  private recalcGlobal(): void {
    this.totalAll = this.groups.reduce((s, g) => s + g.totalTodos, 0);
    this.doneAll = this.groups.reduce((s, g) => s + g.doneTodos, 0);
  }

  private countTodos(todos: Todo[]): number {
    let count = 0;
    for (const t of todos) {
      count++;
      if (t.children?.length) count += this.countTodos(t.children);
    }
    return count;
  }

  private countDone(todos: Todo[]): number {
    let count = 0;
    for (const t of todos) {
      if (t.done) count++;
      if (t.children?.length) count += this.countDone(t.children);
    }
    return count;
  }

  private calcWeeklyHours(p: Project): number {
    const s = p.schedule;
    if (!s) return 0;
    return (s.monday || 0) + (s.tuesday || 0) + (s.wednesday || 0)
      + (s.thursday || 0) + (s.friday || 0) + (s.saturday || 0) + (s.sunday || 0);
  }
}
