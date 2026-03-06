import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService } from '../../services/project.service';

interface TimeData {
  projectId: string;
  name: string;
  timeConsumption: number;
  color: string;
  percentage: number;
}

const COLORS = [
  '#3f51b5', '#e91e63', '#4caf50', '#ff9800', '#9c27b0',
  '#00bcd4', '#f44336', '#2196f3', '#8bc34a', '#ff5722',
];

@Component({
  selector: 'app-gantt',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="gantt-page">
      <h1>Time Allocation</h1>

      @if (loading) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (data.length === 0) {
        <div class="empty-state">
          <h2>No project data available</h2>
          <p>Add projects with time consumption to see the chart.</p>
        </div>
      } @else {
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Weekly Hours Distribution</mat-card-title>
            <mat-card-subtitle>Total: {{ totalHours }}h / week</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <!-- Gantt-style bar chart -->
            <div class="gantt-chart">
              @for (item of data; track item.projectId) {
                <div class="gantt-row">
                  <div class="gantt-label">{{ item.name }}</div>
                  <div class="gantt-bar-container">
                    <div
                      class="gantt-bar"
                      [style.width.%]="item.percentage"
                      [style.backgroundColor]="item.color"
                    >
                      <span class="bar-text">{{ item.timeConsumption }}h ({{ item.percentage | number:'1.0-1' }}%)</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Stacked bar visualization -->
            <div class="stacked-bar">
              @for (item of data; track item.projectId) {
                <div
                  class="stacked-segment"
                  [style.flex]="item.timeConsumption"
                  [style.backgroundColor]="item.color"
                  [title]="item.name + ': ' + item.timeConsumption + 'h'"
                ></div>
              }
            </div>

            <!-- Legend -->
            <div class="legend">
              @for (item of data; track item.projectId) {
                <div class="legend-item">
                  <span class="legend-color" [style.backgroundColor]="item.color"></span>
                  <span class="legend-text">{{ item.name }}</span>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .gantt-page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 2rem; }
    .chart-card { padding: 1rem; }
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

    .gantt-chart {
      margin: 1.5rem 0;
    }
    .gantt-row {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .gantt-label {
      width: 150px;
      font-weight: 500;
      font-size: 0.9rem;
      flex-shrink: 0;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .gantt-bar-container {
      flex: 1;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      height: 32px;
    }
    .gantt-bar {
      height: 100%;
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding: 0 0.75rem;
      transition: width 0.5s ease;
      min-width: fit-content;
    }
    .bar-text {
      color: white;
      font-size: 0.8rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .stacked-bar {
      display: flex;
      height: 40px;
      border-radius: 6px;
      overflow: hidden;
      margin: 2rem 0 1rem;
    }
    .stacked-segment {
      transition: flex 0.5s ease;
      cursor: pointer;
      &:hover { opacity: 0.85; }
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 1rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    .legend-text { font-size: 0.85rem; }
  `],
})
export class GanttComponent implements OnInit {
  data: TimeData[] = [];
  totalHours = 0;
  loading = true;

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectService.getTimeAllocation().subscribe({
      next: (items) => {
        this.totalHours = items.reduce((sum, i) => sum + i.timeConsumption, 0);
        this.data = items
          .filter((i) => i.timeConsumption > 0)
          .map((item, idx) => ({
            ...item,
            color: COLORS[idx % COLORS.length],
            percentage: this.totalHours > 0 ? (item.timeConsumption / this.totalHours) * 100 : 0,
          }));
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load time data', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }
}
