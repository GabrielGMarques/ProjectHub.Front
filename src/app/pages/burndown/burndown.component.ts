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
import { Project, Todo } from '../../models/project.model';

interface ProjectGroup {
  project: Project;
  color: string;
  totalTodos: number;
  doneTodos: number;
  progressPercent: number;
  weeklyHours: number;
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
        <!-- Global stats -->
        <div class="stats-bar">
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

        <!-- Global progress bar -->
        <div class="global-progress-track">
          <div class="global-progress-fill" [style.width.%]="globalPercent"></div>
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
          <div class="todo-row" [class.done]="todo.done" [style.paddingLeft.px]="depth * 24">
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

    /* Stats */
    .stats-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .stat {
      flex: 1;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .done-value { color: #22C55E; }
    .remaining-value { color: var(--color-primary); }
    .stat-label {
      font-size: 0.78rem;
      color: var(--color-text-subtle);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Global progress */
    .global-progress-track {
      height: 8px;
      background: var(--color-border-light);
      border-radius: 100px;
      overflow: hidden;
      margin-bottom: 1.5rem;
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
        this.recalcGlobal();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
        this.loading = false;
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
