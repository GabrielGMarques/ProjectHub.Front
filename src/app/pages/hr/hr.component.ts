import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';
import { ProjectService } from '../../services/project.service';
import { Employee, EmployeeSkill, RoleTemplate, CommFile } from '../../models/employee.model';
import { Project } from '../../models/project.model';
import { environment } from '../../../environments/environment';
import { marked } from 'marked';

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="hr-page">
      <div class="page-header">
        <h1>HR Department</h1>
        <p class="subtitle">Hire and manage AI employees for your projects</p>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else {
        <!-- Top-level tabs -->
        <div class="hr-tabs">
          <button class="hr-tab" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
            <mat-icon>dashboard</mat-icon> Overview
          </button>
          <button class="hr-tab" [class.active]="activeTab === 'team'" (click)="activeTab = 'team'">
            <mat-icon>groups</mat-icon> Manage
          </button>
          <button class="hr-tab" [class.active]="activeTab === 'hire'" (click)="activeTab = 'hire'">
            <mat-icon>person_add</mat-icon> Hire
          </button>
          <button class="hr-tab" [class.active]="activeTab === 'comms'" (click)="loadComms(); activeTab = 'comms'">
            <mat-icon>forum</mat-icon> Comms
          </button>
          <button class="hr-tab" [class.active]="activeTab === 'manager'" (click)="loadManagerLog(); activeTab = 'manager'">
            <mat-icon>admin_panel_settings</mat-icon> Manager
            @if (managerRunning) { <span class="manager-live-dot"></span> }
          </button>
        </div>

        <!-- Overview tab: All projects with employees in columns -->
        @if (activeTab === 'overview') {
          @if (allEmployees.length === 0) {
            <div class="empty-state">
              <mat-icon>group_add</mat-icon>
              <h2>No employees hired yet</h2>
              <p>Go to the Hire tab to add AI employees to your projects.</p>
            </div>
          } @else {
            <div class="overview-grid">
              @for (pg of projectGroups; track pg.project._id) {
                <div class="project-column">
                  <div class="project-col-header">
                    <span class="project-col-name">{{ pg.project.name }}</span>
                    <span class="project-col-count">{{ pg.employees.length }}</span>
                  </div>
                  <div class="project-col-body">
                    @for (emp of pg.employees; track emp._id) {
                      <div class="mini-card" [class.working]="emp.status === 'working'"
                           [class.selected]="selectedEmployee?._id === emp._id"
                           (click)="selectEmployeeFromOverview(emp, pg.project._id!)">
                        <span class="mini-avatar">{{ emp.avatar }}</span>
                        <div class="mini-info">
                          <span class="mini-name">{{ emp.name }}</span>
                          <span class="mini-title">{{ emp.title }}</span>
                        </div>
                        <span class="mini-status" [class]="emp.status">
                          @if (emp.status === 'working') {
                            <mat-spinner diameter="12"></mat-spinner>
                          } @else {
                            <span class="mini-dot"></span>
                          }
                        </span>
                      </div>
                    }
                    @if (pg.employees.length === 0) {
                      <div class="project-col-empty">No employees</div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Detail panel below the overview -->
            @if (selectedEmployee) {
              <div class="overview-detail">
                <div class="detail-header">
                  <span class="detail-avatar">{{ selectedEmployee.avatar }}</span>
                  <div class="detail-info">
                    <h2>{{ selectedEmployee.name }}</h2>
                    <span class="detail-title">{{ selectedEmployee.title }}</span>
                    <span class="detail-status" [class]="selectedEmployee.status">{{ selectedEmployee.status }}</span>
                  </div>
                  <button class="fire-btn" (click)="fireEmployee(selectedEmployee)" matTooltip="Remove">
                    <mat-icon>person_remove</mat-icon>
                  </button>
                </div>

                <!-- Assign task -->
                <div class="task-section">
                  <h3>Assign Task</h3>
                  @if (taskError) {
                    <div class="task-error"><mat-icon>error</mat-icon> {{ taskError }}</div>
                  }
                  <div class="task-input-row">
                    <textarea class="task-input" [(ngModel)]="taskInput" placeholder="Describe the task..."
                              [disabled]="selectedEmployee.status === 'working'" rows="2"></textarea>
                    <button class="task-send" (click)="assignTask()" [disabled]="!taskInput.trim() || selectedEmployee.status === 'working'">
                      <mat-icon>{{ selectedEmployee.status === 'working' ? 'hourglass_top' : 'play_arrow' }}</mat-icon>
                    </button>
                  </div>
                </div>

                @if (agentEntries.length) {
                  <div class="agent-output">
                    <div class="agent-bar" [class.done]="!agentRunning && !taskError" [class.errored]="!agentRunning && taskError">
                      @if (agentRunning) {
                        <mat-icon class="pulse">terminal</mat-icon> Working...
                      } @else if (taskError) {
                        <mat-icon>error</mat-icon> Failed
                      } @else {
                        <mat-icon>check_circle</mat-icon> Finished
                      }
                    </div>
                    <div class="agent-log">
                      @for (entry of agentEntries; track $index) {
                        <div class="log-entry" [class]="entry.type">
                          @if (entry.tool) { <span class="tool-badge">{{ entry.tool }}</span> }
                          <span>{{ entry.content }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Task history -->
                @if (selectedEmployee.taskHistory.length) {
                  <div class="history-section">
                    <h3>Task History</h3>
                    @for (task of selectedEmployee.taskHistory.slice().reverse().slice(0, 5); track task.taskId) {
                      <div class="history-item" [class]="task.status">
                        <div class="history-top">
                          <mat-icon class="history-icon">{{ task.status === 'completed' ? 'check_circle' : task.status === 'failed' ? 'error' : task.status === 'in_progress' ? 'hourglass_top' : 'schedule' }}</mat-icon>
                          <span class="history-desc">{{ task.description }}</span>
                          <span class="history-time">{{ formatTime(task.startedAt) }}</span>
                        </div>
                        @if (task.result) {
                          <details class="history-result">
                            <summary>Result</summary>
                            <div class="history-result-content" [innerHTML]="parseMarkdown(task.result)"></div>
                          </details>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }
        }

        <!-- Manage tab (single project management) -->
        @if (activeTab === 'team' || activeTab === 'hire' || activeTab === 'comms') {
          <div class="project-selector">
            <label>Project:</label>
            <select [(ngModel)]="selectedProjectId" (ngModelChange)="onProjectChange()">
              <option value="">-- Select a project --</option>
              @for (p of projects; track p._id) {
                <option [value]="p._id">{{ p.name }}</option>
              }
            </select>
          </div>
        }

        @if (selectedProjectId && activeTab === 'team') {
            @if (employees.length === 0) {
              <div class="empty-state">
                <mat-icon>group_add</mat-icon>
                <h2>No employees yet</h2>
                <p>Go to the Hire tab to add AI employees to this project.</p>
              </div>
            } @else {
              <div class="team-layout">
                <!-- Employee list (left) -->
                <div class="team-list">
                  @for (emp of employees; track emp._id) {
                    <div class="employee-card" [class.working]="emp.status === 'working'" [class.selected]="selectedEmployee?._id === emp._id" (click)="selectEmployee(emp)">
                      <div class="emp-header">
                        <span class="emp-avatar">{{ emp.avatar }}</span>
                        <div class="emp-info">
                          <span class="emp-name">{{ emp.name }}</span>
                          <span class="emp-title">{{ emp.title }}</span>
                        </div>
                        <span class="emp-status" [class]="emp.status">{{ emp.status }}</span>
                      </div>
                      @if (emp.specialties?.length) {
                        <div class="emp-tags">
                          @for (s of emp.specialties.slice(0, 3); track s) {
                            <span class="emp-tag">{{ s }}</span>
                          }
                        </div>
                      }
                      @if (emp.status === 'working') {
                        <div class="emp-working"><mat-spinner diameter="14"></mat-spinner> Working...</div>
                      } @else if (emp.lastActivity) {
                        <div class="emp-last-activity">{{ formatTime(emp.lastActivity) }}</div>
                      }
                    </div>
                  }
                </div>

                <!-- Detail panel (right) -->
                @if (selectedEmployee) {
                  <div class="employee-detail">
                    <div class="detail-header">
                      <span class="detail-avatar">{{ selectedEmployee.avatar }}</span>
                      <div class="detail-info">
                        <h2>{{ selectedEmployee.name }}</h2>
                        <span class="detail-title">{{ selectedEmployee.title }}</span>
                        <span class="detail-status" [class]="selectedEmployee.status">{{ selectedEmployee.status }}</span>
                      </div>
                      <button class="fire-btn" (click)="fireEmployee(selectedEmployee)" matTooltip="Remove employee">
                        <mat-icon>person_remove</mat-icon>
                      </button>
                    </div>
                    <p class="detail-desc">{{ selectedEmployee.description }}</p>

                    <!-- Assign task (prominent, at the top) -->
                    <div class="task-section">
                      <h3>Assign Task</h3>
                      @if (taskError) {
                        <div class="task-error">
                          <mat-icon>error</mat-icon> {{ taskError }}
                        </div>
                      }
                      <div class="task-input-row">
                        <textarea class="task-input" [(ngModel)]="taskInput" placeholder="Describe the task for this employee..."
                                  [disabled]="selectedEmployee.status === 'working'" rows="2"></textarea>
                        <button class="task-send" (click)="assignTask()" [disabled]="!taskInput.trim() || selectedEmployee.status === 'working'">
                          <mat-icon>{{ selectedEmployee.status === 'working' ? 'hourglass_top' : 'play_arrow' }}</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Live output -->
                    @if (agentEntries.length) {
                      <div class="agent-output">
                        <div class="agent-bar" [class.done]="!agentRunning && !taskError" [class.errored]="!agentRunning && taskError">
                          @if (agentRunning) {
                            <mat-icon class="pulse">terminal</mat-icon> Working...
                          } @else {
                            <mat-icon>check_circle</mat-icon> Finished
                          }
                        </div>
                        <div class="agent-log">
                          @for (entry of agentEntries; track $index) {
                            <div class="log-entry" [class]="entry.type">
                              @if (entry.tool) { <span class="tool-badge">{{ entry.tool }}</span> }
                              <span>{{ entry.content }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Skills -->
                    <div class="skills-section">
                      <h3>Skills &amp; Tools</h3>
                      <div class="tools-list">
                        @for (tool of selectedEmployee.allowedTools; track tool) {
                          <span class="tool-chip">{{ tool }}</span>
                        }
                      </div>
                      @if (selectedEmployee.skills.length) {
                        <div class="skills-list">
                          @for (skill of selectedEmployee.skills; track skill.name) {
                            <div class="skill-chip">
                              <span>{{ skill.name }}</span>
                              <button class="skill-remove" (click)="removeSkill(skill.name)" matTooltip="Remove skill">
                                <mat-icon>close</mat-icon>
                              </button>
                            </div>
                          }
                        </div>
                      }
                      <div class="add-skill-row">
                        <input class="skill-name-input" [(ngModel)]="newSkillName" placeholder="Skill name..." />
                        <input class="skill-desc-input" [(ngModel)]="newSkillDesc" placeholder="Description (optional)" />
                        <button class="add-skill-btn" (click)="addSkill()" [disabled]="!newSkillName.trim()">
                          <mat-icon>add</mat-icon> Install
                        </button>
                      </div>
                    </div>

                    <!-- Task history -->
                    @if (selectedEmployee.taskHistory.length) {
                      <div class="history-section">
                        <h3>Task History</h3>
                        @for (task of selectedEmployee.taskHistory.slice().reverse(); track task.taskId) {
                          <div class="history-item" [class]="task.status">
                            <div class="history-top">
                              <mat-icon class="history-icon">{{ task.status === 'completed' ? 'check_circle' : task.status === 'failed' ? 'error' : task.status === 'in_progress' ? 'hourglass_top' : 'schedule' }}</mat-icon>
                              <span class="history-desc">{{ task.description }}</span>
                              <span class="history-time">{{ formatTime(task.startedAt) }}</span>
                            </div>
                            @if (task.result) {
                              <details class="history-result">
                                <summary>Result</summary>
                                <div class="history-result-content" [innerHTML]="parseMarkdown(task.result)"></div>
                              </details>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="detail-placeholder">
                    <mat-icon>person</mat-icon>
                    <p>Select an employee to view details and assign tasks</p>
                  </div>
                }
              </div>
            }
          }

          <!-- Hire tab -->
          @if (selectedProjectId && activeTab === 'hire') {
            <div class="dept-filter">
              @for (dept of departments; track dept) {
                <button class="dept-btn" [class.active]="filterDept === dept" (click)="filterDept = dept">{{ dept }}</button>
              }
            </div>
            <div class="roles-grid">
              @for (role of filteredRoles; track role.role) {
                <div class="role-card">
                  <div class="role-top">
                    <span class="role-avatar">{{ role.avatar }}</span>
                    <div class="role-info">
                      <span class="role-name">{{ role.title }}</span>
                      <span class="role-dept">{{ role.department }}</span>
                    </div>
                  </div>
                  <p class="role-desc">{{ role.description }}</p>
                  @if (role.specialties?.length) {
                    <div class="role-tags">
                      @for (s of role.specialties; track s) {
                        <span class="role-tag">{{ s }}</span>
                      }
                    </div>
                  }
                  <div class="role-tools">
                    <mat-icon>build</mat-icon> {{ role.defaultTools?.join(', ') }}
                  </div>
                  <button class="hire-btn" (click)="hireRole(role)">
                    <mat-icon>person_add</mat-icon> Hire
                  </button>
                </div>
              }
            </div>
          }

          <!-- Comms tab -->
          @if (selectedProjectId && activeTab === 'comms') {
            @if (commsLoading) {
              <div class="loading"><mat-spinner diameter="28"></mat-spinner></div>
            } @else if (!comms.length) {
              <div class="empty-state">
                <mat-icon>forum</mat-icon>
                <h2>No communications yet</h2>
                <p>Employees will create markdown files in .agents/comms/ to communicate.</p>
              </div>
            } @else {
              <div class="comms-list">
                @for (file of comms; track file.name) {
                  <div class="comm-card">
                    <div class="comm-header">
                      <mat-icon>description</mat-icon>
                      <span class="comm-name">{{ file.name }}</span>
                      <span class="comm-time">{{ formatTime(file.modified) }}</span>
                    </div>
                    <div class="comm-body" [innerHTML]="parseMarkdown(file.content)"></div>
                  </div>
                }
              </div>
            }
          }
        <!-- Manager tab -->
        @if (activeTab === 'manager') {
          <div class="manager-panel">
            <!-- Telegram setup -->
            <div class="manager-section">
              <h3><mat-icon>send</mat-icon> Telegram Bot</h3>

              @if (telegramStatus?.chatId) {
                <!-- Connected state -->
                <div class="tg-connected">
                  <div class="tg-connected-badge">
                    <mat-icon>check_circle</mat-icon>
                    <span>Connected</span>
                  </div>
                  <span class="tg-chat-id">Chat ID: {{ telegramStatus.chatId }}</span>
                  <button class="tg-btn" (click)="testTelegram()"><mat-icon>send</mat-icon> Send Test</button>
                  <button class="tg-btn" (click)="telegramStatus.chatId = null"><mat-icon>settings</mat-icon> Reconfigure</button>
                </div>
              } @else {
                <!-- Setup wizard -->
                <div class="tg-wizard">
                  <div class="tg-step">
                    <span class="tg-step-num">1</span>
                    <div class="tg-step-body">
                      <strong>Create a bot</strong>
                      <p>Open Telegram, search for <strong>&#64;BotFather</strong>, send <code>/newbot</code> and follow the steps. Copy the token it gives you.</p>
                    </div>
                  </div>
                  <div class="tg-step">
                    <span class="tg-step-num">2</span>
                    <div class="tg-step-body">
                      <strong>Paste your Bot Token</strong>
                      <input class="tg-token-input" [(ngModel)]="telegramTokenInput" placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrsTUVwxyz" />
                    </div>
                  </div>
                  <div class="tg-step">
                    <span class="tg-step-num">3</span>
                    <div class="tg-step-body">
                      <strong>Send /start to your bot</strong>
                      <p>Open the bot you just created in Telegram and send it the message <code>/start</code>.</p>
                    </div>
                  </div>
                  <div class="tg-step">
                    <span class="tg-step-num">4</span>
                    <div class="tg-step-body">
                      <strong>Complete Setup</strong>
                      <p>Click the button below. It will auto-detect your chat ID and send you a test message.</p>
                      <button class="tg-btn primary" (click)="setupTelegram()" [disabled]="!telegramTokenInput.trim() || telegramSetupLoading">
                        @if (telegramSetupLoading) {
                          <mat-spinner diameter="16"></mat-spinner>
                        } @else {
                          <mat-icon>bolt</mat-icon>
                        }
                        Connect Bot
                      </button>
                    </div>
                  </div>

                  @if (telegramSetupResult) {
                    <div class="tg-result" [class.complete]="telegramSetupResult.step === 'complete'" [class.waiting]="telegramSetupResult.step === 'waiting'" [class.error]="telegramSetupResult.step === 'error'">
                      <mat-icon>{{ telegramSetupResult.step === 'complete' ? 'check_circle' : telegramSetupResult.step === 'waiting' ? 'hourglass_top' : 'error' }}</mat-icon>
                      <div>
                        <span>{{ telegramSetupResult.message }}</span>
                        @if (telegramSetupResult.chatId) {
                          <p>Chat ID: <code>{{ telegramSetupResult.chatId }}</code></p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Manager log -->
            <div class="manager-section">
              <div class="manager-section-header">
                <h3><mat-icon>admin_panel_settings</mat-icon> Manager Log</h3>
                <div class="manager-actions">
                  <button class="tg-btn" (click)="runManagerCheck()" [disabled]="managerLoading">
                    <mat-icon>refresh</mat-icon> Run Check Now
                  </button>
                  <span class="manager-status" [class.active]="managerRunning">{{ managerRunning ? 'Active' : 'Stopped' }}</span>
                </div>
              </div>
              @if (managerLoading) {
                <div class="loading"><mat-spinner diameter="24"></mat-spinner></div>
              } @else if (!managerLog.length) {
                <div class="no-data">No log entries yet. Manager runs checks every 10 minutes.</div>
              } @else {
                <div class="manager-log-list">
                  @for (entry of managerLog.slice().reverse(); track $index) {
                    <div class="mlog-entry" [class]="entry.type">
                      <mat-icon class="mlog-icon">{{ entry.type === 'error' ? 'error' : entry.type === 'warning' ? 'warning' : entry.type === 'action' ? 'play_arrow' : 'info' }}</mat-icon>
                      <span class="mlog-msg">{{ entry.message }}</span>
                      <span class="mlog-time">{{ formatTime(entry.timestamp) }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        @if (!selectedProjectId && (activeTab === 'team' || activeTab === 'hire' || activeTab === 'comms')) {
          <div class="empty-state">
            <mat-icon>business</mat-icon>
            <h2>Select a project</h2>
            <p>Choose a project above to manage its AI employees.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .hr-page { padding: 0 24px 2rem; max-width: 1000px; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; padding-top: 0.5rem; }
    .page-header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--color-text); }
    .subtitle { margin: 4px 0 0; font-size: 0.9rem; color: var(--color-text-subtle); }
    .loading { display: flex; justify-content: center; padding: 4rem; }
    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--color-text-subtle); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }
    .empty-state h2 { color: var(--color-text); font-weight: 700; margin: 0.75rem 0 0.25rem; }
    .empty-state p { margin: 0; }

    /* Project selector */
    .project-selector { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; }
    .project-selector label { font-weight: 600; font-size: 0.9rem; color: var(--color-text); }
    .project-selector select {
      flex: 1; max-width: 400px; padding: 10px 14px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg-card); color: var(--color-text);
      font-family: inherit; font-size: 0.85rem; outline: none;
    }
    .project-selector select:focus { border-color: var(--color-primary); }

    /* Tabs */
    .hr-tabs { display: flex; gap: 4px; margin-bottom: 1rem; }
    .hr-tab {
      display: flex; align-items: center; gap: 6px; padding: 10px 18px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); font-family: inherit;
      font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .hr-tab:hover { border-color: var(--color-primary); color: var(--color-text); }
    .hr-tab.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,0.06); }
    .hr-tab mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Overview grid: horizontal project columns */
    .overview-grid {
      display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px;
      scrollbar-width: thin;
    }
    .project-column {
      min-width: 220px; max-width: 280px; flex-shrink: 0;
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); overflow: hidden;
    }
    .project-col-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid var(--color-border-light);
      background: rgba(212,175,55,0.04);
    }
    .project-col-name { font-weight: 700; font-size: 0.88rem; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .project-col-count {
      font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 100px;
      background: var(--color-border-light); color: var(--color-text-subtle);
    }
    .project-col-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 400px; overflow-y: auto; }
    .project-col-empty { text-align: center; padding: 1.5rem 0.5rem; font-size: 0.78rem; color: var(--color-text-subtle); font-style: italic; }

    .mini-card {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      cursor: pointer; transition: all 0.15s;
    }
    .mini-card:hover { border-color: var(--color-border); background: rgba(212,175,55,0.03); }
    .mini-card.selected { border-color: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary); }
    .mini-card.working { border-left: 3px solid #22c55e; }
    .mini-avatar { font-size: 1.4rem; flex-shrink: 0; }
    .mini-info { flex: 1; min-width: 0; }
    .mini-name { display: block; font-weight: 700; font-size: 0.78rem; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mini-title { display: block; font-size: 0.68rem; color: var(--color-text-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mini-status { flex-shrink: 0; }
    .mini-dot { width: 8px; height: 8px; border-radius: 50%; display: block; background: var(--color-border); }
    .mini-status.working .mini-dot { background: #22c55e; }
    .mini-status.idle .mini-dot { background: var(--color-border); }

    .overview-detail {
      margin-top: 12px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      padding: 1.25rem;
    }

    /* Team layout (two columns) */
    .team-layout { display: flex; gap: 16px; align-items: flex-start; }
    .team-list { width: 280px; min-width: 280px; display: flex; flex-direction: column; gap: 8px; }
    .detail-placeholder {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 3rem; color: var(--color-text-subtle); text-align: center;
      border: 1px dashed var(--color-border-light); border-radius: var(--radius-md);
    }
    .detail-placeholder mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.3; margin-bottom: 8px; }
    .detail-placeholder p { margin: 0; font-size: 0.85rem; }
    .employee-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 14px; cursor: pointer; transition: all 0.15s;
    }
    .employee-card:hover { border-color: var(--color-border); }
    .employee-card.selected { border-color: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary); }
    .employee-card.working { border-left: 3px solid #22c55e; }
    .emp-header { display: flex; align-items: center; gap: 10px; }
    .emp-avatar { font-size: 1.8rem; flex-shrink: 0; }
    .emp-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
    .emp-name { font-weight: 700; font-size: 0.9rem; color: var(--color-text); }
    .emp-title { font-size: 0.75rem; color: var(--color-text-subtle); }
    .emp-status {
      font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;
      text-transform: uppercase; flex-shrink: 0;
    }
    .emp-status.idle { color: var(--color-text-subtle); background: var(--color-border-light); }
    .emp-status.working { color: #22c55e; background: #22c55e15; }
    .emp-status.paused { color: #f59e0b; background: #f59e0b15; }
    .emp-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 8px; }
    .emp-tag {
      font-size: 0.65rem; font-weight: 600; padding: 2px 7px; border-radius: 100px;
      background: rgba(212,175,55,0.1); color: var(--color-primary); border: 1px solid rgba(212,175,55,0.2);
    }
    .emp-tools {
      display: flex; align-items: center; gap: 4px; margin-top: 6px;
      font-size: 0.68rem; color: var(--color-text-subtle);
    }
    .emp-tools .tools-icon { font-size: 12px; width: 12px; height: 12px; opacity: 0.6; }
    .emp-working { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.78rem; color: #22c55e; }
    .emp-last-activity { margin-top: 6px; font-size: 0.72rem; color: var(--color-text-subtle); }

    /* Employee detail */
    .employee-detail {
      flex: 1; min-width: 0;
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 1.25rem;
    }
    .detail-header { display: flex; align-items: center; gap: 14px; margin-bottom: 0.75rem; }
    .detail-avatar { font-size: 2.5rem; }
    .detail-info { display: flex; flex-direction: column; flex: 1; }
    .detail-info h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
    .detail-title { font-size: 0.82rem; color: var(--color-text-subtle); }
    .detail-status { font-size: 0.7rem; font-weight: 700; margin-top: 2px; }
    .detail-status.idle { color: var(--color-text-subtle); }
    .detail-status.working { color: #22c55e; }
    .detail-desc { font-size: 0.85rem; color: var(--color-text-subtle); margin: 0 0 1rem; line-height: 1.5; }
    .fire-btn {
      border: 1px solid #ef444440; border-radius: var(--radius-sm); background: none;
      color: #ef4444; cursor: pointer; padding: 6px; display: flex;
    }
    .fire-btn:hover { background: #ef444410; }

    /* Skills section */
    .skills-section { margin-bottom: 1rem; }
    .skills-section h3 { font-size: 0.9rem; font-weight: 700; color: var(--color-text); margin: 0 0 8px; }
    .tools-list { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
    .tool-chip {
      font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 100px;
      background: var(--color-border-light); color: var(--color-text-subtle);
    }
    .skills-list { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .skill-chip {
      display: flex; align-items: center; gap: 3px; font-size: 0.72rem; font-weight: 600;
      padding: 3px 6px 3px 10px; border-radius: 100px;
      background: rgba(212,175,55,0.1); color: var(--color-primary);
      border: 1px solid rgba(212,175,55,0.2);
    }
    .skill-remove {
      width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
      border: none; background: none; color: var(--color-text-subtle); cursor: pointer;
      padding: 0; border-radius: 50%;
    }
    .skill-remove:hover { color: #ef4444; background: #ef444415; }
    .skill-remove mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .add-skill-row { display: flex; gap: 6px; align-items: center; }
    .skill-name-input, .skill-desc-input {
      padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: 0.78rem;
      outline: none;
    }
    .skill-name-input { width: 140px; }
    .skill-desc-input { flex: 1; }
    .skill-name-input:focus, .skill-desc-input:focus { border-color: var(--color-primary); }
    .add-skill-btn {
      display: flex; align-items: center; gap: 3px; padding: 6px 12px;
      border: 1px solid var(--color-primary); border-radius: var(--radius-sm);
      background: none; color: var(--color-primary); font-family: inherit;
      font-size: 0.75rem; font-weight: 600; cursor: pointer; flex-shrink: 0;
    }
    .add-skill-btn:hover:not(:disabled) { background: var(--color-primary); color: #0A0A0A; }
    .add-skill-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .add-skill-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Task section */
    .task-section h3, .history-section h3 { font-size: 0.9rem; font-weight: 700; color: var(--color-text); margin: 0 0 8px; }
    .task-input-row { display: flex; gap: 8px; align-items: flex-end; }
    .task-input {
      flex: 1; padding: 10px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: 0.85rem;
      outline: none; resize: vertical;
    }
    .task-input:focus { border-color: var(--color-primary); }
    .task-input:disabled { opacity: 0.5; }
    .task-send {
      width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
      border: none; border-radius: var(--radius-sm); background: var(--color-primary);
      color: #0A0A0A; cursor: pointer; flex-shrink: 0;
    }
    .task-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .task-error {
      display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
      padding: 8px 12px; border-radius: var(--radius-sm);
      background: #ef444412; border: 1px solid #ef444430;
      font-size: 0.8rem; color: #ef4444;
    }
    .task-error mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

    /* Agent output */
    .agent-output {
      margin-top: 12px; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); overflow: hidden;
    }
    .agent-bar {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      background: rgba(34,197,94,0.06); border-bottom: 1px solid var(--color-border-light);
      font-size: 0.82rem; font-weight: 600; color: #22c55e;
    }
    .agent-bar mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .agent-bar.done { background: rgba(34,197,94,0.06); color: #22c55e; }
    .agent-bar.errored { background: rgba(239,68,68,0.06); color: #ef4444; }
    .pulse { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .agent-log {
      max-height: 250px; overflow-y: auto; padding: 8px 12px;
      font-family: 'Fira Code', monospace; font-size: 0.72rem; line-height: 1.5;
      background: var(--color-bg); color: var(--color-text-subtle);
    }
    .log-entry { white-space: pre-wrap; word-break: break-all; }
    .log-entry.text { color: var(--color-text); }
    .log-entry.error { color: #ef4444; }
    .tool-badge { font-weight: 700; color: #3b82f6; margin-right: 6px; padding: 1px 5px; background: #3b82f610; border-radius: 3px; }

    /* Task history */
    .history-section { margin-top: 1.25rem; }
    .history-item {
      padding: 10px 12px; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); margin-bottom: 6px;
    }
    .history-item.completed { border-left: 3px solid #22c55e; }
    .history-item.failed { border-left: 3px solid #ef4444; }
    .history-item.in_progress { border-left: 3px solid #f59e0b; }
    .history-top { display: flex; align-items: center; gap: 8px; }
    .history-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    .history-item.completed .history-icon { color: #22c55e; }
    .history-item.failed .history-icon { color: #ef4444; }
    .history-item.in_progress .history-icon { color: #f59e0b; }
    .history-desc { flex: 1; font-size: 0.82rem; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .history-time { font-size: 0.72rem; color: var(--color-text-subtle); flex-shrink: 0; }
    .history-result { margin-top: 6px; }
    .history-result summary { font-size: 0.78rem; color: var(--color-primary); cursor: pointer; font-weight: 600; }
    .history-result-content { font-size: 0.8rem; color: var(--color-text); margin-top: 6px; line-height: 1.5; }

    /* Hire tab */
    .dept-filter { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 1rem; }
    .dept-btn {
      padding: 6px 14px; border: 1px solid var(--color-border); border-radius: 100px;
      background: none; color: var(--color-text-subtle); font-family: inherit;
      font-size: 0.75rem; font-weight: 600; cursor: pointer; text-transform: capitalize;
    }
    .dept-btn:hover { border-color: var(--color-primary); color: var(--color-text); }
    .dept-btn.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,0.06); }
    .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
    .role-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 16px;
    }
    .role-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .role-avatar { font-size: 2rem; }
    .role-info { display: flex; flex-direction: column; }
    .role-name { font-weight: 700; font-size: 0.9rem; color: var(--color-text); }
    .role-dept { font-size: 0.72rem; color: var(--color-text-subtle); text-transform: capitalize; }
    .role-desc { font-size: 0.82rem; color: var(--color-text-subtle); margin: 0 0 8px; line-height: 1.4; }
    .role-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px; }
    .role-tag {
      font-size: 0.65rem; font-weight: 600; padding: 2px 7px; border-radius: 100px;
      background: rgba(212,175,55,0.08); color: var(--color-primary); border: 1px solid rgba(212,175,55,0.15);
    }
    .role-tools {
      display: flex; align-items: center; gap: 4px; margin-bottom: 10px;
      font-size: 0.7rem; color: var(--color-text-subtle);
    }
    .role-tools mat-icon { font-size: 12px; width: 12px; height: 12px; opacity: 0.5; }
    .hire-btn {
      display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center;
      padding: 8px 16px; border: 1px solid var(--color-primary); border-radius: var(--radius-sm);
      background: none; color: var(--color-primary); font-family: inherit;
      font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .hire-btn:hover { background: var(--color-primary); color: #0A0A0A; }
    .hire-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Comms tab */
    .comms-list { display: flex; flex-direction: column; gap: 10px; }
    .comm-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); overflow: hidden;
    }
    .comm-header {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-bottom: 1px solid var(--color-border-light); background: rgba(212,175,55,0.04);
    }
    .comm-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .comm-name { font-weight: 700; font-size: 0.85rem; color: var(--color-text); flex: 1; }
    .comm-time { font-size: 0.72rem; color: var(--color-text-subtle); }
    .comm-body { padding: 14px; font-size: 0.85rem; line-height: 1.6; color: var(--color-text); }
    .comm-body :first-child { margin-top: 0; }
    .comm-body :last-child { margin-bottom: 0; }

    /* Manager tab */
    .manager-panel { display: flex; flex-direction: column; gap: 12px; }
    .manager-section {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 16px;
    }
    .manager-section h3 {
      display: flex; align-items: center; gap: 6px; margin: 0 0 10px;
      font-size: 0.95rem; font-weight: 700; color: var(--color-text);
    }
    .manager-section h3 mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .manager-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .manager-section-header h3 { margin: 0; }
    .manager-actions { display: flex; align-items: center; gap: 8px; }
    .manager-status { font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; background: var(--color-border-light); color: var(--color-text-subtle); }
    .manager-status.active { background: #22c55e15; color: #22c55e; }
    .manager-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; display: inline-block; margin-left: 4px; }
    .no-data { text-align: center; padding: 2rem; font-size: 0.82rem; color: var(--color-text-subtle); }

    /* Manager log */
    .manager-log-list { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
    .mlog-entry {
      display: flex; align-items: flex-start; gap: 8px; padding: 6px 10px;
      border-radius: var(--radius-sm); font-size: 0.8rem;
    }
    .mlog-entry.info { color: var(--color-text); }
    .mlog-entry.warning { background: #f59e0b08; color: #f59e0b; }
    .mlog-entry.error { background: #ef444408; color: #ef4444; }
    .mlog-entry.action { color: #3b82f6; }
    .mlog-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    .mlog-msg { flex: 1; line-height: 1.4; }
    .mlog-time { font-size: 0.68rem; color: var(--color-text-subtle); flex-shrink: 0; white-space: nowrap; }

    /* Telegram setup */
    .tg-connected { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .tg-connected-badge {
      display: flex; align-items: center; gap: 4px;
      font-size: 0.78rem; font-weight: 700; color: #22c55e;
      background: #22c55e12; padding: 4px 12px; border-radius: 100px;
    }
    .tg-connected-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .tg-chat-id { font-size: 0.78rem; color: var(--color-text-subtle); font-family: monospace; }

    .tg-wizard { display: flex; flex-direction: column; gap: 0; }
    .tg-step {
      display: flex; gap: 12px; padding: 12px 0;
      border-bottom: 1px solid var(--color-border-light);
    }
    .tg-step:last-of-type { border-bottom: none; }
    .tg-step-num {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border-radius: 50%; background: var(--color-primary); color: #0A0A0A;
      font-size: 0.78rem; font-weight: 700; flex-shrink: 0;
    }
    .tg-step-body { flex: 1; }
    .tg-step-body strong { font-size: 0.88rem; color: var(--color-text); display: block; margin-bottom: 4px; }
    .tg-step-body p { font-size: 0.8rem; color: var(--color-text-subtle); margin: 0 0 8px; line-height: 1.5; }
    .tg-step-body code {
      background: var(--color-border-light); padding: 1px 6px; border-radius: 3px;
      font-size: 0.82rem; color: var(--color-primary);
    }
    .tg-token-input {
      width: 100%; max-width: 460px; padding: 10px 14px; margin-top: 6px;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text);
      font-family: 'Fira Code', monospace; font-size: 0.82rem; outline: none;
    }
    .tg-token-input:focus { border-color: var(--color-primary); }
    .tg-token-input::placeholder { color: var(--color-text-subtle); font-family: inherit; }

    .tg-btn {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text); font-family: inherit;
      font-size: 0.82rem; font-weight: 600; cursor: pointer;
    }
    .tg-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .tg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .tg-btn.primary { background: var(--color-primary); color: #0A0A0A; border-color: var(--color-primary); }
    .tg-btn.primary:hover:not(:disabled) { opacity: 0.9; }
    .tg-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .tg-result {
      display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px;
      border-radius: var(--radius-sm); margin-top: 12px;
      border: 1px solid var(--color-border-light); font-size: 0.82rem; color: var(--color-text);
    }
    .tg-result.complete { border-color: #22c55e40; background: #22c55e08; }
    .tg-result.complete mat-icon { color: #22c55e; }
    .tg-result.waiting { border-color: #f59e0b40; background: #f59e0b08; }
    .tg-result.waiting mat-icon { color: #f59e0b; }
    .tg-result.error { border-color: #ef444440; background: #ef444408; }
    .tg-result.error mat-icon { color: #ef4444; }
    .tg-result mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .tg-result p { margin: 4px 0 0; font-size: 0.78rem; color: var(--color-text-subtle); }
    .tg-result code { background: var(--color-border-light); padding: 1px 6px; border-radius: 3px; }
  `],
})
export class HrComponent implements OnInit, OnDestroy {
  loading = true;
  projects: Project[] = [];
  selectedProjectId = '';
  activeTab: 'overview' | 'team' | 'hire' | 'comms' | 'manager' = 'overview';

  // Overview
  allEmployees: Employee[] = [];
  projectGroups: { project: Project; employees: Employee[] }[] = [];

  employees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  roles: RoleTemplate[] = [];
  filterDept = 'all';
  departments = ['all', 'management', 'engineering', 'product', 'design', 'qa', 'devops', 'data', 'marketing'];

  // Task & Skills
  taskInput = '';
  taskError = '';
  newSkillName = '';
  newSkillDesc = '';
  agentRunning = false;
  agentEntries: { type: string; content: string; tool?: string }[] = [];
  private agentSub: Subscription | null = null;

  // Comms
  comms: CommFile[] = [];
  commsLoading = false;

  // Manager
  managerRunning = false;
  managerLog: { timestamp: string; type: string; message: string }[] = [];
  managerLoading = false;

  // Telegram
  telegramStatus: any = null;
  telegramTokenInput = '';
  telegramSetupLoading = false;
  telegramSetupResult: any = null;
  telegramTesting = false;

  constructor(
    private employeeService: EmployeeService,
    private projectService: ProjectService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadAllEmployees();
      },
      error: () => { this.loading = false; },
    });

    this.employeeService.getRoles().subscribe({
      next: (roles) => this.roles = roles,
    });
  }

  ngOnDestroy(): void {
    this.agentSub?.unsubscribe();
  }

  get filteredRoles(): RoleTemplate[] {
    if (this.filterDept === 'all') return this.roles;
    return this.roles.filter(r => r.department === this.filterDept);
  }

  loadAllEmployees(): void {
    this.employeeService.getAll().subscribe({
      next: (emps) => {
        this.allEmployees = emps;
        this.projectGroups = this.projects.map(p => ({
          project: p,
          employees: emps.filter(e => e.projectId === p._id),
        })).filter(pg => pg.employees.length > 0);
        // Also add projects with 0 employees at the end
        const withEmps = new Set(this.projectGroups.map(pg => pg.project._id));
        for (const p of this.projects) {
          if (!withEmps.has(p._id)) {
            this.projectGroups.push({ project: p, employees: [] });
          }
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  selectEmployeeFromOverview(emp: Employee, projectId: string): void {
    this.selectedProjectId = projectId;
    this.selectedEmployee = emp;
    this.taskError = '';
    this.agentEntries = [];
    this.employeeService.getById(emp._id!).subscribe({
      next: (fresh) => this.selectedEmployee = fresh,
    });
  }

  onProjectChange(): void {
    this.selectedEmployee = null;
    this.agentRunning = false;
    if (this.selectedProjectId) {
      this.loadEmployees();
    } else {
      this.employees = [];
    }
  }

  loadEmployees(): void {
    this.employeeService.getByProject(this.selectedProjectId).subscribe({
      next: (emps) => this.employees = emps,
    });
  }

  selectEmployee(emp: Employee): void {
    this.selectedEmployee = emp;
    this.agentEntries = [];
    this.agentRunning = false;
    // Refresh to get latest data
    this.employeeService.getById(emp._id!).subscribe({
      next: (fresh) => this.selectedEmployee = fresh,
    });
  }

  hireRole(role: RoleTemplate): void {
    if (!this.selectedProjectId) return;
    this.employeeService.hire(this.selectedProjectId, role.role).subscribe({
      next: (emp) => {
        this.employees.push(emp);
        this.loadAllEmployees();
        this.snackBar.open(`${emp.name} hired!`, 'Close', { duration: 3000 });
        this.activeTab = 'overview';
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to hire', 'Close', { duration: 3000 }),
    });
  }

  fireEmployee(emp: Employee): void {
    if (!confirm(`Remove ${emp.name}?`)) return;
    this.employeeService.fire(emp._id!).subscribe({
      next: () => {
        this.employees = this.employees.filter(e => e._id !== emp._id);
        if (this.selectedEmployee?._id === emp._id) this.selectedEmployee = null;
        this.loadAllEmployees();
        this.snackBar.open(`${emp.name} removed`, 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to remove', 'Close', { duration: 3000 }),
    });
  }

  addSkill(): void {
    if (!this.selectedEmployee || !this.newSkillName.trim()) return;
    this.employeeService.addSkill(this.selectedEmployee._id!, {
      name: this.newSkillName.trim(),
      description: this.newSkillDesc.trim(),
      prompt: '',
    }).subscribe({
      next: (emp) => {
        this.selectedEmployee = emp;
        this.newSkillName = '';
        this.newSkillDesc = '';
        this.snackBar.open('Skill installed', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to install skill', 'Close', { duration: 3000 }),
    });
  }

  removeSkill(skillName: string): void {
    if (!this.selectedEmployee) return;
    this.employeeService.removeSkill(this.selectedEmployee._id!, skillName).subscribe({
      next: (emp) => {
        this.selectedEmployee = emp;
        this.snackBar.open('Skill removed', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to remove skill', 'Close', { duration: 3000 }),
    });
  }

  assignTask(): void {
    if (!this.selectedEmployee || !this.taskInput.trim()) return;
    this.taskError = '';
    this.agentRunning = true;
    this.agentEntries = [];
    this.selectedEmployee.status = 'working';

    // Update the overview mini-card to show working status
    this.updateOverviewStatus(this.selectedEmployee._id!, 'working');

    this.agentSub = this.employeeService.assignTask(this.selectedEmployee._id!, this.taskInput.trim()).subscribe({
      next: (event) => {
        if (event.type === 'start') {
          this.agentEntries.push({ type: 'text', content: '--- Agent started ---' });
        } else if (event.type === 'text' && event.content) {
          this.agentEntries.push({ type: 'text', content: event.content });
        } else if (event.type === 'tool_use') {
          this.agentEntries.push({ type: 'tool_use', content: event.content || '', tool: event.tool });
        } else if (event.type === 'tool_result' && event.content) {
          const t = event.content.length > 500 ? event.content.substring(0, 500) + '...' : event.content;
          this.agentEntries.push({ type: 'tool_result', content: t });
        } else if (event.type === 'error') {
          this.agentEntries.push({ type: 'error', content: event.content || 'Error' });
          this.taskError = event.content || 'Task failed';
          // Stop immediately on error
          this.agentRunning = false;
          if (this.selectedEmployee) {
            const id = this.selectedEmployee._id!;
            this.updateOverviewStatus(id, 'idle');
            this.employeeService.getById(id).subscribe({
              next: (fresh) => this.selectedEmployee = fresh,
            });
          }
          this.loadAllEmployees();
        } else if (event.type === 'done') {
          this.agentEntries.push({ type: 'text', content: '--- Agent finished ---' });
        }
      },
      complete: () => {
        this.agentRunning = false;
        this.taskInput = '';
        if (this.selectedEmployee) {
          const id = this.selectedEmployee._id!;
          this.updateOverviewStatus(id, 'idle');
          this.employeeService.getById(id).subscribe({
            next: (fresh) => this.selectedEmployee = fresh,
          });
        }
        this.loadEmployees();
        this.loadAllEmployees();
      },
      error: (err) => {
        this.agentRunning = false;
        this.taskError = err?.message || 'Failed to connect to agent';
        if (this.selectedEmployee) {
          const id = this.selectedEmployee._id!;
          this.updateOverviewStatus(id, 'idle');
          this.employeeService.getById(id).subscribe({
            next: (fresh) => this.selectedEmployee = fresh,
            error: () => { if (this.selectedEmployee) this.selectedEmployee.status = 'idle'; },
          });
        }
        this.loadEmployees();
        this.loadAllEmployees();
      },
    });
  }

  private updateOverviewStatus(employeeId: string, status: 'idle' | 'working' | 'paused'): void {
    for (const pg of this.projectGroups) {
      const emp = pg.employees.find(e => e._id === employeeId);
      if (emp) { emp.status = status; break; }
    }
  }

  loadComms(): void {
    if (!this.selectedProjectId) return;
    this.commsLoading = true;
    this.employeeService.getComms(this.selectedProjectId).subscribe({
      next: (files) => { this.comms = files; this.commsLoading = false; },
      error: () => { this.commsLoading = false; },
    });
  }

  parseMarkdown(text: string): SafeHtml {
    const html = marked.parse(text || '', { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  formatTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  // Manager
  loadManagerLog(): void {
    this.managerLoading = true;
    this.http.get<any>(`${environment.apiUrl}/employees/manager/log`).subscribe({
      next: (res) => {
        this.managerRunning = res.running;
        this.managerLog = res.log;
        this.managerLoading = false;
      },
      error: () => { this.managerLoading = false; },
    });
    // Also load telegram status
    this.http.get<any>(`${environment.apiUrl}/telegram/status`).subscribe({
      next: (status) => this.telegramStatus = status,
    });
  }

  runManagerCheck(): void {
    this.managerLoading = true;
    this.http.post<any>(`${environment.apiUrl}/employees/manager/check`, {}).subscribe({
      next: (res) => {
        this.managerLog = res.log;
        this.managerLoading = false;
        this.snackBar.open('Check completed', 'Close', { duration: 2000 });
        this.loadManagerLog();
      },
      error: () => { this.managerLoading = false; },
    });
  }

  setupTelegram(): void {
    if (!this.telegramTokenInput.trim()) return;
    this.telegramSetupLoading = true;
    this.telegramSetupResult = null;
    this.http.post<any>(`${environment.apiUrl}/telegram/setup`, { botToken: this.telegramTokenInput.trim() }).subscribe({
      next: (res) => {
        this.telegramSetupLoading = false;
        this.telegramSetupResult = res;
        if (res.step === 'complete') {
          this.telegramStatus = { configured: true, chatId: res.chatId };
          this.snackBar.open('Telegram connected!', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.telegramSetupLoading = false;
        const msg = err.error?.error || err.error?.message || err.message || `HTTP ${err.status}: Setup failed`;
        this.telegramSetupResult = { step: 'error', message: msg };
      },
    });
  }

  testTelegram(): void {
    this.telegramTesting = true;
    this.http.post<any>(`${environment.apiUrl}/telegram/test-send`, {}).subscribe({
      next: (res) => {
        this.telegramTesting = false;
        this.snackBar.open(res.message, 'Close', { duration: 3000 });
      },
      error: () => {
        this.telegramTesting = false;
        this.snackBar.open('Test failed', 'Close', { duration: 3000 });
      },
    });
  }
}
