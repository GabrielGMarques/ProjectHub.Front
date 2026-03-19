import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TelemetryService, TelemetryStats, TelemetryEventItem, ExecutionLog, ExecutionLogGroup, ManagerLogItem, ManagerLogsResponse, EmployeeLogItem, EmployeeLogsResponse, EmployeeLogEmployee } from '../../services/telemetry.service';

@Component({
  selector: 'app-telemetry',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="telem-page">
      <div class="page-header">
        <h1>Telemetry</h1>
        <p class="subtitle">Agent runs, errors, and performance metrics</p>
        <div class="header-actions">
          <select [(ngModel)]="days" (ngModelChange)="loadStats()">
            <option [value]="1">Last 24h</option>
            <option [value]="7">Last 7 days</option>
            <option [value]="30">Last 30 days</option>
          </select>
          <button class="refresh-btn" (click)="loadAll()"><mat-icon>refresh</mat-icon></button>
        </div>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (stats) {
        <!-- Stats cards -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-value">{{ stats.totalRuns }}</span>
            <span class="stat-label">Total Runs</span>
          </div>
          <div class="stat-card success">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-card danger">
            <span class="stat-value">{{ stats.failed }}</span>
            <span class="stat-label">Failed</span>
          </div>
          <div class="stat-card warn">
            <span class="stat-value">{{ stats.cancelled }}</span>
            <span class="stat-label">Cancelled</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ formatDuration(stats.avgDurationMs) }}</span>
            <span class="stat-label">Avg Duration</span>
          </div>
          <div class="stat-card danger">
            <span class="stat-value">{{ stats.errorCount }}</span>
            <span class="stat-label">Errors</span>
          </div>
        </div>

        <!-- Charts row -->
        <div class="charts-row">
          <!-- Daily breakdown bar chart -->
          <div class="chart-card">
            <h3>Daily Activity</h3>
            <div class="bar-chart">
              @for (day of stats.dailyBreakdown; track day.date) {
                <div class="bar-col" [matTooltip]="day.date + ': ' + day.total + ' runs'">
                  <div class="bar-stack">
                    @if (day.completed > 0) {
                      <div class="bar-segment success" [style.height.px]="barHeight(day.completed)"></div>
                    }
                    @if (day.failed > 0) {
                      <div class="bar-segment danger" [style.height.px]="barHeight(day.failed)"></div>
                    }
                    @if (day.total - day.completed - day.failed > 0) {
                      <div class="bar-segment neutral" [style.height.px]="barHeight(day.total - day.completed - day.failed)"></div>
                    }
                  </div>
                  <span class="bar-label">{{ day.date.slice(5) }}</span>
                </div>
              }
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot success"></span> Completed</span>
              <span class="legend-item"><span class="legend-dot danger"></span> Failed</span>
              <span class="legend-item"><span class="legend-dot neutral"></span> Other</span>
            </div>
          </div>

          <!-- Source breakdown -->
          <div class="chart-card">
            <h3>By Source</h3>
            @if (stats.sourceBreakdown.length === 0) {
              <p class="no-data">No data yet</p>
            } @else {
              <div class="source-list">
                @for (s of stats.sourceBreakdown; track s.source) {
                  <div class="source-row">
                    <span class="source-name">{{ s.source }}</span>
                    <div class="source-bar-track">
                      <div class="source-bar-fill" [style.width.%]="sourcePercent(s.count)"></div>
                    </div>
                    <span class="source-count">{{ s.count }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Tabs: Execution Log / Recent runs / Errors -->
        <div class="log-tabs">
          <button class="log-tab" [class.active]="logTab === 'execlog'" (click)="loadExecLog(); logTab = 'execlog'">
            <mat-icon>assignment</mat-icon> Execution Log
            @if (execLog && execLog.summary.activeNow > 0) {
              <span class="tab-badge active">{{ execLog.summary.activeNow }} active</span>
            }
          </button>
          <button class="log-tab" [class.active]="logTab === 'runs'" (click)="logTab = 'runs'">
            <mat-icon>history</mat-icon> Recent Runs
          </button>
          <button class="log-tab" [class.active]="logTab === 'gordon'" (click)="loadGordonLogs(); logTab = 'gordon'">
            <mat-icon>support_agent</mat-icon> Gordon Logs
            @if (gordonStats && gordonStats.errors > 0) {
              <span class="tab-badge danger">{{ gordonStats.errors }}</span>
            }
          </button>
          <button class="log-tab" [class.active]="logTab === 'employees'" (click)="loadEmployeeLogs(); logTab = 'employees'">
            <mat-icon>group</mat-icon> Employee Logs
          </button>
          <button class="log-tab" [class.active]="logTab === 'errors'" (click)="loadErrors(); logTab = 'errors'">
            <mat-icon>error</mat-icon> Errors ({{ stats.errorCount }})
          </button>
        </div>

        @if (logTab === 'execlog') {
          @if (execLogLoading) {
            <div class="loading"><mat-spinner diameter="24"></mat-spinner></div>
          } @else if (execLog) {
            <!-- Summary bar -->
            <div class="exec-summary">
              <span><strong>{{ execLog.summary.total }}</strong> events</span>
              <span class="summary-sep">|</span>
              <span class="summary-ok">{{ execLog.summary.completed }} completed</span>
              <span class="summary-sep">|</span>
              <span class="summary-fail">{{ execLog.summary.failed }} failed</span>
              @if (execLog.summary.activeNow > 0) {
                <span class="summary-sep">|</span>
                <span class="summary-active">{{ execLog.summary.activeNow }} running now</span>
              }
              <span class="summary-period">Past {{ execLogHours }}h</span>
              <select class="exec-hours-select" [(ngModel)]="execLogHours" (ngModelChange)="loadExecLog()">
                <option [value]="6">6h</option>
                <option [value]="12">12h</option>
                <option [value]="24">24h</option>
                <option [value]="48">48h</option>
                <option [value]="72">72h</option>
              </select>
            </div>

            @if (execLog.groups.length === 0) {
              <div class="no-data">No execution logs in the last {{ execLogHours }}h.</div>
            }

            @for (group of execLog.groups; track group.source + (group.employeeId?._id || '')) {
              <div class="exec-group">
                <button class="exec-group-header" (click)="toggleExecGroup(group)" [class.expanded]="expandedExecGroups.has(groupKey(group))">
                  <div class="exec-group-identity">
                    @if (group.employeeId) {
                      <span class="exec-avatar">{{ group.employeeId.avatar }}</span>
                      <span class="exec-name">{{ group.employeeId.name }}</span>
                      <span class="exec-role">({{ group.employeeId.title }})</span>
                    } @else {
                      <mat-icon class="exec-agent-icon">smart_toy</mat-icon>
                      <span class="exec-name">{{ group.source }}</span>
                    }
                    @if (group.projectId) {
                      <span class="exec-project">{{ group.projectId.name }}</span>
                    }
                  </div>
                  <div class="exec-group-stats">
                    @if (group.stats.started > 0) {
                      <span class="exec-stat active">{{ group.stats.started }} running</span>
                    }
                    <span class="exec-stat ok">{{ group.stats.completed }}</span>
                    @if (group.stats.failed > 0) {
                      <span class="exec-stat fail">{{ group.stats.failed }}</span>
                    }
                    <span class="exec-stat total">{{ group.stats.total }} events</span>
                    @if (group.stats.totalDurationMs > 0) {
                      <span class="exec-stat duration">{{ formatDuration(group.stats.totalDurationMs) }} total</span>
                    }
                    <mat-icon class="expand-icon">{{ expandedExecGroups.has(groupKey(group)) ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </div>
                </button>

                @if (expandedExecGroups.has(groupKey(group))) {
                  <div class="exec-group-events">
                    @for (ev of group.events; track ev._id) {
                      <div class="event-row compact" [class]="ev.status">
                        <mat-icon class="event-icon">{{ statusIcon(ev.status) }}</mat-icon>
                        <span class="event-type-badge">{{ ev.type }}</span>
                        <span class="event-desc">{{ ev.description }}</span>
                        @if (ev.error) {
                          <span class="event-error-inline">{{ ev.error }}</span>
                        }
                        <div class="event-meta">
                          @if (ev.durationMs) {
                            <span class="event-duration">{{ formatDuration(ev.durationMs) }}</span>
                          }
                          <span class="event-time">{{ formatTime(ev.createdAt) }}</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }
        }

        @if (logTab === 'runs') {
          <div class="event-list">
            @for (ev of events; track ev._id) {
              <div class="event-row" [class]="ev.status">
                <mat-icon class="event-icon">{{ statusIcon(ev.status) }}</mat-icon>
                <div class="event-main">
                  <div class="event-top">
                    <span class="event-source">{{ ev.source }}</span>
                    @if (ev.projectId) {
                      <span class="event-project">{{ ev.projectId.name }}</span>
                    }
                    @if (ev.employeeId) {
                      <span class="event-emp">{{ ev.employeeId.avatar }} {{ ev.employeeId.name }}</span>
                    }
                  </div>
                  <span class="event-desc">{{ ev.description }}</span>
                  @if (ev.error) {
                    <span class="event-error">{{ ev.error }}</span>
                  }
                </div>
                <div class="event-meta">
                  @if (ev.durationMs) {
                    <span class="event-duration">{{ formatDuration(ev.durationMs) }}</span>
                  }
                  <span class="event-time">{{ formatTime(ev.createdAt) }}</span>
                </div>
              </div>
            }
            @if (events.length === 0) {
              <div class="no-data">No runs recorded yet. Assign tasks to employees to see telemetry data.</div>
            }
          </div>
        }

        @if (logTab === 'errors') {
          <div class="event-list">
            @for (ev of errors; track ev._id) {
              <div class="event-row failed">
                <mat-icon class="event-icon">error</mat-icon>
                <div class="event-main">
                  <div class="event-top">
                    <span class="event-source">{{ ev.source }}</span>
                    @if (ev.projectId) {
                      <span class="event-project">{{ ev.projectId.name }}</span>
                    }
                  </div>
                  <span class="event-desc">{{ ev.description }}</span>
                  <span class="event-error">{{ ev.error }}</span>
                </div>
                <span class="event-time">{{ formatTime(ev.createdAt) }}</span>
              </div>
            }
            @if (errors.length === 0) {
              <div class="no-data">No errors recorded.</div>
            }
          </div>
        }

        @if (logTab === 'gordon') {
          @if (gordonLoading) {
            <div class="loading"><mat-spinner diameter="24"></mat-spinner></div>
          } @else {
            <!-- Gordon stats bar -->
            @if (gordonStats) {
              <div class="gordon-stats">
                <span class="gs" matTooltip="Messages"><mat-icon>chat</mat-icon> {{ gordonStats.messages }}</span>
                <span class="gs" matTooltip="AI Calls"><mat-icon>psychology</mat-icon> {{ gordonStats.aiCalls }}</span>
                <span class="gs" matTooltip="Actions"><mat-icon>bolt</mat-icon> {{ gordonStats.actions }}</span>
                <span class="gs err" matTooltip="Errors"><mat-icon>error</mat-icon> {{ gordonStats.errors }}</span>
                <span class="gs" matTooltip="Watchdog"><mat-icon>visibility</mat-icon> {{ gordonStats.watchdog }}</span>
                <span class="gs" matTooltip="Loop"><mat-icon>loop</mat-icon> {{ gordonStats.loop }}</span>
                @if (gordonStats.voice > 0) {
                  <span class="gs" matTooltip="Voice"><mat-icon>mic</mat-icon> {{ gordonStats.voice }}</span>
                }
                <span class="gs-total">{{ gordonStats.total }} total (24h)</span>
                <select class="gordon-filter" [(ngModel)]="gordonFilter" (ngModelChange)="loadGordonLogs()">
                  <option value="">All</option>
                  <option value="message">Messages</option>
                  <option value="ai_call">AI Calls</option>
                  <option value="action">Actions</option>
                  <option value="error">Errors</option>
                  <option value="watchdog">Watchdog</option>
                  <option value="loop">Loop</option>
                  <option value="voice">Voice</option>
                </select>
              </div>
            }

            <div class="event-list">
              @for (gl of gordonLogs; track gl._id) {
                <div class="event-row gordon-row" [class.gordon-inbound]="gl.direction === 'inbound'" [class.gordon-outbound]="gl.direction === 'outbound'" [class.gordon-error]="gl.category === 'error'">
                  <mat-icon class="event-icon gordon-cat-icon">{{ gordonCategoryIcon(gl.category) }}</mat-icon>
                  <div class="event-main">
                    <div class="event-top">
                      <span class="gordon-cat-badge" [attr.data-cat]="gl.category">{{ gl.category }}</span>
                      @if (gl.direction) {
                        <span class="gordon-dir">{{ gl.direction === 'inbound' ? '← Bruce' : '→ Gordon' }}</span>
                      }
                    </div>
                    <span class="event-desc gordon-content">{{ gl.content }}</span>
                    @if (gl.metadata) {
                      <details class="gordon-meta-details">
                        <summary>metadata</summary>
                        <pre class="gordon-meta-pre">{{ gl.metadata | json }}</pre>
                      </details>
                    }
                  </div>
                  <span class="event-time">{{ formatTime(gl.createdAt) }}</span>
                </div>
              }
              @if (gordonLogs.length === 0) {
                <div class="no-data">No Gordon logs yet. Logs auto-expire after 24h.</div>
              }
            </div>
          }
        }

        @if (logTab === 'employees') {
          @if (empLoading) {
            <div class="loading"><mat-spinner diameter="24"></mat-spinner></div>
          } @else {
            <!-- Employee selector + stats -->
            @if (empStats) {
              <div class="emp-log-bar">
                <div class="emp-chips">
                  <button class="emp-chip" [class.active]="!empFilterEmployee" (click)="empFilterEmployee = ''; loadEmployeeLogs()">
                    All ({{ empStats.total }})
                  </button>
                  @for (emp of empEmployees; track emp.id) {
                    <button class="emp-chip" [class.active]="empFilterEmployee === emp.id" (click)="empFilterEmployee = emp.id; loadEmployeeLogs()">
                      {{ emp.avatar }} {{ emp.name }}
                      <span class="emp-chip-count">{{ emp.total }}</span>
                      @if (emp.errors > 0) {
                        <span class="emp-chip-err">{{ emp.errors }}</span>
                      }
                    </button>
                  }
                </div>
                <select class="emp-cat-filter" [(ngModel)]="empFilterCategory" (ngModelChange)="loadEmployeeLogs()">
                  <option value="">All categories</option>
                  <option value="task_start">Task Start</option>
                  <option value="task_complete">Task Complete</option>
                  <option value="task_fail">Task Fail</option>
                  <option value="tool_use">Tool Use</option>
                  <option value="tool_result">Tool Result</option>
                  <option value="text">Text</option>
                  <option value="error">Error</option>
                </select>
              </div>
            }

            <div class="event-list">
              @for (el of empLogs; track el._id) {
                <div class="event-row emp-row"
                     [class.emp-start]="el.category === 'task_start'"
                     [class.emp-ok]="el.category === 'task_complete'"
                     [class.emp-fail]="el.category === 'task_fail' || el.category === 'error'">
                  <mat-icon class="event-icon">{{ empCategoryIcon(el.category) }}</mat-icon>
                  <div class="event-main">
                    <div class="event-top">
                      <span class="emp-log-who">{{ el.employeeAvatar }} {{ el.employeeName }}</span>
                      <span class="emp-log-cat" [attr.data-cat]="el.category">{{ el.category }}</span>
                      <span class="event-project">{{ el.projectName }}</span>
                    </div>
                    <span class="event-desc">{{ el.content }}</span>
                    @if (el.metadata) {
                      <details class="gordon-meta-details">
                        <summary>metadata</summary>
                        <pre class="gordon-meta-pre">{{ el.metadata | json }}</pre>
                      </details>
                    }
                  </div>
                  <span class="event-time">{{ formatTime(el.createdAt) }}</span>
                </div>
              }
              @if (empLogs.length === 0) {
                <div class="no-data">No employee logs yet. Assign tasks to employees to see their activity. Logs auto-expire after 24h.</div>
              }
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .telem-page { padding: 0 24px 2rem; max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 1.5rem; padding-top: 0.5rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--color-text); }
    .subtitle { margin: 0; font-size: 0.9rem; color: var(--color-text-subtle); flex: 1; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .header-actions select {
      padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg-card); color: var(--color-text); font-family: inherit; font-size: 0.82rem;
    }
    .refresh-btn {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); cursor: pointer;
    }
    .refresh-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .refresh-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .loading { display: flex; justify-content: center; padding: 4rem; }

    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 1rem; }
    .stat-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 16px; text-align: center;
    }
    .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: var(--color-text); }
    .stat-label { font-size: 0.72rem; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
    .stat-card.success .stat-value { color: #22c55e; }
    .stat-card.danger .stat-value { color: #ef4444; }
    .stat-card.warn .stat-value { color: #f59e0b; }

    /* Charts */
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1rem; }
    .chart-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 16px;
    }
    .chart-card h3 { margin: 0 0 12px; font-size: 0.9rem; font-weight: 700; color: var(--color-text); }
    .no-data { font-size: 0.82rem; color: var(--color-text-subtle); text-align: center; padding: 2rem; }

    /* Bar chart */
    .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; padding-bottom: 20px; position: relative; }
    .bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
    .bar-stack { display: flex; flex-direction: column-reverse; width: 100%; max-width: 28px; gap: 1px; }
    .bar-segment { width: 100%; border-radius: 2px 2px 0 0; min-height: 2px; }
    .bar-segment.success { background: #22c55e; }
    .bar-segment.danger { background: #ef4444; }
    .bar-segment.neutral { background: var(--color-border); }
    .bar-label { font-size: 0.6rem; color: var(--color-text-subtle); margin-top: 4px; white-space: nowrap; }
    .chart-legend { display: flex; gap: 12px; margin-top: 8px; }
    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 0.7rem; color: var(--color-text-subtle); }
    .legend-dot { width: 8px; height: 8px; border-radius: 2px; }
    .legend-dot.success { background: #22c55e; }
    .legend-dot.danger { background: #ef4444; }
    .legend-dot.neutral { background: var(--color-border); }

    /* Source breakdown */
    .source-list { display: flex; flex-direction: column; gap: 8px; }
    .source-row { display: flex; align-items: center; gap: 8px; }
    .source-name { font-size: 0.78rem; font-weight: 600; color: var(--color-text); width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .source-bar-track { flex: 1; height: 8px; background: var(--color-border-light); border-radius: 100px; overflow: hidden; }
    .source-bar-fill { height: 100%; background: var(--color-primary); border-radius: 100px; transition: width 0.3s; }
    .source-count { font-size: 0.75rem; font-weight: 700; color: var(--color-text-subtle); width: 30px; text-align: right; }

    /* Log tabs */
    .log-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
    .log-tab {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); font-family: inherit;
      font-size: 0.82rem; font-weight: 600; cursor: pointer;
    }
    .log-tab:hover { border-color: var(--color-primary); color: var(--color-text); }
    .log-tab.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,0.06); }
    .log-tab mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Event list */
    .event-list { display: flex; flex-direction: column; gap: 4px; }
    .event-row {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px;
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); border-left: 3px solid var(--color-border);
    }
    .event-row.completed { border-left-color: #22c55e; }
    .event-row.failed { border-left-color: #ef4444; }
    .event-row.started { border-left-color: #3b82f6; }
    .event-row.cancelled { border-left-color: #f59e0b; }
    .event-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px; }
    .event-row.completed .event-icon { color: #22c55e; }
    .event-row.failed .event-icon { color: #ef4444; }
    .event-row.started .event-icon { color: #3b82f6; }
    .event-main { flex: 1; min-width: 0; }
    .event-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
    .event-source {
      font-size: 0.72rem; font-weight: 700; padding: 1px 8px; border-radius: 100px;
      background: rgba(212,175,55,0.1); color: var(--color-primary);
    }
    .event-project { font-size: 0.72rem; font-weight: 600; color: var(--color-text-subtle); }
    .event-emp { font-size: 0.72rem; }
    .event-desc { font-size: 0.82rem; color: var(--color-text); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .event-error { font-size: 0.78rem; color: #ef4444; display: block; margin-top: 2px; }
    .event-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .event-duration { font-size: 0.72rem; font-weight: 600; color: var(--color-text-subtle); }
    .event-time { font-size: 0.68rem; color: var(--color-text-subtle); white-space: nowrap; }

    /* Tab badge */
    .tab-badge { font-size: 0.65rem; padding: 1px 6px; border-radius: 100px; font-weight: 700; }
    .tab-badge.active { background: rgba(59,130,246,0.15); color: #3b82f6; }

    /* Execution log */
    .exec-summary {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 10px 14px; margin-bottom: 8px;
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--color-text);
    }
    .exec-summary strong { font-weight: 700; }
    .summary-sep { color: var(--color-border); }
    .summary-ok { color: #22c55e; font-weight: 600; }
    .summary-fail { color: #ef4444; font-weight: 600; }
    .summary-active { color: #3b82f6; font-weight: 600; }
    .summary-period { margin-left: auto; color: var(--color-text-subtle); font-size: 0.75rem; }
    .exec-hours-select {
      padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg-card); color: var(--color-text); font-family: inherit; font-size: 0.75rem;
    }

    .exec-group { margin-bottom: 6px; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); overflow: hidden; }
    .exec-group-header {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      width: 100%; padding: 12px 14px;
      background: var(--color-bg-card); border: none; color: var(--color-text);
      font-family: inherit; font-size: 0.85rem; cursor: pointer; text-align: left;
    }
    .exec-group-header:hover { background: rgba(212,175,55,0.03); }
    .exec-group-identity { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .exec-avatar { font-size: 1.2rem; }
    .exec-name { font-weight: 700; }
    .exec-role { font-size: 0.75rem; color: var(--color-text-subtle); }
    .exec-agent-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary); }
    .exec-project { font-size: 0.72rem; padding: 1px 8px; border-radius: 100px; background: rgba(212,175,55,0.08); color: var(--color-primary); font-weight: 600; }

    .exec-group-stats { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .exec-stat { font-size: 0.72rem; font-weight: 600; }
    .exec-stat.ok { color: #22c55e; }
    .exec-stat.fail { color: #ef4444; }
    .exec-stat.active { color: #3b82f6; }
    .exec-stat.total { color: var(--color-text-subtle); }
    .exec-stat.duration { color: var(--color-text-subtle); font-weight: 500; }
    .expand-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-text-subtle); }

    .exec-group-events { padding: 4px 8px 8px; display: flex; flex-direction: column; gap: 3px; background: rgba(0,0,0,0.15); }
    .event-row.compact { padding: 6px 10px; align-items: center; gap: 8px; }
    .event-row.compact .event-desc { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; font-size: 0.78rem; }
    .event-row.compact .event-meta { flex-direction: row; gap: 8px; }
    .event-type-badge { font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 100px; background: rgba(255,255,255,0.06); color: var(--color-text-subtle); flex-shrink: 0; text-transform: uppercase; }
    .event-error-inline { font-size: 0.72rem; color: #ef4444; flex-shrink: 0; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Tab badge */
    .tab-badge.danger { background: rgba(239,68,68,0.15); color: #ef4444; }

    /* Gordon logs */
    .gordon-stats {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 10px 14px; margin-bottom: 8px;
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); font-size: 0.78rem;
    }
    .gs { display: flex; align-items: center; gap: 3px; color: var(--color-text-subtle); font-weight: 600; }
    .gs mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .gs.err { color: #ef4444; }
    .gs-total { margin-left: auto; font-size: 0.72rem; color: var(--color-text-subtle); }
    .gordon-filter {
      padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg-card); color: var(--color-text); font-family: inherit; font-size: 0.72rem;
    }

    .gordon-row { border-left-color: var(--color-border); }
    .gordon-row.gordon-inbound { border-left-color: #3b82f6; }
    .gordon-row.gordon-outbound { border-left-color: #22c55e; }
    .gordon-row.gordon-error { border-left-color: #ef4444; }
    .gordon-cat-icon { color: var(--color-text-subtle); }
    .gordon-inbound .gordon-cat-icon { color: #3b82f6; }
    .gordon-outbound .gordon-cat-icon { color: #22c55e; }
    .gordon-error .gordon-cat-icon { color: #ef4444; }

    .gordon-cat-badge {
      font-size: 0.65rem; font-weight: 700; padding: 1px 8px; border-radius: 100px;
      background: rgba(255,255,255,0.06); color: var(--color-text-subtle); text-transform: uppercase;
    }
    .gordon-cat-badge[data-cat="message"] { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .gordon-cat-badge[data-cat="ai_call"] { background: rgba(168,85,247,0.1); color: #a78bfa; }
    .gordon-cat-badge[data-cat="action"] { background: rgba(212,175,55,0.1); color: var(--color-primary); }
    .gordon-cat-badge[data-cat="error"] { background: rgba(239,68,68,0.1); color: #ef4444; }
    .gordon-cat-badge[data-cat="watchdog"] { background: rgba(34,197,94,0.1); color: #22c55e; }
    .gordon-dir { font-size: 0.65rem; color: var(--color-text-subtle); font-weight: 600; }

    .gordon-content { white-space: pre-wrap; word-break: break-word; }
    .gordon-meta-details { margin-top: 4px; }
    .gordon-meta-details summary { font-size: 0.68rem; color: var(--color-text-subtle); cursor: pointer; }
    .gordon-meta-pre { font-size: 0.68rem; color: #8b949e; background: rgba(0,0,0,0.2); padding: 6px 8px; border-radius: 4px; margin: 4px 0 0; overflow-x: auto; max-height: 150px; }

    /* Employee logs */
    .emp-log-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 10px 14px; margin-bottom: 8px;
      background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
    }
    .emp-chips { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
    .emp-chip {
      display: flex; align-items: center; gap: 4px; padding: 4px 10px;
      border: 1px solid var(--color-border-light); border-radius: 100px;
      background: none; color: var(--color-text-subtle); font-family: inherit; font-size: 0.72rem; font-weight: 600; cursor: pointer;
    }
    .emp-chip:hover { border-color: var(--color-primary); color: var(--color-text); }
    .emp-chip.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,0.06); }
    .emp-chip-count { font-size: 0.65rem; color: var(--color-text-subtle); }
    .emp-chip-err { font-size: 0.6rem; font-weight: 700; color: #ef4444; background: rgba(239,68,68,0.12); padding: 0 4px; border-radius: 100px; }
    .emp-cat-filter {
      padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg-card); color: var(--color-text); font-family: inherit; font-size: 0.72rem;
    }

    .emp-row { border-left-color: var(--color-border); }
    .emp-row.emp-start { border-left-color: #3b82f6; }
    .emp-row.emp-ok { border-left-color: #22c55e; }
    .emp-row.emp-fail { border-left-color: #ef4444; }
    .emp-row.emp-start .event-icon { color: #3b82f6; }
    .emp-row.emp-ok .event-icon { color: #22c55e; }
    .emp-row.emp-fail .event-icon { color: #ef4444; }

    .emp-log-who { font-size: 0.78rem; font-weight: 700; }
    .emp-log-cat {
      font-size: 0.6rem; font-weight: 700; padding: 1px 6px; border-radius: 100px;
      background: rgba(255,255,255,0.06); color: var(--color-text-subtle); text-transform: uppercase;
    }
    .emp-log-cat[data-cat="task_start"] { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .emp-log-cat[data-cat="task_complete"] { background: rgba(34,197,94,0.1); color: #22c55e; }
    .emp-log-cat[data-cat="task_fail"] { background: rgba(239,68,68,0.1); color: #ef4444; }
    .emp-log-cat[data-cat="tool_use"] { background: rgba(212,175,55,0.1); color: var(--color-primary); }
    .emp-log-cat[data-cat="error"] { background: rgba(239,68,68,0.1); color: #ef4444; }
  `],
})
export class TelemetryComponent implements OnInit {
  loading = true;
  days = 7;
  stats: TelemetryStats | null = null;
  events: TelemetryEventItem[] = [];
  errors: TelemetryEventItem[] = [];
  logTab: 'runs' | 'errors' | 'execlog' | 'gordon' | 'employees' = 'execlog';
  execLog: ExecutionLog | null = null;
  execLogLoading = false;
  execLogHours = 48;
  expandedExecGroups = new Set<string>();
  gordonLogs: ManagerLogItem[] = [];
  gordonStats: ManagerLogsResponse['stats'] | null = null;
  gordonLoading = false;
  gordonFilter = '';
  empLogs: EmployeeLogItem[] = [];
  empEmployees: EmployeeLogEmployee[] = [];
  empStats: EmployeeLogsResponse['stats'] | null = null;
  empLoading = false;
  empFilterEmployee = '';
  empFilterCategory = '';
  private maxDaily = 1;

  constructor(private telemetryService: TelemetryService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.loadStats();
    this.loadEvents();
    this.loadExecLog();
  }

  loadStats(): void {
    this.telemetryService.getStats(this.days).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.maxDaily = Math.max(1, ...stats.dailyBreakdown.map(d => d.total));
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  loadEvents(): void {
    this.telemetryService.getEvents({ limit: '100' }).subscribe({
      next: (res) => this.events = res.events,
    });
  }

  loadErrors(): void {
    this.telemetryService.getErrors(50).subscribe({
      next: (errs) => this.errors = errs,
    });
  }

  loadExecLog(): void {
    this.execLogLoading = true;
    this.telemetryService.getExecutionLog(this.execLogHours).subscribe({
      next: (log) => {
        this.execLog = log;
        this.execLogLoading = false;
        // Auto-expand groups that have active (started) events
        for (const g of log.groups) {
          if (g.stats.started > 0) {
            this.expandedExecGroups.add(this.groupKey(g));
          }
        }
      },
      error: () => { this.execLogLoading = false; },
    });
  }

  groupKey(group: ExecutionLogGroup): string {
    return `${group.source}::${group.employeeId?._id || ''}`;
  }

  toggleExecGroup(group: ExecutionLogGroup): void {
    const key = this.groupKey(group);
    if (this.expandedExecGroups.has(key)) {
      this.expandedExecGroups.delete(key);
    } else {
      this.expandedExecGroups.add(key);
    }
  }

  loadEmployeeLogs(): void {
    this.empLoading = true;
    this.telemetryService.getEmployeeLogs(this.empFilterEmployee || undefined, this.empFilterCategory || undefined).subscribe({
      next: (res) => {
        this.empLogs = res.logs;
        this.empEmployees = res.employees;
        this.empStats = res.stats;
        this.empLoading = false;
      },
      error: () => { this.empLoading = false; },
    });
  }

  empCategoryIcon(cat: string): string {
    switch (cat) {
      case 'task_start': return 'play_circle';
      case 'task_complete': return 'check_circle';
      case 'task_fail': return 'cancel';
      case 'tool_use': return 'build';
      case 'tool_result': return 'output';
      case 'text': return 'chat';
      case 'error': return 'error';
      case 'comms': return 'forum';
      default: return 'circle';
    }
  }

  loadGordonLogs(): void {
    this.gordonLoading = true;
    this.telemetryService.getManagerLogs(this.gordonFilter || undefined).subscribe({
      next: (res) => {
        this.gordonLogs = res.logs;
        this.gordonStats = res.stats;
        this.gordonLoading = false;
      },
      error: () => { this.gordonLoading = false; },
    });
  }

  gordonCategoryIcon(cat: string): string {
    switch (cat) {
      case 'message': return 'chat';
      case 'ai_call': return 'psychology';
      case 'action': return 'bolt';
      case 'watchdog': return 'visibility';
      case 'loop': return 'loop';
      case 'error': return 'error';
      case 'voice': return 'mic';
      default: return 'circle';
    }
  }

  barHeight(value: number): number {
    return Math.max(2, (value / this.maxDaily) * 100);
  }

  sourcePercent(count: number): number {
    if (!this.stats?.totalRuns) return 0;
    return (count / this.stats.totalRuns) * 100;
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'failed': return 'error';
      case 'started': return 'play_circle';
      case 'cancelled': return 'cancel';
      default: return 'circle';
    }
  }

  formatDuration(ms: number): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
