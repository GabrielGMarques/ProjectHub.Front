import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService } from '../../services/project.service';
import { Project, WeeklySchedule } from '../../models/project.model';

interface TimeData {
  projectId: string;
  name: string;
  scheduled: number;
  timeSpent: number;
  color: string;
  percentage: number;
}

const COLORS = [
  '#D4AF37', '#22C55E', '#3B82F6', '#EC4899', '#F97316',
  '#A78BFA', '#06B6D4', '#EF4444', '#EAB308', '#8B5CF6',
];

@Component({
  selector: 'app-gantt',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="gantt-page">
      <div class="page-header">
        <h1>Time Allocation</h1>
        <p class="subtitle">Weekly hours distribution across your companies</p>
      </div>

      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (data.length === 0) {
        <div class="empty-state">
          <h2>No company data available</h2>
          <p>Add companies with scheduled time to see the chart.</p>
        </div>
      } @else {
        <div class="chart-container">
          <div class="chart-header">
            <span class="chart-title">Weekly Hours Distribution</span>
            <span class="total-badge">{{ totalScheduled }}h / week</span>
          </div>

          <!-- Bar chart -->
          <div class="gantt-chart">
            @for (item of data; track item.projectId) {
              <div class="gantt-row">
                <div class="gantt-label">{{ item.name }}</div>
                <div class="gantt-bar-track">
                  <div
                    class="gantt-bar"
                    [style.width.%]="item.percentage"
                    [style.backgroundColor]="item.color"
                  >
                    <span class="bar-text">{{ item.scheduled }}h ({{ item.percentage | number:'1.0-1' }}%)</span>
                  </div>
                  @if (item.timeSpent > 0) {
                    <div
                      class="gantt-bar spent-overlay"
                      [style.width.%]="totalScheduled > 0 ? (item.timeSpent / totalScheduled) * 100 : 0"
                    ></div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Stacked bar -->
          <div class="stacked-bar">
            @for (item of data; track item.projectId) {
              <div
                class="stacked-segment"
                [style.flex]="item.scheduled"
                [style.backgroundColor]="item.color"
                [title]="item.name + ': ' + item.scheduled + 'h'"
              ></div>
            }
          </div>

          <!-- Legend -->
          <div class="legend">
            @for (item of data; track item.projectId) {
              <div class="legend-item">
                <span class="legend-dot" [style.backgroundColor]="item.color"></span>
                <span class="legend-text">{{ item.name }}</span>
                <span class="legend-hours">{{ item.scheduled }}h</span>
                @if (item.timeSpent > 0) {
                  <span class="legend-spent" [class.over]="item.timeSpent > item.scheduled">
                    ({{ item.timeSpent }}h spent)
                  </span>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .gantt-page {
      padding: 0 24px 2rem;
      max-width: 1200px;
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
    }

    .chart-container {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }
    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .chart-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .total-badge {
      padding: 4px 12px;
      background: var(--color-border-light);
      border-radius: 100px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-primary);
    }

    .gantt-chart {
      margin-bottom: 1.5rem;
    }
    .gantt-row {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    .gantt-label {
      width: 160px;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--color-text);
      flex-shrink: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      padding-right: 12px;
    }
    .gantt-bar-track {
      flex: 1;
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      overflow: hidden;
      height: 32px;
      position: relative;
    }
    .gantt-bar {
      height: 100%;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      padding: 0 12px;
      transition: width 0.5s ease;
      min-width: fit-content;
    }
    .spent-overlay {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: rgba(255, 255, 255, 0.25);
      border-right: 2px solid rgba(255, 255, 255, 0.7);
      pointer-events: none;
    }
    .bar-text {
      color: white;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .stacked-bar {
      display: flex;
      height: 12px;
      border-radius: 100px;
      overflow: hidden;
      margin-bottom: 1.5rem;
      gap: 2px;
    }
    .stacked-segment {
      transition: flex 0.5s ease;
      border-radius: 100px;
      cursor: pointer;
    }
    .stacked-segment:hover { opacity: 0.8; }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .legend-text {
      font-size: 0.85rem;
      color: var(--color-text);
      font-weight: 500;
    }
    .legend-hours {
      font-size: 0.8rem;
      color: var(--color-text-subtle);
      font-weight: 600;
    }
    .legend-spent {
      font-size: 0.75rem;
      color: #22C55E;
      font-weight: 600;
    }
    .legend-spent.over {
      color: #EF4444;
    }
  `],
})
export class GanttComponent implements OnInit {
  data: TimeData[] = [];
  totalScheduled = 0;
  loading = true;

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => {
        const items = projects
          .map(p => ({
            projectId: p._id!,
            name: p.name,
            scheduled: this.calcWeeklyHours(p.schedule),
            timeSpent: p.timeSpent || 0,
          }))
          .filter(i => i.scheduled > 0);

        this.totalScheduled = items.reduce((sum, i) => sum + i.scheduled, 0);
        this.data = items.map((item, idx) => ({
          ...item,
          color: COLORS[idx % COLORS.length],
          percentage: this.totalScheduled > 0 ? (item.scheduled / this.totalScheduled) * 100 : 0,
        }));
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load time data', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  private calcWeeklyHours(s: WeeklySchedule): number {
    if (!s) return 0;
    return (s.monday || 0) + (s.tuesday || 0) + (s.wednesday || 0)
      + (s.thursday || 0) + (s.friday || 0) + (s.saturday || 0) + (s.sunday || 0);
  }
}
