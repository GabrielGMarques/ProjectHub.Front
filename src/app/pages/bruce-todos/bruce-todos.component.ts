import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BruceTodoService } from '../../services/bruce-todo.service';
import { BruceTodo } from '../../models/bruce-todo.model';

@Component({
  selector: 'app-bruce-todos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="todos-page">
      <div class="page-header">
        <div class="page-title">
          <h1><mat-icon>checklist</mat-icon> Bruce's Todos</h1>
          <p class="subtitle">Action items managed by you and Alfred</p>
        </div>
        <div class="page-actions">
          <div class="stats">
            <span class="stat open">{{ openCount }} open</span>
            <span class="stat done">{{ doneCount }} done</span>
          </div>
          @if (doneCount > 0) {
            <button class="btn-clear" (click)="clearDone()">
              <mat-icon>delete_sweep</mat-icon> Clear done
            </button>
          }
        </div>
      </div>

      <!-- Add todo -->
      <div class="add-bar">
        <input
          class="add-input"
          [(ngModel)]="newText"
          (keydown.enter)="addTodo()"
          placeholder="Add a new todo..."
        />
        <select class="priority-select" [(ngModel)]="newPriority">
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <button class="btn-add" (click)="addTodo()" [disabled]="!newText.trim()">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else {
        <!-- Open todos -->
        @if (openTodos.length) {
          <div class="section-label">Open</div>
          <div class="todo-list">
            @for (todo of openTodos; track todo._id) {
              <div class="todo-item" [class.high]="todo.priority === 'high'" [class.low]="todo.priority === 'low'">
                <button class="check-btn" (click)="toggle(todo)">
                  <mat-icon>radio_button_unchecked</mat-icon>
                </button>
                <div class="todo-content">
                  @if (editingId === todo._id) {
                    <input class="edit-input" [(ngModel)]="editText" (keydown.enter)="saveEdit(todo)" (keydown.escape)="cancelEdit()" (blur)="saveEdit(todo)" />
                  } @else {
                    <span class="todo-text" (dblclick)="startEdit(todo)">{{ todo.text }}</span>
                  }
                  <span class="todo-meta">
                    <span class="priority-dot" [attr.data-priority]="todo.priority"></span>
                    {{ todo.priority }}
                    <span class="age">{{ getAge(todo.createdAt) }}</span>
                  </span>
                </div>
                <button class="delete-btn" (click)="remove(todo)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          </div>
        }

        <!-- Done todos -->
        @if (doneTodos.length) {
          <div class="section-label done-label">Done</div>
          <div class="todo-list done-list">
            @for (todo of doneTodos; track todo._id) {
              <div class="todo-item done">
                <button class="check-btn" (click)="toggle(todo)">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <div class="todo-content">
                  <span class="todo-text">{{ todo.text }}</span>
                </div>
                <button class="delete-btn" (click)="remove(todo)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          </div>
        }

        @if (!openTodos.length && !doneTodos.length) {
          <div class="empty">
            <mat-icon>task_alt</mat-icon>
            <p>No todos yet. Add one above or let Alfred create them.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .todos-page {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .page-title h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
    }
    .page-title h1 mat-icon {
      color: var(--color-primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .subtitle {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin: 4px 0 0;
    }

    .page-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stats {
      display: flex;
      gap: 8px;
    }
    .stat {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 600;
    }
    .stat.open {
      background: rgba(212, 175, 55, 0.15);
      color: var(--color-primary);
    }
    .stat.done {
      background: rgba(34, 197, 94, 0.15);
      color: var(--color-success);
    }

    .btn-clear {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text-muted);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all var(--transition);
    }
    .btn-clear mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-clear:hover {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }

    /* Add bar */
    .add-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }
    .add-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-card);
      color: var(--color-text);
      font-size: 0.9rem;
      outline: none;
      transition: border-color var(--transition);
    }
    .add-input:focus {
      border-color: var(--color-primary);
    }
    .add-input::placeholder {
      color: var(--color-text-subtle);
    }
    .priority-select {
      padding: 10px 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-card);
      color: var(--color-text);
      font-size: 0.85rem;
      outline: none;
      cursor: pointer;
    }
    .btn-add {
      padding: 8px 12px;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--color-primary);
      color: #0A0A0A;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: opacity var(--transition);
    }
    .btn-add:disabled { opacity: 0.4; cursor: default; }
    .btn-add:hover:not(:disabled) { opacity: 0.85; }

    /* Sections */
    .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-primary);
      margin-bottom: 8px;
    }
    .done-label { color: var(--color-text-subtle); margin-top: 24px; }

    /* Todo list */
    .todo-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm);
      transition: all var(--transition);
    }
    .todo-item:hover {
      border-color: var(--color-border);
    }
    .todo-item.high {
      border-left: 3px solid var(--color-danger);
    }
    .todo-item.low {
      border-left: 3px solid var(--color-text-subtle);
    }
    .todo-item.done {
      opacity: 0.5;
    }
    .todo-item.done .todo-text {
      text-decoration: line-through;
    }

    .check-btn {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      color: var(--color-text-subtle);
      display: flex;
      transition: color var(--transition);
    }
    .check-btn:hover { color: var(--color-primary); }
    .todo-item.done .check-btn { color: var(--color-success); }

    .todo-content {
      flex: 1;
      min-width: 0;
    }
    .todo-text {
      display: block;
      color: var(--color-text);
      font-size: 0.9rem;
      cursor: default;
    }
    .todo-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--color-text-subtle);
      margin-top: 2px;
    }
    .priority-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-text-subtle);
    }
    .priority-dot[data-priority="high"] { background: var(--color-danger); }
    .priority-dot[data-priority="normal"] { background: var(--color-primary); }
    .priority-dot[data-priority="low"] { background: var(--color-text-subtle); }
    .age { margin-left: auto; }

    .edit-input {
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--color-primary);
      border-radius: 4px;
      background: var(--color-bg-card);
      color: var(--color-text);
      font-size: 0.9rem;
      outline: none;
    }

    .delete-btn {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      color: var(--color-text-subtle);
      display: flex;
      opacity: 0;
      transition: all var(--transition);
    }
    .todo-item:hover .delete-btn { opacity: 1; }
    .delete-btn:hover { color: var(--color-danger); }
    .delete-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Empty */
    .empty {
      text-align: center;
      padding: 48px 24px;
      color: var(--color-text-subtle);
    }
    .empty mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.3;
      margin-bottom: 12px;
    }
    .empty p { font-size: 0.9rem; }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
  `],
})
export class BruceTodosComponent implements OnInit {
  todos: BruceTodo[] = [];
  loading = true;
  newText = '';
  newPriority: 'low' | 'normal' | 'high' = 'normal';
  editingId = '';
  editText = '';

  get openTodos() { return this.todos.filter(t => !t.done); }
  get doneTodos() { return this.todos.filter(t => t.done); }
  get openCount() { return this.openTodos.length; }
  get doneCount() { return this.doneTodos.length; }

  constructor(private todoService: BruceTodoService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.todoService.list().subscribe({
      next: (todos) => { this.todos = todos; this.loading = false; },
      error: () => { this.loading = false; this.snackBar.open('Failed to load todos', '', { duration: 3000 }); },
    });
  }

  addTodo(): void {
    const text = this.newText.trim();
    if (!text) return;
    this.todoService.add(text, this.newPriority).subscribe({
      next: (todo) => {
        this.todos.unshift(todo);
        this.newText = '';
        this.newPriority = 'normal';
      },
      error: () => this.snackBar.open('Failed to add todo', '', { duration: 3000 }),
    });
  }

  toggle(todo: BruceTodo): void {
    this.todoService.toggle(todo._id).subscribe({
      next: (updated) => {
        const idx = this.todos.findIndex(t => t._id === todo._id);
        if (idx >= 0) this.todos[idx] = updated;
      },
      error: () => this.snackBar.open('Failed to update', '', { duration: 3000 }),
    });
  }

  remove(todo: BruceTodo): void {
    this.todoService.remove(todo._id).subscribe({
      next: () => { this.todos = this.todos.filter(t => t._id !== todo._id); },
      error: () => this.snackBar.open('Failed to remove', '', { duration: 3000 }),
    });
  }

  clearDone(): void {
    this.todoService.clearDone().subscribe({
      next: (r) => {
        this.todos = this.todos.filter(t => !t.done);
        this.snackBar.open(`Cleared ${r.cleared} done todo(s)`, '', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to clear', '', { duration: 3000 }),
    });
  }

  startEdit(todo: BruceTodo): void {
    this.editingId = todo._id;
    this.editText = todo.text;
  }

  saveEdit(todo: BruceTodo): void {
    const text = this.editText.trim();
    if (!text || text === todo.text) { this.cancelEdit(); return; }
    this.todoService.update(todo._id, { text }).subscribe({
      next: (updated) => {
        const idx = this.todos.findIndex(t => t._id === todo._id);
        if (idx >= 0) this.todos[idx] = updated;
        this.cancelEdit();
      },
      error: () => this.snackBar.open('Failed to update', '', { duration: 3000 }),
    });
  }

  cancelEdit(): void {
    this.editingId = '';
    this.editText = '';
  }

  getAge(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  }
}
