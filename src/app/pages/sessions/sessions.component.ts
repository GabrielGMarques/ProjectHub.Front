import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmployeeService, EmployeeSession, SessionDetailResponse } from '../../services/employee.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="sessions-page">
      <div class="page-header">
        <div>
          <h1>Session History</h1>
          <p class="subtitle">Every SDK session for every employee, ordered by start date</p>
        </div>
        <div class="header-actions">
          <button class="refresh-btn" (click)="loadAll()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      @if (loading && sessions.length === 0) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else {
        <!-- Aggregate stats -->
        @if (sessions.length > 0) {
          <div class="stats-row">
            <div class="stat-card">
              <span class="stat-value">{{ total }}</span>
              <span class="stat-label">Total Sessions</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ activeCount }}</span>
              <span class="stat-label">Currently Active</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ formatTokens(pageTokens) }}</span>
              <span class="stat-label">Page Tokens</span>
            </div>
            <div class="stat-card cost">
              <span class="stat-value">\${{ pageCost.toFixed(2) }}</span>
              <span class="stat-label">Page Cost</span>
            </div>
          </div>
        }

        <!-- Sessions table -->
        <div class="sessions-table">
          <div class="table-header">
            <div class="th col-employee">Employee</div>
            <div class="th col-project">Project</div>
            <div class="th col-model">Model</div>
            <div class="th col-times">Started → Ended</div>
            <div class="th col-duration">Duration</div>
            <div class="th col-tasks">Tasks</div>
            <div class="th col-tokens">Tokens</div>
            <div class="th col-cost">Cost</div>
            <div class="th col-status">Reason</div>
          </div>
          @for (s of sessions; track s._id) {
            <div class="session-row" (click)="openDetail(s)">
              <div class="td col-employee">
                <div class="emp-name">{{ s.employeeName }}</div>
                <div class="emp-role">{{ s.employeeRole }}</div>
              </div>
              <div class="td col-project">{{ s.projectName }}</div>
              <div class="td col-model">
                <span class="model-badge">{{ shortModel(s.aiModel) }}</span>
              </div>
              <div class="td col-times">
                <div class="time-line">{{ formatDateTime(s.startedAt) }}</div>
                <div class="time-line subtle">{{ s.endedAt ? formatDateTime(s.endedAt) : '— still active' }}</div>
              </div>
              <div class="td col-duration">{{ formatDuration(s.durationMs) }}</div>
              <div class="td col-tasks">
                <span class="num">{{ s.numTasks }}</span>
                <span class="subtle"> ({{ s.numTurns }} turns)</span>
              </div>
              <div class="td col-tokens">{{ formatTokens(s.totalTokens) }}</div>
              <div class="td col-cost">\${{ s.costUsd.toFixed(3) }}</div>
              <div class="td col-status">
                @if (s.endReason) {
                  <span class="reason-badge" [attr.data-reason]="s.endReason">{{ s.endReason }}</span>
                } @else {
                  <span class="reason-badge active">active</span>
                }
              </div>
            </div>
          }
          @if (sessions.length === 0 && !loading) {
            <div class="no-data">No sessions yet. Sessions appear once an employee starts working.</div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages > 1) {
          <div class="pagination">
            <button (click)="goToPage(page - 1)" [disabled]="page <= 1">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
            <button (click)="goToPage(page + 1)" [disabled]="page >= totalPages">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        }
      }

      <!-- Detail drawer -->
      @if (selectedSession) {
        <div class="detail-overlay" (click)="closeDetail()">
          <div class="detail-drawer" (click)="$event.stopPropagation()">
            <div class="detail-header">
              <div>
                <h2>{{ selectedSession.session.employeeName }}</h2>
                <p class="detail-subtitle">
                  {{ selectedSession.session.employeeRole }} · {{ selectedSession.session.projectName }}
                </p>
              </div>
              <button class="close-btn" (click)="closeDetail()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="detail-stats">
              <div class="ds">
                <span class="ds-label">Started</span>
                <span>{{ formatDateTime(selectedSession.session.startedAt) }}</span>
              </div>
              <div class="ds">
                <span class="ds-label">Ended</span>
                <span>{{ selectedSession.session.endedAt ? formatDateTime(selectedSession.session.endedAt) : 'Still active' }}</span>
              </div>
              <div class="ds">
                <span class="ds-label">Duration</span>
                <span>{{ formatDuration(selectedSession.session.durationMs) }}</span>
              </div>
              <div class="ds">
                <span class="ds-label">Model</span>
                <span class="model-badge">{{ shortModel(selectedSession.session.aiModel) }}</span>
              </div>
              <div class="ds">
                <span class="ds-label">Reason</span>
                @if (selectedSession.session.endReason) {
                  <span class="reason-badge" [attr.data-reason]="selectedSession.session.endReason">
                    {{ selectedSession.session.endReason }}
                  </span>
                } @else {
                  <span class="reason-badge active">active</span>
                }
              </div>
              <div class="ds">
                <span class="ds-label">Total Tokens</span>
                <span>{{ formatTokens(selectedSession.session.totalTokens) }}</span>
              </div>
              <div class="ds">
                <span class="ds-label">Cost</span>
                <span class="cost">\${{ selectedSession.session.costUsd.toFixed(4) }}</span>
              </div>
              <div class="ds">
                <span class="ds-label">Turns / Segments</span>
                <span>{{ selectedSession.session.numTurns }} / {{ selectedSession.session.numSegments }}</span>
              </div>
            </div>

            <!-- Token breakdown -->
            <div class="detail-section">
              <h3>Token Breakdown</h3>
              <div class="token-breakdown">
                <div class="tb">
                  <span class="tb-label">Input</span>
                  <span class="tb-value">{{ selectedSession.session.inputTokens.toLocaleString() }}</span>
                </div>
                <div class="tb">
                  <span class="tb-label">Output</span>
                  <span class="tb-value">{{ selectedSession.session.outputTokens.toLocaleString() }}</span>
                </div>
                <div class="tb">
                  <span class="tb-label">Cache Read</span>
                  <span class="tb-value">{{ selectedSession.session.cacheReadTokens.toLocaleString() }}</span>
                </div>
                <div class="tb">
                  <span class="tb-label">Cache Create</span>
                  <span class="tb-value">{{ selectedSession.session.cacheCreationTokens.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Tabs: tasks / logs -->
            <div class="detail-tabs">
              <button class="tab-btn" [class.active]="detailTab === 'tasks'" (click)="detailTab = 'tasks'">
                Tasks ({{ selectedSession.tasks.length }})
              </button>
              <button class="tab-btn" [class.active]="detailTab === 'logs'" (click)="detailTab = 'logs'">
                Logs ({{ selectedSession.logs.length }})
              </button>
            </div>

            @if (detailTab === 'tasks') {
              <div class="task-list">
                @for (t of selectedSession.tasks; track t.taskId) {
                  <div class="task-row" [attr.data-status]="t.status">
                    <div class="task-head">
                      <span class="task-status-badge" [attr.data-status]="t.status">{{ t.status }}</span>
                      <span class="task-time">
                        @if (t.startedAt) { {{ formatDateTime(t.startedAt) }} }
                        @if (t.completedAt) { → {{ formatDateTime(t.completedAt) }} }
                      </span>
                    </div>
                    <div class="task-desc">{{ t.description }}</div>
                    @if (t.result) {
                      <details class="task-result">
                        <summary>Result</summary>
                        <pre>{{ t.result }}</pre>
                      </details>
                    }
                  </div>
                }
                @if (selectedSession.tasks.length === 0) {
                  <div class="no-data-small">No tasks recorded for this session.</div>
                }
              </div>
            }

            @if (detailTab === 'logs') {
              <div class="log-list">
                @for (log of selectedSession.logs; track log._id) {
                  <div class="log-row" [attr.data-cat]="log.category">
                    <span class="log-time">{{ formatTime(log.createdAt) }}</span>
                    <span class="log-cat">{{ log.category }}</span>
                    <span class="log-content">{{ log.content }}</span>
                  </div>
                }
                @if (selectedSession.logs.length === 0) {
                  <div class="no-data-small">No logs recorded in this session's time window.</div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sessions-page {
      padding: 1.5rem 2rem; max-width: 1600px; margin: 0 auto;
      color: var(--color-text);
    }
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .page-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; }
    .subtitle { margin: 0; font-size: 0.85rem; color: var(--color-text-subtle); }
    .header-actions { display: flex; gap: 8px; }
    .refresh-btn {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); background: var(--color-bg-card);
      color: var(--color-text); border-radius: var(--radius-sm); cursor: pointer;
    }
    .refresh-btn:hover { border-color: var(--color-primary); }

    .loading {
      display: flex; justify-content: center; align-items: center; padding: 4rem;
    }

    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      margin-bottom: 1.25rem;
    }
    .stat-card {
      padding: 14px 18px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      display: flex; flex-direction: column; gap: 4px;
    }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--color-text); }
    .stat-label { font-size: 0.72rem; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-card.cost .stat-value { color: #a78bfa; }

    .sessions-table {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); overflow: hidden;
    }
    .table-header, .session-row {
      display: grid;
      grid-template-columns: 1.4fr 1.2fr 0.8fr 1.5fr 0.8fr 0.9fr 0.9fr 0.7fr 0.9fr;
      gap: 8px; padding: 10px 14px; align-items: center;
      font-size: 0.78rem;
    }
    .table-header {
      background: var(--color-bg-elevated); border-bottom: 1px solid var(--color-border);
      font-weight: 700; text-transform: uppercase; font-size: 0.68rem;
      color: var(--color-text-subtle); letter-spacing: 0.04em;
    }
    .session-row {
      cursor: pointer; transition: background 0.15s;
      border-bottom: 1px solid var(--color-border-light);
    }
    .session-row:hover { background: var(--color-bg-elevated); }
    .session-row:last-child { border-bottom: none; }

    .emp-name { font-weight: 700; color: var(--color-text); }
    .emp-role { font-size: 0.68rem; color: var(--color-text-subtle); margin-top: 2px; }

    .model-badge {
      display: inline-block; padding: 2px 8px; border-radius: 100px;
      background: rgba(168,85,247,0.12); color: #a78bfa;
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    }

    .time-line { font-variant-numeric: tabular-nums; }
    .time-line.subtle { font-size: 0.7rem; color: var(--color-text-subtle); margin-top: 2px; }
    .subtle { color: var(--color-text-subtle); }
    .num { font-weight: 700; }

    .reason-badge {
      display: inline-block; padding: 2px 8px; border-radius: 100px;
      background: rgba(255,255,255,0.06); color: var(--color-text-subtle);
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    }
    .reason-badge[data-reason="dismissed"] { background: rgba(34,197,94,0.12); color: #22c55e; }
    .reason-badge[data-reason="completed"] { background: rgba(34,197,94,0.12); color: #22c55e; }
    .reason-badge[data-reason="cancelled"] { background: rgba(212,175,55,0.12); color: var(--color-primary); }
    .reason-badge[data-reason="failed"] { background: rgba(239,68,68,0.12); color: #ef4444; }
    .reason-badge[data-reason="restarted"] { background: rgba(59,130,246,0.12); color: #60a5fa; }
    .reason-badge.active { background: rgba(59,130,246,0.12); color: #60a5fa; }

    .no-data { padding: 3rem 1rem; text-align: center; color: var(--color-text-subtle); }
    .no-data-small { padding: 1.5rem; text-align: center; color: var(--color-text-subtle); font-size: 0.82rem; }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      margin-top: 1rem;
    }
    .pagination button {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); background: var(--color-bg-card);
      color: var(--color-text); border-radius: var(--radius-sm); cursor: pointer;
    }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination button:hover:not(:disabled) { border-color: var(--color-primary); }
    .page-info { font-size: 0.82rem; color: var(--color-text-subtle); }

    /* Detail drawer */
    .detail-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; justify-content: flex-end; z-index: 1000;
    }
    .detail-drawer {
      width: 720px; max-width: 90vw; height: 100vh; overflow-y: auto;
      background: var(--color-bg); border-left: 1px solid var(--color-border);
      padding: 1.5rem 2rem;
    }
    .detail-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1rem;
    }
    .detail-header h2 { margin: 0 0 4px; font-size: 1.25rem; font-weight: 700; }
    .detail-subtitle { margin: 0; font-size: 0.85rem; color: var(--color-text-subtle); }
    .close-btn {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      color: var(--color-text); cursor: pointer;
    }
    .close-btn:hover { border-color: var(--color-primary); }

    .detail-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px;
      padding: 14px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      margin-bottom: 1rem;
    }
    .ds { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; }
    .ds-label {
      font-size: 0.65rem; color: var(--color-text-subtle); text-transform: uppercase;
      letter-spacing: 0.04em; font-weight: 700;
    }
    .ds .cost { color: #a78bfa; font-weight: 700; }

    .detail-section { margin-bottom: 1rem; }
    .detail-section h3 {
      font-size: 0.85rem; font-weight: 700; margin: 0 0 8px;
      color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.04em;
    }
    .token-breakdown {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    }
    .tb {
      padding: 10px 12px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      display: flex; flex-direction: column; gap: 4px;
    }
    .tb-label { font-size: 0.65rem; color: var(--color-text-subtle); text-transform: uppercase; }
    .tb-value { font-size: 0.95rem; font-weight: 700; font-variant-numeric: tabular-nums; }

    .detail-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); margin-bottom: 0.75rem; }
    .tab-btn {
      padding: 8px 14px; background: none; border: none; color: var(--color-text-subtle);
      font-family: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .tab-btn:hover:not(.active) { color: var(--color-text); }

    .task-list, .log-list { display: flex; flex-direction: column; gap: 6px; }
    .task-row {
      padding: 10px 12px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      border-left: 3px solid var(--color-border);
    }
    .task-row[data-status="completed"] { border-left-color: #22c55e; }
    .task-row[data-status="failed"] { border-left-color: #ef4444; }
    .task-row[data-status="in_progress"] { border-left-color: #60a5fa; }

    .task-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .task-status-badge {
      font-size: 0.6rem; font-weight: 700; padding: 2px 8px; border-radius: 100px;
      background: rgba(255,255,255,0.06); color: var(--color-text-subtle); text-transform: uppercase;
    }
    .task-status-badge[data-status="completed"] { background: rgba(34,197,94,0.12); color: #22c55e; }
    .task-status-badge[data-status="failed"] { background: rgba(239,68,68,0.12); color: #ef4444; }
    .task-status-badge[data-status="in_progress"] { background: rgba(59,130,246,0.12); color: #60a5fa; }

    .task-time { font-size: 0.7rem; color: var(--color-text-subtle); font-variant-numeric: tabular-nums; }
    .task-desc { font-size: 0.85rem; color: var(--color-text); white-space: pre-wrap; word-break: break-word; }
    .task-result { margin-top: 8px; }
    .task-result summary {
      font-size: 0.7rem; color: var(--color-text-subtle); cursor: pointer;
      text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;
    }
    .task-result pre {
      margin: 6px 0 0; padding: 8px; font-size: 0.72rem;
      background: rgba(0,0,0,0.2); border-radius: 4px; max-height: 200px; overflow: auto;
      white-space: pre-wrap; word-break: break-word;
    }

    .log-row {
      display: grid; grid-template-columns: 80px 100px 1fr; gap: 8px;
      padding: 6px 10px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      font-size: 0.72rem; align-items: start;
    }
    .log-time { color: var(--color-text-subtle); font-variant-numeric: tabular-nums; }
    .log-cat {
      font-size: 0.6rem; font-weight: 700; padding: 1px 6px; border-radius: 100px;
      background: rgba(255,255,255,0.06); color: var(--color-text-subtle);
      text-transform: uppercase; height: fit-content; text-align: center;
    }
    .log-row[data-cat="task_start"] .log-cat { background: rgba(59,130,246,0.12); color: #60a5fa; }
    .log-row[data-cat="task_complete"] .log-cat { background: rgba(34,197,94,0.12); color: #22c55e; }
    .log-row[data-cat="task_fail"] .log-cat { background: rgba(239,68,68,0.12); color: #ef4444; }
    .log-row[data-cat="tool_use"] .log-cat { background: rgba(212,175,55,0.12); color: var(--color-primary); }
    .log-row[data-cat="error"] .log-cat { background: rgba(239,68,68,0.12); color: #ef4444; }
    .log-row[data-cat="token_usage"] .log-cat { background: rgba(168,85,247,0.12); color: #a78bfa; }
    .log-content { color: var(--color-text); white-space: pre-wrap; word-break: break-word; }
  `],
})
export class SessionsComponent implements OnInit {
  loading = true;
  sessions: EmployeeSession[] = [];
  total = 0;
  page = 1;
  pageSize = 50;

  selectedSession: SessionDetailResponse | null = null;
  detailTab: 'tasks' | 'logs' = 'tasks';

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.employeeService.getAllSessions(this.page, this.pageSize).subscribe({
      next: (result) => {
        this.sessions = result.sessions;
        this.total = result.total;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page = page;
    this.loadAll();
  }

  openDetail(session: EmployeeSession): void {
    this.selectedSession = null;
    this.detailTab = 'tasks';
    this.employeeService.getSessionDetail(session._id).subscribe({
      next: (result) => { this.selectedSession = result; },
    });
  }

  closeDetail(): void {
    this.selectedSession = null;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get activeCount(): number {
    return this.sessions.filter(s => !s.endedAt).length;
  }

  get pageTokens(): number {
    return this.sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
  }

  get pageCost(): number {
    return this.sessions.reduce((sum, s) => sum + (s.costUsd || 0), 0);
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }

  formatTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatDuration(ms?: number): string {
    if (!ms || ms < 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
    return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
  }

  formatTokens(n?: number): string {
    if (!n) return '0';
    if (n < 1000) return n.toString();
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
    return `${(n / 1_000_000).toFixed(2)}M`;
  }

  shortModel(model?: string): string {
    if (!model) return '—';
    if (model.includes('opus')) return 'Opus';
    if (model.includes('sonnet')) return 'Sonnet';
    if (model.includes('haiku')) return 'Haiku';
    return model.replace('claude-', '').substring(0, 12);
  }
}
