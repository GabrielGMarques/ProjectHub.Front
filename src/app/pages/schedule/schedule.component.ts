import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectService } from '../../services/project.service';
import { Project, WeeklySchedule } from '../../models/project.model';

const COLORS = [
  '#D4AF37', '#22C55E', '#3B82F6', '#EC4899', '#F97316',
  '#A78BFA', '#06B6D4', '#EF4444', '#EAB308', '#8B5CF6',
];

const DAYS: (keyof WeeklySchedule)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
  dayKey: keyof WeeklySchedule;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <div>
          <h1>Schedule</h1>
          <p class="subtitle">Weekly work schedule across your projects</p>
        </div>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (projects.length === 0) {
        <div class="empty-state">
          <div class="empty-icon"><mat-icon>calendar_month</mat-icon></div>
          <h2>No projects yet</h2>
          <p>Add projects to start planning your schedule.</p>
        </div>
      } @else {
        <!-- Controls -->
        <div class="controls">
          <div class="view-toggle">
            <button [class.active]="view === 'week'" (click)="view = 'week'">Week</button>
            <button [class.active]="view === 'month'" (click)="view = 'month'">Month</button>
          </div>
          <div class="nav-group">
            <button class="nav-btn" (click)="prev()"><mat-icon>chevron_left</mat-icon></button>
            <span class="current-label">{{ currentLabel }}</span>
            <button class="nav-btn" (click)="next()"><mat-icon>chevron_right</mat-icon></button>
            <button class="today-btn" (click)="goToday()">Today</button>
          </div>
          <button class="edit-toggle" (click)="showEditor = !showEditor">
            <mat-icon>{{ showEditor ? 'visibility' : 'edit_calendar' }}</mat-icon>
            {{ showEditor ? 'View Schedule' : 'Edit Schedule' }}
          </button>
        </div>

        @if (showEditor) {
          <!-- Schedule Editor -->
          <div class="editor-card">
            <div class="editor-scroll">
              <table class="editor-table">
                <thead>
                  <tr>
                    <th class="project-col">Project</th>
                    @for (d of dayShort; track d) {
                      <th>{{ d }}</th>
                    }
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (project of projects; track project._id; let i = $index) {
                    <tr>
                      <td class="project-col">
                        <span class="color-dot" [style.backgroundColor]="getColor(i)"></span>
                        {{ project.name }}
                      </td>
                      @for (day of days; track day) {
                        <td>
                          <input type="number" class="hour-input" min="0" max="24" step="0.5"
                            [value]="getHours(project, day)"
                            (change)="updateSchedule(project, day, $event)" />
                        </td>
                      }
                      <td class="total-cell">{{ getProjectTotal(project) }}h</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td class="project-col"><strong>Total</strong></td>
                    @for (day of days; track day) {
                      <td><strong>{{ getDayTotal(day) }}h</strong></td>
                    }
                    <td class="total-cell"><strong>{{ grandTotal }}h</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        } @else {
          @if (view === 'week') {
            <!-- Week View -->
            <div class="week-grid">
              @for (day of weekDays; track day.key) {
                <div class="day-column" [class.today]="isToday(day.date)">
                  <div class="day-header">
                    <span class="day-name">{{ day.short }}</span>
                    @if (isToday(day.date)) {
                      <span class="day-date today-badge">{{ day.date.getDate() }}</span>
                    } @else {
                      <span class="day-date">{{ day.date.getDate() }}</span>
                    }
                  </div>
                  <div class="day-content">
                    @for (block of getBlocksForDay(day.key); track block.id) {
                      <div class="project-block" [style.borderLeftColor]="block.color">
                        <span class="block-name">{{ block.name }}</span>
                        <span class="block-hours">{{ block.hours }}h</span>
                      </div>
                    }
                    @if (getBlocksForDay(day.key).length === 0) {
                      <div class="no-work">--</div>
                    }
                  </div>
                  <div class="day-total" [class.has-hours]="getDayTotal(day.key) > 0">
                    {{ getDayTotal(day.key) }}h
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Month View -->
            <div class="month-container">
              <div class="month-header-row">
                @for (d of dayShort; track d) {
                  <div class="month-header-cell">{{ d }}</div>
                }
              </div>
              @for (week of calendarWeeks; track $index) {
                <div class="month-week-row">
                  @for (cell of week; track $index) {
                    <div class="month-cell" [class.other-month]="!cell.currentMonth" [class.today]="cell.isToday">
                      <span class="cell-date" [class.today-badge]="cell.isToday">{{ cell.date.getDate() }}</span>
                      <div class="cell-blocks">
                        @for (block of getBlocksForDay(cell.dayKey); track block.id) {
                          <div class="cell-block" [style.backgroundColor]="block.color"
                            [matTooltip]="block.name + ': ' + block.hours + 'h'">
                            {{ block.hours }}
                          </div>
                        }
                      </div>
                      @if (getDayTotal(cell.dayKey) > 0 && cell.currentMonth) {
                        <span class="cell-total">{{ getDayTotal(cell.dayKey) }}h</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Legend -->
          @if (hasAnySchedule) {
            <div class="legend">
              @for (project of projects; track project._id; let i = $index) {
                @if (getProjectTotal(project) > 0) {
                  <div class="legend-item">
                    <span class="legend-dot" [style.backgroundColor]="getColor(i)"></span>
                    <span class="legend-name">{{ project.name }}</span>
                    <span class="legend-hours">{{ getProjectTotal(project) }}h/wk</span>
                  </div>
                }
              }
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .schedule-page { padding: 0 24px 2rem; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; padding-top: 0.5rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.02em; }
    .subtitle { margin: 4px 0 0; font-size: 0.9rem; color: var(--color-text-subtle); }
    .loading { display: flex; justify-content: center; padding: 4rem; }
    .empty-state { text-align: center; padding: 5rem 2rem; }
    .empty-icon {
      width: 72px; height: 72px; margin: 0 auto 1.25rem;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-border-light); border-radius: var(--radius-md);
    }
    .empty-icon mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--color-text-subtle); }
    .empty-state h2 { color: var(--color-text); font-weight: 700; margin: 0 0 0.5rem; }
    .empty-state p { color: var(--color-text-subtle); margin: 0; }

    /* Controls */
    .controls { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .view-toggle {
      display: flex; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); overflow: hidden;
    }
    .view-toggle button {
      padding: 8px 16px; border: none; background: none; color: var(--color-text-subtle);
      font-family: var(--font-family); font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: all var(--transition);
    }
    .view-toggle button.active { background: var(--color-primary); color: #0A0A0A; }
    .view-toggle button:hover:not(.active) { color: var(--color-text); }
    .nav-group { display: flex; align-items: center; gap: 8px; }
    .nav-btn {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border-light); background: var(--color-bg-card);
      border-radius: var(--radius-sm); color: var(--color-text-subtle); cursor: pointer;
      transition: all var(--transition);
    }
    .nav-btn:hover { border-color: var(--color-border); color: var(--color-primary); }
    .nav-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .current-label { font-size: 0.95rem; font-weight: 600; color: var(--color-text); min-width: 220px; text-align: center; }
    .today-btn {
      padding: 6px 14px; border: 1px solid var(--color-border-light); background: var(--color-bg-card);
      border-radius: var(--radius-sm); color: var(--color-text-subtle); font-family: var(--font-family);
      font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all var(--transition);
    }
    .today-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .edit-toggle {
      margin-left: auto; display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border: 1px solid var(--color-border-light); background: var(--color-bg-card);
      border-radius: var(--radius-sm); color: var(--color-text-subtle); font-family: var(--font-family);
      font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all var(--transition);
    }
    .edit-toggle:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .edit-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Week View */
    .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .day-column {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); display: flex; flex-direction: column; min-height: 220px;
    }
    .day-column.today { border-color: var(--color-primary); }
    .day-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px; border-bottom: 1px solid var(--color-border-light);
    }
    .day-column.today .day-header { background: rgba(212, 175, 55, 0.08); }
    .day-name {
      font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--color-text-subtle);
    }
    .day-column.today .day-name { color: var(--color-primary); }
    .day-date { font-size: 0.85rem; font-weight: 700; color: var(--color-text); }
    .today-badge {
      background: var(--color-primary) !important; color: #0A0A0A !important;
      width: 24px; height: 24px; display: inline-flex; align-items: center;
      justify-content: center; border-radius: 50%; font-size: 0.75rem;
    }
    .day-content { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
    .project-block {
      padding: 8px 10px; border-left: 3px solid; background: var(--color-bg);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .block-name {
      font-size: 0.78rem; font-weight: 600; color: var(--color-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .block-hours { font-size: 0.75rem; font-weight: 700; color: var(--color-primary); flex-shrink: 0; margin-left: 4px; }
    .no-work { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--color-border); font-size: 0.85rem; }
    .day-total {
      padding: 8px 12px; border-top: 1px solid var(--color-border-light);
      text-align: center; font-size: 0.8rem; font-weight: 600; color: var(--color-text-subtle);
    }
    .day-total.has-hours { color: var(--color-primary); }

    /* Month View */
    .month-container {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); overflow: hidden;
    }
    .month-header-row { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--color-border-light); }
    .month-header-cell {
      padding: 10px; text-align: center; font-size: 0.8rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-subtle);
    }
    .month-week-row { display: grid; grid-template-columns: repeat(7, 1fr); }
    .month-cell {
      padding: 8px; min-height: 90px; border-right: 1px solid var(--color-border-light);
      border-bottom: 1px solid var(--color-border-light);
      display: flex; flex-direction: column; gap: 4px;
    }
    .month-cell:nth-child(7) { border-right: none; }
    .month-cell.other-month { opacity: 0.3; }
    .month-cell.today { background: rgba(212, 175, 55, 0.06); }
    .cell-date { font-size: 0.8rem; font-weight: 600; color: var(--color-text); }
    .cell-blocks { display: flex; flex-wrap: wrap; gap: 3px; }
    .cell-block {
      padding: 2px 6px; border-radius: 3px; font-size: 0.65rem;
      font-weight: 700; color: #0A0A0A; cursor: default;
    }
    .cell-total { margin-top: auto; font-size: 0.7rem; font-weight: 600; color: var(--color-text-subtle); }

    /* Editor */
    .editor-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 1.25rem;
    }
    .editor-scroll { overflow-x: auto; }
    .editor-table { width: 100%; border-collapse: collapse; }
    .editor-table th, .editor-table td { padding: 10px; text-align: center; border-bottom: 1px solid var(--color-border-light); }
    .editor-table th {
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--color-text-subtle);
    }
    .editor-table td { font-size: 0.85rem; color: var(--color-text); }
    .project-col { text-align: left !important; min-width: 150px; white-space: nowrap; }
    .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
    .hour-input {
      width: 54px; padding: 6px 4px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text);
      font-family: var(--font-family); font-size: 0.85rem; font-weight: 600;
      text-align: center; outline: none; transition: border-color var(--transition);
    }
    .hour-input:focus { border-color: var(--color-primary); }
    .total-cell { font-weight: 700 !important; color: var(--color-primary) !important; }
    .editor-table tfoot td { border-top: 2px solid var(--color-border); border-bottom: none; }

    /* Legend */
    .legend {
      display: flex; flex-wrap: wrap; gap: 16px; margin-top: 1.25rem;
      padding: 1rem 1.25rem; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-name { font-size: 0.85rem; font-weight: 600; color: var(--color-text); }
    .legend-hours { font-size: 0.8rem; color: var(--color-text-subtle); font-weight: 500; }
  `],
})
export class ScheduleComponent implements OnInit {
  projects: Project[] = [];
  loading = true;
  view: 'week' | 'month' = 'week';
  currentDate = new Date();
  showEditor = false;

  readonly days = DAYS;
  readonly dayShort = DAY_SHORT;

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
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

  getColor(index: number): string {
    return COLORS[index % COLORS.length];
  }

  getHours(project: Project, day: keyof WeeklySchedule): number {
    return project.schedule?.[day] || 0;
  }

  getProjectTotal(project: Project): number {
    return DAYS.reduce((sum, day) => sum + this.getHours(project, day), 0);
  }

  getDayTotal(day: keyof WeeklySchedule): number {
    return this.projects.reduce((sum, p) => sum + this.getHours(p, day), 0);
  }

  get grandTotal(): number {
    return DAYS.reduce((sum, day) => sum + this.getDayTotal(day), 0);
  }

  get hasAnySchedule(): boolean {
    return this.projects.some(p => this.getProjectTotal(p) > 0);
  }

  getBlocksForDay(dayKey: keyof WeeklySchedule): { id: string; name: string; hours: number; color: string }[] {
    return this.projects
      .map((p, i) => ({ id: p._id!, name: p.name, hours: this.getHours(p, dayKey), color: COLORS[i % COLORS.length] }))
      .filter(b => b.hours > 0);
  }

  // Week navigation
  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  get weekDays(): { key: keyof WeeklySchedule; short: string; date: Date }[] {
    const monday = this.getMonday(this.currentDate);
    return DAYS.map((key, i) => ({
      key,
      short: DAY_SHORT[i],
      date: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
    }));
  }

  get currentLabel(): string {
    if (this.view === 'week') {
      const start = this.getMonday(this.currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
    }
    return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get calendarWeeks(): CalendarDay[][] {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const first = new Date(year, month, 1);
    let dow = first.getDay();
    dow = dow === 0 ? 6 : dow - 1; // Monday=0 based

    const calStart = new Date(year, month, 1 - dow);
    const today = new Date();
    const weeks: CalendarDay[][] = [];
    const d = new Date(calStart);

    for (let w = 0; w < 6; w++) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        week.push({
          date: new Date(d),
          currentMonth: d.getMonth() === month,
          isToday: d.toDateString() === today.toDateString(),
          dayKey: DAYS[i],
        });
        d.setDate(d.getDate() + 1);
      }
      weeks.push(week);
      if (w >= 3 && d.getMonth() !== month) break;
    }
    return weeks;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  prev(): void {
    const d = new Date(this.currentDate);
    if (this.view === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    this.currentDate = d;
  }

  next(): void {
    const d = new Date(this.currentDate);
    if (this.view === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    this.currentDate = d;
  }

  goToday(): void {
    this.currentDate = new Date();
  }

  updateSchedule(project: Project, day: keyof WeeklySchedule, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    if (!project.schedule) {
      project.schedule = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
    }
    project.schedule[day] = value;
    const timeConsumption = DAYS.reduce((sum, d) => sum + (project.schedule[d] || 0), 0);
    project.timeConsumption = timeConsumption;
    this.projectService.update(project._id!, { schedule: project.schedule, timeConsumption }).subscribe({
      error: () => this.snackBar.open('Failed to save schedule', 'Close', { duration: 3000 }),
    });
  }
}
