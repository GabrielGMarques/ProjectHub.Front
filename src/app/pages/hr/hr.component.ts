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
import { WebSocketService, WSEmployeeStatus, WSTaskUpdate, WSEmployeeLog } from '../../services/websocket.service';
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
        <p class="subtitle">Hire and manage AI employees for your companies</p>
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
          <button class="hr-tab" [class.active]="activeTab === 'skills'" (click)="loadSkillsConfig(); activeTab = 'skills'">
            <mat-icon>auto_fix_high</mat-icon> Skills
          </button>
          <button class="hr-tab" [class.active]="activeTab === 'manager'" (click)="loadManagerLog(); activeTab = 'manager'">
            <mat-icon>admin_panel_settings</mat-icon> Manager
            @if (managerRunning) { <span class="manager-live-dot"></span> }
          </button>
        </div>

        <!-- Overview tab: All projects with employees in columns -->
        @if (activeTab === 'overview') {
          @if (projects.length === 0) {
            <div class="empty-state">
              <mat-icon>group_add</mat-icon>
              <h2>No companies yet</h2>
              <p>Create a company on the Dashboard first, then come back to hire employees.</p>
            </div>
          } @else {
            <div class="overview-grid">
              @for (pg of projectGroups; track pg.project._id) {
                <div class="project-column">
                  <div class="project-col-header">
                    <span class="project-col-name">{{ pg.project.name }}</span>
                    <span class="project-col-count">{{ pg.employees.length }}</span>
                  </div>

                  <!-- Development Cycle -->
                  <div class="cycle-bar">
                    <button class="cycle-arrow" (click)="scrollCycle($event, -1)" matTooltip="Scroll left">
                      <mat-icon>chevron_left</mat-icon>
                    </button>
                    <div class="cycle-phases">
                      @for (phase of cyclePhases; track phase) {
                        <div class="cycle-phase"
                             [class.active]="pg.project.strategicCycle?.status === phase"
                             [class.done]="isCyclePhaseDone(pg.project, phase)"
                             (click)="setCycleStatus(pg.project, phase)">
                          <span class="cycle-icon">{{ cyclePhaseIcon(phase) }}</span>
                          <span class="cycle-label">{{ phase }}</span>
                        </div>
                      }
                    </div>
                    <button class="cycle-arrow" (click)="scrollCycle($event, 1)" matTooltip="Scroll right">
                      <mat-icon>chevron_right</mat-icon>
                    </button>
                    @if (pg.project.strategicCycle?.status === 'dev' || pg.project.strategicCycle?.status === 'qa') {
                      <div class="cycle-progress">
                        @if (pg.project.strategicCycle.status === 'dev') {
                          <span class="cycle-count">Dev: {{ pg.project.strategicCycle.devTasksDone }}/{{ pg.project.strategicCycle.devTasksTotal }}</span>
                        } @else {
                          <span class="cycle-count">QA: {{ pg.project.strategicCycle.qaTasksDone }}/{{ pg.project.strategicCycle.qaTasksTotal }}</span>
                        }
                      </div>
                    }
                    @if (pg.project.strategicCycle?.advice) {
                      <button class="cycle-advice-btn" (click)="toggleCycleAdvice(pg.project._id!)" matTooltip="View strategic advice">
                        <mat-icon>lightbulb</mat-icon>
                      </button>
                    }
                  </div>
                  @if (expandedCycleAdvice === pg.project._id) {
                    <div class="cycle-advice-panel">
                      <div class="cycle-advice-header">
                        <span>Strategic Direction</span>
                        <div class="cycle-advice-actions">
                          @if (!editingDirection) {
                            <button (click)="startEditDirection(pg.project)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                          }
                          <button (click)="expandedCycleAdvice = ''; editingDirection = false"><mat-icon>close</mat-icon></button>
                        </div>
                      </div>
                      @if (editingDirection) {
                        <div class="direction-edit">
                          <textarea [(ngModel)]="directionEditText" rows="6" class="direction-textarea"></textarea>
                          <div class="direction-edit-actions">
                            <button class="dir-save" (click)="saveDirection(pg.project)"><mat-icon>check</mat-icon> Save</button>
                            <button class="dir-cancel" (click)="editingDirection = false"><mat-icon>close</mat-icon> Cancel</button>
                          </div>
                        </div>
                      } @else {
                        <div class="cycle-advice-body">{{ pg.project.strategicDirection || pg.project.strategicCycle?.advice || 'No strategic direction set yet.' }}</div>
                      }
                    </div>
                  }

                  <div class="project-col-body">
                    @for (emp of pg.employees; track emp._id) {
                      <div class="mini-card" [class.working]="emp.status === 'working'"
                           [class.selected]="selectedEmployee?._id === emp._id"
                           (click)="selectEmployeeFromOverview(emp, pg.project._id!)">
                        <span class="mini-avatar">{{ emp.avatar }}</span>
                        <div class="mini-info">
                          <span class="mini-name">{{ emp.name }}</span>
                          <span class="mini-title">{{ emp.title }}</span>
                          @if (getLatestTask(emp); as lt) {
                            <span class="mini-task" [class]="lt.status">
                              {{ taskStatusIcon(lt.status) }} {{ lt.description | slice:0:40 }}{{ lt.description.length > 40 ? '...' : '' }}
                            </span>
                          }
                        </div>
                        <span class="mini-status" [class]="emp.status">
                          @if (emp.status === 'working') {
                            <mat-spinner diameter="12"></mat-spinner>
                          } @else {
                            <span class="mini-dot"></span>
                          }
                        </span>
                        <button class="mini-expand" (click)="openEmployeeModal(emp, pg.project._id!); $event.stopPropagation()" matTooltip="Expand">
                          <mat-icon>open_in_full</mat-icon>
                        </button>
                      </div>
                    }
                    @if (pg.employees.length === 0) {
                      <div class="project-col-empty">
                        <span>No employees</span>
                        <button class="hire-quick-btn" (click)="selectedProjectId = pg.project._id!; activeTab = 'hire'">
                          <mat-icon>person_add</mat-icon> Hire
                        </button>
                      </div>
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
                  <div class="control-btns">
                    @if (selectedEmployee.status === 'working') {
                      <button class="ctrl-btn stop" (click)="stopEmployee()" matTooltip="Stop">
                        <mat-icon>stop</mat-icon>
                      </button>
                      <button class="ctrl-btn restart" (click)="restartEmployee()" matTooltip="Restart">
                        <mat-icon>restart_alt</mat-icon>
                      </button>
                    } @else {
                      <button class="ctrl-btn start" (click)="restartEmployee()" matTooltip="Wake up"
                              [disabled]="!selectedEmployee.taskHistory?.length">
                        <mat-icon>play_arrow</mat-icon>
                      </button>
                    }
                    <button class="ctrl-btn" [class.active]="detailTab === 'memory'" (click)="detailTab = detailTab === 'memory' ? 'task' : 'memory'; detailTab === 'memory' && loadMemories(selectedEmployee)" matTooltip="Memory">
                      <mat-icon>psychology</mat-icon>
                    </button>
                    <button class="ctrl-btn" [class.active]="detailTab === 'chat'" (click)="detailTab = detailTab === 'chat' ? 'task' : 'chat'" matTooltip="Chat">
                      <mat-icon>chat</mat-icon>
                    </button>
                    <button class="ctrl-btn" (click)="openLogs(selectedEmployee)" matTooltip="Logs">
                      <mat-icon>receipt_long</mat-icon>
                    </button>
                    <button class="fire-btn" (click)="fireEmployee(selectedEmployee)" matTooltip="Remove">
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Chat panel (like Alfred) -->
                @if (detailTab === 'chat') {
                  <div class="emp-chat-panel">
                    <div class="emp-chat-body">
                      @if (chatMessages.length === 0) {
                        <div class="emp-chat-empty">
                          <mat-icon>chat_bubble_outline</mat-icon>
                          <p>Send a message to {{ selectedEmployee.name }} while they're working.</p>
                          <p class="hint">Messages are delivered mid-execution so the agent can adapt.</p>
                        </div>
                      }
                      @for (msg of chatMessages; track $index) {
                        <div class="emp-msg" [class.user]="msg.role === 'user'" [class.agent]="msg.role === 'agent'">
                          <span class="emp-msg-sender">{{ msg.role === 'user' ? 'You' : selectedEmployee.name }}</span>
                          <span class="emp-msg-text">{{ msg.text }}</span>
                        </div>
                      }
                    </div>
                    <div class="emp-chat-input">
                      <input [(ngModel)]="chatInput" placeholder="Message {{ selectedEmployee.name }}..."
                             (keydown.enter)="sendChatMessage(selectedEmployee)" />
                      <button (click)="sendChatMessage(selectedEmployee)" [disabled]="!chatInput.trim() || chatSending">
                        <mat-icon>send</mat-icon>
                      </button>
                    </div>
                  </div>
                }

                <!-- Memory panel -->
                @if (detailTab === 'memory') {
                  <div class="memory-panel">
                    <div class="memory-header">
                      <h3><mat-icon>psychology</mat-icon> Memory ({{ employeeMemories.length }})</h3>
                      <div class="memory-actions">
                        <button class="mem-btn" (click)="compactLogs(selectedEmployee)" matTooltip="Compact recent logs into memory" [disabled]="compacting">
                          <mat-icon>compress</mat-icon> {{ compacting ? 'Compacting...' : 'Compact' }}
                        </button>
                        <button class="mem-btn danger" (click)="wipeMemories(selectedEmployee)" matTooltip="Clear all memories">
                          <mat-icon>delete_sweep</mat-icon> Wipe
                        </button>
                      </div>
                    </div>
                    <div class="memory-filters">
                      <button class="filter-chip" [class.active]="memoryFilter === ''" (click)="memoryFilter = ''; loadMemories(selectedEmployee)">All</button>
                      <button class="filter-chip" [class.active]="memoryFilter === 'learning'" (click)="memoryFilter = 'learning'; loadMemories(selectedEmployee)">Learnings</button>
                      <button class="filter-chip" [class.active]="memoryFilter === 'goal'" (click)="memoryFilter = 'goal'; loadMemories(selectedEmployee)">Goals</button>
                      <button class="filter-chip" [class.active]="memoryFilter === 'blocker'" (click)="memoryFilter = 'blocker'; loadMemories(selectedEmployee)">Blockers</button>
                      <button class="filter-chip" [class.active]="memoryFilter === 'decision'" (click)="memoryFilter = 'decision'; loadMemories(selectedEmployee)">Decisions</button>
                      <button class="filter-chip" [class.active]="memoryFilter === 'context'" (click)="memoryFilter = 'context'; loadMemories(selectedEmployee)">Context</button>
                    </div>
                    <div class="memory-list">
                      @if (memoriesLoading) {
                        <div class="logs-loading"><mat-spinner diameter="20"></mat-spinner> Loading...</div>
                      } @else if (employeeMemories.length === 0) {
                        <div class="logs-empty">No memories yet. Assign tasks and memories will be auto-extracted from logs.</div>
                      } @else {
                        @for (mem of employeeMemories; track mem._id) {
                          <div class="mem-card" [class]="mem.category">
                            <div class="mem-top">
                              <span class="mem-cat-badge">{{ memoryCategoryIcon(mem.category) }} {{ mem.category }}</span>
                              <span class="mem-importance" matTooltip="Importance">{{ mem.importance }}/10</span>
                              <button class="mem-delete" (click)="deleteMemory(selectedEmployee, mem._id)" matTooltip="Delete">
                                <mat-icon>close</mat-icon>
                              </button>
                            </div>
                            <p class="mem-content">{{ mem.content }}</p>
                            @if (mem.tags.length) {
                              <div class="mem-tags">
                                @for (tag of mem.tags; track tag) {
                                  <span class="mem-tag">{{ tag }}</span>
                                }
                              </div>
                            }
                            <span class="mem-source">{{ mem.source }} · {{ mem.createdAt | date:'MM/dd HH:mm' }} · accessed {{ mem.accessCount }}x</span>
                          </div>
                        }
                      }
                    </div>
                    <!-- Add memory manually -->
                    <div class="mem-add">
                      <select [(ngModel)]="newMemCategory" class="mem-add-cat">
                        <option value="learning">Learning</option>
                        <option value="goal">Goal</option>
                        <option value="blocker">Blocker</option>
                        <option value="decision">Decision</option>
                        <option value="preference">Preference</option>
                        <option value="context">Context</option>
                      </select>
                      <input [(ngModel)]="newMemContent" placeholder="Add a memory..." class="mem-add-input" (keydown.enter)="addManualMemory(selectedEmployee)" />
                      <button (click)="addManualMemory(selectedEmployee)" [disabled]="!newMemContent.trim()" class="mem-add-btn">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                  </div>
                }

                <!-- Logs panel -->
                @if (showLogsFor === selectedEmployee._id) {
                  <div class="logs-panel">
                    <div class="logs-header">
                      <h3><mat-icon>receipt_long</mat-icon> Execution Logs</h3>
                      <div class="logs-filters">
                        <button class="filter-chip" [class.active]="logsFilter === ''" (click)="logsFilter = ''; loadLogs(selectedEmployee)">All</button>
                        <button class="filter-chip" [class.active]="logsFilter === 'task_start'" (click)="logsFilter = 'task_start'; loadLogs(selectedEmployee)">Start</button>
                        <button class="filter-chip" [class.active]="logsFilter === 'task_complete'" (click)="logsFilter = 'task_complete'; loadLogs(selectedEmployee)">Complete</button>
                        <button class="filter-chip" [class.active]="logsFilter === 'task_fail'" (click)="logsFilter = 'task_fail'; loadLogs(selectedEmployee)">Failed</button>
                        <button class="filter-chip" [class.active]="logsFilter === 'tool_use'" (click)="logsFilter = 'tool_use'; loadLogs(selectedEmployee)">Tools</button>
                        <button class="filter-chip" [class.active]="logsFilter === 'text'" (click)="logsFilter = 'text'; loadLogs(selectedEmployee)">Text</button>
                        <button class="filter-chip" [class.active]="logsFilter === 'error'" (click)="logsFilter = 'error'; loadLogs(selectedEmployee)">Errors</button>
                      </div>
                      <button class="logs-close" (click)="showLogsFor = ''"><mat-icon>close</mat-icon></button>
                    </div>
                    <div class="logs-body">
                      @if (logsLoading) {
                        <div class="logs-loading"><mat-spinner diameter="20"></mat-spinner> Loading...</div>
                      } @else if (employeeLogs.length === 0) {
                        <div class="logs-empty">No logs found</div>
                      } @else {
                        @for (log of employeeLogs; track log._id) {
                          <div class="log-row" [class]="log.category">
                            <span class="log-time">{{ log.createdAt | date:'MM/dd HH:mm:ss' }}</span>
                            <span class="log-cat">{{ logIcon(log.category) }} {{ log.category }}</span>
                            <span class="log-content">{{ log.content }}</span>
                            @if (log.metadata?.tool) {
                              <span class="log-tool">{{ log.metadata.tool }}</span>
                            }
                          </div>
                        }
                        @if (logsPagination.pages > 1) {
                          <div class="logs-pagination">
                            <button [disabled]="logsPagination.page <= 1" (click)="loadLogsPage(selectedEmployee, logsPagination.page - 1)">Prev</button>
                            <span>{{ logsPagination.page }} / {{ logsPagination.pages }} ({{ logsPagination.total }} entries)</span>
                            <button [disabled]="logsPagination.page >= logsPagination.pages" (click)="loadLogsPage(selectedEmployee, logsPagination.page + 1)">Next</button>
                          </div>
                        }
                      }
                    </div>
                  </div>
                }

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
            <label>Company:</label>
            <select [(ngModel)]="selectedProjectId" (ngModelChange)="onProjectChange()">
              <option value="">-- Select a company --</option>
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
                <p>Go to the Hire tab to add AI employees to this company.</p>
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
                      <button class="logs-btn" (click)="openLogs(selectedEmployee)" matTooltip="View Logs">
                        <mat-icon>receipt_long</mat-icon>
                      </button>
                      <button class="fire-btn" (click)="fireEmployee(selectedEmployee)" matTooltip="Remove employee">
                        <mat-icon>person_remove</mat-icon>
                      </button>
                    </div>
                    <p class="detail-desc">{{ selectedEmployee.description }}</p>

                    <!-- Logs panel (Manage tab) -->
                    @if (showLogsFor === selectedEmployee._id) {
                      <div class="logs-panel">
                        <div class="logs-header">
                          <h3><mat-icon>receipt_long</mat-icon> Execution Logs</h3>
                          <div class="logs-filters">
                            <button class="filter-chip" [class.active]="logsFilter === ''" (click)="logsFilter = ''; loadLogs(selectedEmployee)">All</button>
                            <button class="filter-chip" [class.active]="logsFilter === 'task_start'" (click)="logsFilter = 'task_start'; loadLogs(selectedEmployee)">Start</button>
                            <button class="filter-chip" [class.active]="logsFilter === 'task_complete'" (click)="logsFilter = 'task_complete'; loadLogs(selectedEmployee)">Complete</button>
                            <button class="filter-chip" [class.active]="logsFilter === 'task_fail'" (click)="logsFilter = 'task_fail'; loadLogs(selectedEmployee)">Failed</button>
                            <button class="filter-chip" [class.active]="logsFilter === 'tool_use'" (click)="logsFilter = 'tool_use'; loadLogs(selectedEmployee)">Tools</button>
                            <button class="filter-chip" [class.active]="logsFilter === 'text'" (click)="logsFilter = 'text'; loadLogs(selectedEmployee)">Text</button>
                            <button class="filter-chip" [class.active]="logsFilter === 'error'" (click)="logsFilter = 'error'; loadLogs(selectedEmployee)">Errors</button>
                          </div>
                          <button class="logs-close" (click)="showLogsFor = ''"><mat-icon>close</mat-icon></button>
                        </div>
                        <div class="logs-body">
                          @if (logsLoading) {
                            <div class="logs-loading"><mat-spinner diameter="20"></mat-spinner> Loading...</div>
                          } @else if (employeeLogs.length === 0) {
                            <div class="logs-empty">No logs found</div>
                          } @else {
                            @for (log of employeeLogs; track log._id) {
                              <div class="log-row" [class]="log.category">
                                <span class="log-time">{{ log.createdAt | date:'MM/dd HH:mm:ss' }}</span>
                                <span class="log-cat">{{ logIcon(log.category) }} {{ log.category }}</span>
                                <span class="log-content">{{ log.content }}</span>
                                @if (log.metadata?.tool) {
                                  <span class="log-tool">{{ log.metadata.tool }}</span>
                                }
                              </div>
                            }
                            @if (logsPagination.pages > 1) {
                              <div class="logs-pagination">
                                <button [disabled]="logsPagination.page <= 1" (click)="loadLogsPage(selectedEmployee, logsPagination.page - 1)">Prev</button>
                                <span>{{ logsPagination.page }} / {{ logsPagination.pages }} ({{ logsPagination.total }} entries)</span>
                                <button [disabled]="logsPagination.page >= logsPagination.pages" (click)="loadLogsPage(selectedEmployee, logsPagination.page + 1)">Next</button>
                              </div>
                            }
                          }
                        </div>
                      </div>
                    }

                    <!-- Assign task + controls -->
                    <div class="task-section">
                      <div class="task-header-row">
                        <h3>Task</h3>
                        <div class="task-controls">
                          @if (selectedEmployee.status === 'working') {
                            <button class="ctrl-btn stop" (click)="stopEmployee()" matTooltip="Stop current task">
                              <mat-icon>stop</mat-icon>
                            </button>
                            <button class="ctrl-btn restart" (click)="restartEmployee()" matTooltip="Restart with self-evaluation">
                              <mat-icon>restart_alt</mat-icon>
                            </button>
                          }
                        </div>
                      </div>
                      @if (taskError) {
                        <div class="task-error">
                          <mat-icon>error</mat-icon> {{ taskError }}
                        </div>
                      }
                      <div class="task-input-row">
                        <textarea class="task-input" [(ngModel)]="taskInput" placeholder="Describe the task for this employee..."
                                  [disabled]="selectedEmployee.status === 'working'" rows="2"></textarea>
                        <button class="task-send" (click)="assignTask()" [disabled]="!taskInput.trim() || selectedEmployee.status === 'working'"
                                matTooltip="Start task">
                          <mat-icon>play_arrow</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Send mid-execution message -->
                    @if (selectedEmployee.status === 'working') {
                      <div class="inject-section">
                        <div class="inject-row">
                          <input class="inject-input" [(ngModel)]="injectMessage" placeholder="Send message to working agent..."
                                 (keydown.enter)="sendMessageToEmployee()" />
                          <button class="inject-btn" (click)="sendMessageToEmployee()" [disabled]="!injectMessage.trim() || sendingMessage"
                                  matTooltip="Inject message into running agent session">
                            @if (sendingMessage) {
                              <mat-spinner diameter="16"></mat-spinner>
                            } @else {
                              <mat-icon>send</mat-icon>
                            }
                          </button>
                        </div>
                        @if (injectResult) {
                          <div class="inject-result" [class.success]="injectResult.delivered">
                            <mat-icon>{{ injectResult.delivered ? 'check_circle' : 'warning' }}</mat-icon>
                            {{ injectResult.detail }}
                          </div>
                        }
                      </div>
                    }

                    <!-- Live output + expandable logs -->
                    <div class="agent-output">
                      <div class="agent-bar" [class.done]="!agentRunning && !taskError && agentEntries.length" [class.errored]="!agentRunning && taskError"
                           (click)="logsExpanded = !logsExpanded">
                        @if (agentRunning) {
                          <mat-icon class="pulse">terminal</mat-icon> Working...
                        } @else if (taskError) {
                          <mat-icon>error</mat-icon> Failed
                        } @else if (agentEntries.length) {
                          <mat-icon>check_circle</mat-icon> Finished
                        } @else {
                          <mat-icon>history</mat-icon> Logs
                        }
                        <span class="log-count">({{ agentEntries.length + historicalLogs.length }})</span>
                        <span class="spacer"></span>
                        <button class="expand-btn" (click)="$event.stopPropagation(); logsExpanded = !logsExpanded">
                          <mat-icon>{{ logsExpanded ? 'expand_less' : 'expand_more' }}</mat-icon>
                        </button>
                        @if (!agentRunning && !logsExpanded && historicalLogs.length === 0) {
                          <button class="expand-btn" (click)="$event.stopPropagation(); loadHistoricalLogs()" matTooltip="Load logs from DB">
                            <mat-icon>refresh</mat-icon>
                          </button>
                        }
                      </div>
                      @if (logsExpanded) {
                        <div class="agent-log expanded">
                          @if (historicalLogs.length) {
                            <div class="log-section-label">Previous logs</div>
                            @for (entry of historicalLogs; track $index) {
                              <div class="log-entry" [class]="entry.category">
                                <span class="log-time">{{ entry.time }}</span>
                                <span class="log-cat">{{ entry.icon }}</span>
                                <span>{{ entry.content }}</span>
                              </div>
                            }
                            @if (agentEntries.length) {
                              <div class="log-section-label">Current session</div>
                            }
                          }
                          @for (entry of agentEntries; track $index) {
                            <div class="log-entry" [class]="entry.type">
                              @if (entry.tool) { <span class="tool-badge">{{ entry.tool }}</span> }
                              <span>{{ entry.content }}</span>
                            </div>
                          }
                          @if (!agentEntries.length && !historicalLogs.length) {
                            <div class="log-empty">No logs yet</div>
                          }
                        </div>
                      } @else if (agentEntries.length) {
                        <div class="agent-log">
                          @for (entry of agentEntries.slice(-10); track $index) {
                            <div class="log-entry" [class]="entry.type">
                              @if (entry.tool) { <span class="tool-badge">{{ entry.tool }}</span> }
                              <span>{{ entry.content }}</span>
                            </div>
                          }
                          @if (agentEntries.length > 10) {
                            <div class="log-more" (click)="logsExpanded = true">↑ {{ agentEntries.length - 10 }} more entries — click to expand</div>
                          }
                        </div>
                      }
                    </div>

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

        <!-- Skills Configuration tab -->
        @if (activeTab === 'skills') {
          <div class="skills-config">
            <h3 class="skills-title"><mat-icon>auto_fix_high</mat-icon> Skills Configuration</h3>
            <p class="skills-subtitle">Assign Claude Code skills to employee roles. All employees of a role share the same skill set.</p>

            @if (skillsLoading) {
              <div class="loading"><mat-spinner diameter="28"></mat-spinner></div>
            } @else {
              <!-- Role selector -->
              <div class="skills-role-bar">
                @for (role of roles; track role.role) {
                  <button class="skills-role-btn" [class.active]="skillsSelectedRole === role.role"
                          (click)="selectSkillsRole(role.role)">
                    <span class="skills-role-avatar">{{ role.avatar }}</span>
                    <span class="skills-role-name">{{ role.title }}</span>
                    <span class="skills-role-count">{{ getRoleSkillCount(role.role) }}</span>
                  </button>
                }
              </div>

              @if (skillsSelectedRole) {
                <div class="skills-panels">
                  <!-- Assigned skills -->
                  <div class="skills-panel">
                    <div class="skills-panel-header">
                      <h4>Assigned Skills ({{ assignedSkills.length }})</h4>
                      @if (skillsDirty) {
                        <button class="skills-save-btn" (click)="saveRoleSkills()">
                          <mat-icon>check</mat-icon> Save
                        </button>
                      }
                    </div>
                    <div class="skills-list">
                      @for (skill of assignedSkills; track skill.name) {
                        <div class="skill-chip assigned">
                          <span class="skill-chip-name">/{{ skill.name }}</span>
                          <button class="skill-chip-remove" (click)="unassignSkill(skill.name)" matTooltip="Remove">
                            <mat-icon>close</mat-icon>
                          </button>
                        </div>
                      }
                      @if (!assignedSkills.length) {
                        <div class="skills-empty">No skills assigned to this role yet</div>
                      }
                    </div>
                  </div>

                  <!-- Available skills -->
                  <div class="skills-panel">
                    <div class="skills-panel-header">
                      <h4>Available Skills ({{ availableSkills.length }})</h4>
                      <input class="skills-search" [(ngModel)]="skillsSearch" placeholder="Search skills..." />
                    </div>
                    <div class="skills-list">
                      @for (skill of filteredAvailableSkills; track skill.name) {
                        <div class="skill-chip available" (click)="assignSkill(skill)">
                          <span class="skill-chip-name">/{{ skill.name }}</span>
                          <span class="skill-chip-desc">{{ skill.description }}</span>
                          <mat-icon class="skill-chip-add">add_circle</mat-icon>
                        </div>
                      }
                      @if (!filteredAvailableSkills.length) {
                        <div class="skills-empty">{{ skillsSearch ? 'No matching skills' : 'All skills assigned' }}</div>
                      }
                    </div>
                  </div>
                </div>
              } @else {
                <div class="skills-empty-state">
                  <mat-icon>touch_app</mat-icon>
                  <p>Select a role above to configure its skills</p>
                </div>
              }
            }
          </div>
        }

        @if (!selectedProjectId && (activeTab === 'team' || activeTab === 'hire' || activeTab === 'comms')) {
          <div class="empty-state">
            <mat-icon>business</mat-icon>
            <h2>Select a company</h2>
            <p>Choose a company above to manage its AI employees.</p>
          </div>
        }
      }

      <!-- Employee Modal -->
      @if (modalEmployee) {
        <div class="emp-modal-overlay" (click)="closeModal()">
          <div class="emp-modal" (click)="$event.stopPropagation()">
            <div class="emp-modal-header">
              <span class="emp-modal-avatar">{{ modalEmployee.avatar }}</span>
              <div class="emp-modal-info">
                <h2>{{ modalEmployee.name }}</h2>
                <span class="emp-modal-title">{{ modalEmployee.title }}</span>
                <span class="emp-modal-status" [class]="modalEmployee.status">{{ modalEmployee.status }}</span>
              </div>
              <div class="emp-modal-controls">
                @if (modalEmployee.status === 'working') {
                  <button class="ctrl-btn stop" (click)="stopEmployee()" matTooltip="Stop"><mat-icon>stop</mat-icon></button>
                  <button class="ctrl-btn restart" (click)="restartEmployee()" matTooltip="Restart"><mat-icon>restart_alt</mat-icon></button>
                } @else {
                  <button class="ctrl-btn start" (click)="restartEmployee()" matTooltip="Resume" [disabled]="!modalEmployee.taskHistory?.length"><mat-icon>play_arrow</mat-icon></button>
                }
                <button class="ctrl-btn" (click)="closeModal()" matTooltip="Close"><mat-icon>close</mat-icon></button>
              </div>
            </div>

            <!-- Modal tabs -->
            <div class="emp-modal-tabs">
              <button [class.active]="modalTab === 'tasks'" (click)="modalTab = 'tasks'"><mat-icon>assignment</mat-icon> Tasks</button>
              <button [class.active]="modalTab === 'logs'" (click)="modalTab = 'logs'; loadModalLogs()"><mat-icon>receipt_long</mat-icon> Logs</button>
              <button [class.active]="modalTab === 'memory'" (click)="modalTab = 'memory'; loadModalMemories()"><mat-icon>psychology</mat-icon> Memory</button>
              <button [class.active]="modalTab === 'chat'" (click)="modalTab = 'chat'"><mat-icon>chat</mat-icon> Chat</button>
              <button [class.active]="modalTab === 'skills'" (click)="modalTab = 'skills'"><mat-icon>auto_fix_high</mat-icon> Skills</button>
            </div>

            <div class="emp-modal-body">
              <!-- Working Status -->
              <div class="emp-working-status" [class.empty]="!modalEmployee.workingStatus">
                <div class="ws-header">
                  <mat-icon class="ws-icon">info_outline</mat-icon>
                  <span class="ws-label">Working Status</span>
                  @if (modalEmployee.workingStatusAt) {
                    <span class="ws-time">{{ modalEmployee.workingStatusAt | date:'MM/dd HH:mm' }}</span>
                  }
                </div>
                @if (modalEmployee.workingStatus) {
                  @if (modalEmployee.workingStatus.length > 2000 && !wsExpanded) {
                    <div class="ws-text" [innerHTML]="parseMarkdown(modalEmployee.workingStatus.substring(0, 2000) + '\n\n...')"></div>
                    <button class="ws-expand" (click)="wsExpanded = true">Show more ({{ modalEmployee.workingStatus.length }} chars)</button>
                  } @else {
                    <div class="ws-text" [innerHTML]="parseMarkdown(modalEmployee.workingStatus)"></div>
                    @if (modalEmployee.workingStatus.length > 2000) {
                      <button class="ws-expand" (click)="wsExpanded = false">Show less</button>
                    }
                  }
                } @else {
                  <div class="ws-text empty-text">No status updates yet</div>
                }
              </div>
              <!-- Tasks tab -->
              @if (modalTab === 'tasks') {
                <div class="modal-section">
                  <div class="modal-task-input">
                    <textarea [(ngModel)]="modalTaskInput" placeholder="Assign a task..." rows="2" class="modal-textarea"></textarea>
                    <button class="modal-task-btn" (click)="assignModalTask()" [disabled]="!modalTaskInput.trim()">
                      <mat-icon>send</mat-icon>
                    </button>
                  </div>
                  <div class="modal-task-list">
                    @for (task of modalEmployee.taskHistory.slice().reverse(); track task.taskId) {
                      <div class="modal-task-item" [class]="task.status" [class.unread]="!task.resultRead && task.result">
                        <div class="modal-task-top">
                          <span class="modal-task-icon">{{ taskStatusIcon(task.status) }}</span>
                          @if (!task.resultRead && task.result) {
                            <span class="unread-dot" matTooltip="Unread by Alfred">🔴</span>
                          }
                          <span class="modal-task-desc">{{ task.description }}</span>
                          <span class="modal-task-time">{{ task.startedAt | date:'MM/dd HH:mm' }}</span>
                        </div>
                        <div class="modal-task-output">
                          @if (task.result) {
                            <pre class="modal-task-pre">{{ task.result }}</pre>
                          } @else {
                            <span class="modal-task-no-output">No output yet</span>
                          }
                        </div>
                      </div>
                    }
                    @if (!modalEmployee.taskHistory?.length) {
                      <div class="modal-empty">No tasks assigned yet</div>
                    }
                  </div>
                </div>
              }

              <!-- Logs tab -->
              @if (modalTab === 'logs') {
                <div class="modal-section">
                  <div class="modal-log-filters">
                    <button class="filter-chip" [class.active]="modalLogFilter === ''" (click)="modalLogFilter = ''; loadModalLogs()">All</button>
                    <button class="filter-chip" [class.active]="modalLogFilter === 'task_start'" (click)="modalLogFilter = 'task_start'; loadModalLogs()">Start</button>
                    <button class="filter-chip" [class.active]="modalLogFilter === 'task_complete'" (click)="modalLogFilter = 'task_complete'; loadModalLogs()">Done</button>
                    <button class="filter-chip" [class.active]="modalLogFilter === 'task_fail'" (click)="modalLogFilter = 'task_fail'; loadModalLogs()">Failed</button>
                    <button class="filter-chip" [class.active]="modalLogFilter === 'tool_use'" (click)="modalLogFilter = 'tool_use'; loadModalLogs()">Tools</button>
                    <button class="filter-chip" [class.active]="modalLogFilter === 'text'" (click)="modalLogFilter = 'text'; loadModalLogs()">Text</button>
                    <button class="filter-chip" [class.active]="modalLogFilter === 'error'" (click)="modalLogFilter = 'error'; loadModalLogs()">Errors</button>
                  </div>
                  <div class="modal-log-list">
                    @if (modalLogsLoading) {
                      <div class="modal-loading"><mat-spinner diameter="20"></mat-spinner></div>
                    } @else {
                      @for (log of modalLogs; track log._id) {
                        <div class="modal-log-row" [class]="log.category">
                          <span class="log-time">{{ log.createdAt | date:'MM/dd HH:mm:ss' }}</span>
                          <span class="log-cat">{{ logIcon(log.category) }} {{ log.category }}</span>
                          <span class="log-content">{{ log.content }}</span>
                        </div>
                      }
                      @if (!modalLogs.length) { <div class="modal-empty">No logs</div> }
                    }
                  </div>
                  @if (modalLogPages > 1) {
                    <div class="modal-pagination">
                      <button [disabled]="modalLogPage <= 1" (click)="modalLogPage = modalLogPage - 1; loadModalLogs()">Prev</button>
                      <span>{{ modalLogPage }}/{{ modalLogPages }}</span>
                      <button [disabled]="modalLogPage >= modalLogPages" (click)="modalLogPage = modalLogPage + 1; loadModalLogs()">Next</button>
                    </div>
                  }
                </div>
              }

              <!-- Memory tab -->
              @if (modalTab === 'memory') {
                <div class="modal-section">
                  <div class="modal-mem-actions">
                    <button class="mem-btn" (click)="compactModalLogs()" [disabled]="modalCompacting"><mat-icon>compress</mat-icon> {{ modalCompacting ? 'Compacting...' : 'Compact Logs' }}</button>
                    <button class="mem-btn danger" (click)="wipeModalMemories()"><mat-icon>delete_sweep</mat-icon> Wipe</button>
                  </div>
                  <div class="modal-mem-list">
                    @if (modalMemLoading) {
                      <div class="modal-loading"><mat-spinner diameter="20"></mat-spinner></div>
                    } @else {
                      @for (mem of modalMemories; track mem._id) {
                        <div class="mem-card" [class]="mem.category">
                          <div class="mem-top">
                            <span class="mem-cat-badge">{{ memoryCategoryIcon(mem.category) }} {{ mem.category }}</span>
                            <span class="mem-importance">{{ mem.importance }}/10</span>
                            <button class="mem-delete" (click)="deleteModalMemory(mem._id)"><mat-icon>close</mat-icon></button>
                          </div>
                          <p class="mem-content">{{ mem.content }}</p>
                          @if (mem.tags?.length) {
                            <div class="mem-tags">@for (tag of mem.tags; track tag) { <span class="mem-tag">{{ tag }}</span> }</div>
                          }
                        </div>
                      }
                      @if (!modalMemories.length) { <div class="modal-empty">No memories yet</div> }
                    }
                  </div>
                </div>
              }

              <!-- Chat tab -->
              @if (modalTab === 'chat') {
                <div class="modal-section modal-chat">
                  <div class="modal-chat-body">
                    @for (msg of modalChatMessages; track $index) {
                      <div class="emp-msg" [class.user]="msg.role === 'user'" [class.agent]="msg.role === 'agent'">
                        <span class="emp-msg-sender">{{ msg.role === 'user' ? 'You' : modalEmployee.name }}</span>
                        <span class="emp-msg-text">{{ msg.text }}</span>
                      </div>
                    }
                    @if (!modalChatMessages.length) {
                      <div class="modal-empty">Send a message to {{ modalEmployee.name }}</div>
                    }
                  </div>
                  <div class="emp-chat-input">
                    <input [(ngModel)]="modalChatInput" placeholder="Message {{ modalEmployee.name }}..."
                           (keydown.enter)="sendModalChat()" />
                    <button (click)="sendModalChat()" [disabled]="!modalChatInput.trim() || modalChatSending"><mat-icon>send</mat-icon></button>
                  </div>
                </div>
              }

              <!-- Skills tab -->
              @if (modalTab === 'skills') {
                <div class="modal-section">
                  <div class="modal-skills-list">
                    @for (skill of modalEmployee.skills; track skill.name) {
                      <div class="modal-skill-item">
                        <span class="modal-skill-name">{{ skill.name }}</span>
                        <span class="modal-skill-desc">{{ skill.description }}</span>
                      </div>
                    }
                    @if (!modalEmployee.skills?.length) { <div class="modal-empty">No skills assigned</div> }
                  </div>
                  <p class="modal-hint">Manage skills in the Skills tab</p>
                </div>
              }
            </div>
          </div>
        </div>
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
      display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 12px;
    }
    .project-column {
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
    /* Cycle bar */
    .cycle-bar {
      display: flex; align-items: center; gap: 6px; padding: 6px 10px;
      border-bottom: 1px solid var(--color-border-light); background: rgba(0,0,0,0.1);
    }
    .cycle-arrow {
      border: none; background: none; color: var(--color-text-subtle); cursor: pointer;
      padding: 0; display: flex; align-items: center; flex-shrink: 0;
    }
    .cycle-arrow:hover { color: var(--color-primary); }
    .cycle-arrow mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .cycle-phases { display: flex; gap: 3px; flex: 1; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .cycle-phases::-webkit-scrollbar { display: none; }
    .cycle-phase {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 8px; border-radius: var(--radius-sm); cursor: pointer;
      transition: all 0.15s; flex-shrink: 0; justify-content: center;
      border: 1px solid transparent; white-space: nowrap;
    }
    .cycle-phase:hover { background: rgba(212,175,55,0.08); }
    .cycle-phase.active {
      background: rgba(212,175,55,0.15); border: 1px solid var(--color-primary);
    }
    .cycle-phase.done { opacity: 0.5; }
    .cycle-icon { font-size: 0.72rem; line-height: 1; }
    .cycle-label { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cycle-phase.active .cycle-label { color: var(--color-primary); }
    .cycle-progress { flex-shrink: 0; }
    .cycle-count { font-size: 0.65rem; font-weight: 700; color: var(--color-text-subtle); white-space: nowrap; }
    .cycle-advice-btn {
      border: none; background: none; color: var(--color-text-subtle); cursor: pointer;
      padding: 2px; display: flex; flex-shrink: 0;
    }
    .cycle-advice-btn:hover { color: #f59e0b; }
    .cycle-advice-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .cycle-advice-panel {
      border-bottom: 1px solid var(--color-border-light); background: rgba(245,158,11,0.04);
    }
    .cycle-advice-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 10px; font-size: 0.72rem; font-weight: 700; color: #f59e0b;
    }
    .cycle-advice-actions { display: flex; gap: 2px; }
    .cycle-advice-header button { border: none; background: none; color: var(--color-text-subtle); cursor: pointer; display: flex; padding: 2px; }
    .cycle-advice-header button:hover { color: var(--color-primary); }
    .cycle-advice-header button mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .cycle-advice-body {
      padding: 0 10px 8px; font-size: 0.75rem; color: var(--color-text); line-height: 1.4;
      white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto;
    }
    .direction-edit { padding: 0 10px 8px; }
    .direction-textarea {
      width: 100%; padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: 0.78rem;
      line-height: 1.4; resize: vertical; outline: none;
    }
    .direction-textarea:focus { border-color: var(--color-primary); }
    .direction-edit-actions { display: flex; gap: 6px; margin-top: 6px; }
    .dir-save, .dir-cancel {
      display: flex; align-items: center; gap: 4px; padding: 4px 10px;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); font-family: inherit;
      font-size: 0.72rem; font-weight: 600; cursor: pointer;
    }
    .dir-save { border-color: #22c55e40; color: #22c55e; }
    .dir-save:hover { background: #22c55e10; }
    .dir-cancel:hover { border-color: var(--color-text-subtle); }
    .dir-save mat-icon, .dir-cancel mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .project-col-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 400px; overflow-y: auto; }
    .project-col-empty { text-align: center; padding: 1.5rem 0.5rem; font-size: 0.78rem; color: var(--color-text-subtle); font-style: italic; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .hire-quick-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px dashed var(--color-primary); border-radius: var(--radius-sm); background: none; color: var(--color-primary); font-family: inherit; font-size: .72rem; font-weight: 600; cursor: pointer; }
    .hire-quick-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .hire-quick-btn:hover { background: rgba(212,175,55,.08); }

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
    .mini-task {
      display: block; font-size: 0.62rem; margin-top: 2px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;
    }
    .mini-task.in_progress { color: #f59e0b; }
    .mini-task.completed { color: #22c55e; }
    .mini-task.failed { color: #ef4444; }
    .mini-task.pending { color: var(--color-text-subtle); }
    .mini-expand {
      position: absolute; top: 4px; right: 4px; border: none; background: none;
      color: var(--color-text-subtle); cursor: pointer; padding: 2px; display: none; opacity: 0.5;
    }
    .mini-card { position: relative; }
    .mini-card:hover .mini-expand { display: flex; }
    .mini-expand:hover { opacity: 1; color: var(--color-primary); }
    .mini-expand mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Employee Modal */
    .emp-modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .emp-modal {
      background: var(--color-bg-card); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg, 12px); width: 100%; max-width: 900px;
      max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .emp-modal-header {
      display: flex; align-items: center; gap: 14px; padding: 18px 24px;
      border-bottom: 1px solid var(--color-border-light);
    }
    .emp-modal-avatar { font-size: 2.5rem; }
    .emp-modal-info { flex: 1; }
    .emp-modal-info h2 { margin: 0; font-size: 1.1rem; color: var(--color-text); }
    .emp-modal-title { font-size: .8rem; color: var(--color-text-subtle); }
    .emp-modal-status { font-size: .7rem; font-weight: 700; margin-left: 8px; }
    .emp-modal-status.idle { color: var(--color-text-subtle); }
    .emp-modal-status.working { color: #22c55e; }
    .emp-modal-controls { display: flex; gap: 6px; }

    .emp-working-status {
      margin: 0 0 16px; padding: 10px 14px;
      background: rgba(var(--color-primary-rgb, 99,102,241), 0.08);
      border: 1px solid rgba(var(--color-primary-rgb, 99,102,241), 0.2);
      border-radius: 8px;
    }
    .emp-working-status.empty { opacity: 0.5; }
    .emp-working-status.empty .ws-text { font-style: italic; }
    .ws-header {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 4px; font-size: .75rem; color: var(--color-text-subtle);
    }
    .ws-icon { font-size: 16px; width: 16px; height: 16px; color: var(--color-primary); }
    .ws-label { font-weight: 600; }
    .ws-time { margin-left: auto; font-size: .7rem; opacity: 0.7; }
    .ws-text {
      font-size: .82rem; line-height: 1.4; color: var(--color-text);
      word-break: break-word;
    }
    .ws-text ::ng-deep h1, .ws-text ::ng-deep h2, .ws-text ::ng-deep h3 { margin: 0.5em 0 0.3em; font-size: 0.9em; }
    .ws-text ::ng-deep ul, .ws-text ::ng-deep ol { margin: 0.3em 0; padding-left: 1.5em; }
    .ws-text ::ng-deep code { background: rgba(0,0,0,0.15); padding: 1px 4px; border-radius: 3px; font-size: 0.85em; }
    .ws-text ::ng-deep pre { background: rgba(0,0,0,0.15); padding: 8px; border-radius: 4px; overflow-x: auto; margin: 0.3em 0; }
    .ws-text ::ng-deep table { border-collapse: collapse; width: 100%; font-size: .78rem; margin: 0.3em 0; }
    .ws-text ::ng-deep th, .ws-text ::ng-deep td { border: 1px solid var(--color-border-light); padding: 4px 8px; text-align: left; }
    .ws-text ::ng-deep p { margin: 0.3em 0; }
    .empty-text { font-style: italic; opacity: 0.5; }
    .ws-expand {
      border: none; background: none; color: var(--color-primary);
      font-family: inherit; font-size: .72rem; font-weight: 600;
      cursor: pointer; padding: 4px 0; display: block;
    }
    .ws-expand:hover { text-decoration: underline; }

    .emp-modal-tabs {
      display: flex; border-bottom: 1px solid var(--color-border-light);
      padding: 0 16px; background: rgba(0,0,0,0.08);
    }
    .emp-modal-tabs button {
      display: flex; align-items: center; gap: 6px; padding: 10px 16px;
      border: none; background: none; color: var(--color-text-subtle);
      font-family: inherit; font-size: .8rem; font-weight: 600; cursor: pointer;
      border-bottom: 2px solid transparent; transition: all 0.15s;
    }
    .emp-modal-tabs button:hover { color: var(--color-text); }
    .emp-modal-tabs button.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .emp-modal-tabs button mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .emp-modal-body { flex: 1; overflow-y: auto; padding: 16px 24px; }
    .modal-section { min-height: 200px; }
    .modal-empty { text-align: center; padding: 2rem; color: var(--color-text-subtle); font-size: .82rem; }
    .modal-loading { display: flex; justify-content: center; padding: 2rem; }
    .modal-hint { font-size: .72rem; color: var(--color-text-subtle); margin-top: 12px; text-align: center; }

    /* Modal task input */
    .modal-task-input { display: flex; gap: 8px; margin-bottom: 16px; }
    .modal-textarea {
      flex: 1; padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: .82rem;
      resize: none; outline: none;
    }
    .modal-textarea:focus { border-color: var(--color-primary); }
    .modal-task-btn {
      padding: 10px 16px; border: none; border-radius: var(--radius-sm);
      background: var(--color-primary); color: #0A0A0A; cursor: pointer; display: flex; align-items: flex-start;
    }
    .modal-task-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Modal task list */
    .modal-task-list { display: flex; flex-direction: column; gap: 8px; }
    .modal-task-item {
      padding: 10px 14px; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); background: rgba(255,255,255,0.02);
    }
    .modal-task-item.completed { border-left: 3px solid #22c55e; }
    .modal-task-item.failed { border-left: 3px solid #ef4444; }
    .modal-task-item.in_progress { border-left: 3px solid #f59e0b; }
    .modal-task-item.unread { background: rgba(239,68,68,0.04); }
    .unread-dot { font-size: .6rem; flex-shrink: 0; }
    .modal-task-top { display: flex; align-items: flex-start; gap: 8px; }
    .modal-task-icon { flex-shrink: 0; }
    .modal-task-desc { flex: 1; font-size: .82rem; color: var(--color-text); line-height: 1.4; }
    .modal-task-time { font-size: .68rem; color: var(--color-text-subtle); flex-shrink: 0; white-space: nowrap; }
    .modal-task-output { margin-top: 8px; }
    .modal-task-pre {
      font-size: .75rem; color: var(--color-text); background: rgba(0,0,0,0.15);
      padding: 10px; border-radius: var(--radius-sm); overflow-x: auto;
      white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto;
      margin: 0; font-family: 'Fira Code', 'Consolas', monospace;
    }
    .modal-task-no-output { font-size: .72rem; color: var(--color-text-subtle); font-style: italic; }

    /* Modal logs */
    .modal-log-filters { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
    .modal-log-list { max-height: 400px; overflow-y: auto; }
    .modal-log-row { display: flex; gap: 8px; padding: 4px 8px; font-size: .75rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .modal-log-row.error { background: rgba(239,68,68,0.06); }
    .modal-log-row.task_complete { background: rgba(34,197,94,0.06); }
    .modal-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 10px; }
    .modal-pagination button {
      padding: 4px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); font-family: inherit; font-size: .75rem; cursor: pointer;
    }
    .modal-pagination button:disabled { opacity: 0.3; }

    /* Modal memory */
    .modal-mem-actions { display: flex; gap: 8px; margin-bottom: 12px; }
    .modal-mem-list { max-height: 400px; overflow-y: auto; }

    /* Modal chat */
    .modal-chat { display: flex; flex-direction: column; min-height: 300px; }
    .modal-chat-body { flex: 1; overflow-y: auto; max-height: 350px; padding-bottom: 8px; }

    /* Modal skills */
    .modal-skills-list { display: flex; flex-direction: column; gap: 6px; }
    .modal-skill-item { padding: 8px 12px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); }
    .modal-skill-name { font-size: .82rem; font-weight: 700; color: var(--color-primary); }
    .modal-skill-desc { display: block; font-size: .75rem; color: var(--color-text-subtle); margin-top: 2px; }
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
    .logs-btn {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: none;
      color: var(--color-text-subtle); cursor: pointer; padding: 6px; display: flex;
    }
    .logs-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .fire-btn {
      border: 1px solid #ef444440; border-radius: var(--radius-sm); background: none;
      color: #ef4444; cursor: pointer; padding: 6px; display: flex;
    }
    .fire-btn:hover { background: #ef444410; }

    /* Control buttons */
    .control-btns { display: flex; gap: 4px; margin-left: auto; }
    .ctrl-btn {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: none;
      color: var(--color-text-subtle); cursor: pointer; padding: 6px; display: flex;
    }
    .ctrl-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .ctrl-btn.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,0.08); }
    .ctrl-btn.stop { color: #ef4444; border-color: #ef444440; }
    .ctrl-btn.stop:hover { background: #ef444410; }
    .ctrl-btn.restart { color: #f59e0b; border-color: #f59e0b40; }
    .ctrl-btn.restart:hover { background: #f59e0b10; }
    .ctrl-btn.start { color: #22c55e; border-color: #22c55e40; }
    .ctrl-btn.start:hover { background: #22c55e10; }
    .ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    /* Employee chat */
    .emp-chat-panel { border: 1px solid var(--color-border-light); border-radius: var(--radius-md); margin-bottom: 1rem; overflow: hidden; }
    .emp-chat-body { min-height: 120px; max-height: 300px; overflow-y: auto; padding: 12px; }
    .emp-chat-empty { text-align: center; padding: 1.5rem; color: var(--color-text-subtle); font-size: .82rem; }
    .emp-chat-empty mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.4; display: block; margin: 0 auto .5rem; }
    .emp-chat-empty .hint { font-size: .75rem; opacity: 0.7; }
    .emp-msg { padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 6px; max-width: 80%; }
    .emp-msg.user { background: rgba(212,175,55,0.12); margin-left: auto; text-align: right; }
    .emp-msg.agent { background: rgba(255,255,255,0.04); }
    .emp-msg-sender { display: block; font-size: .68rem; font-weight: 700; color: var(--color-text-subtle); margin-bottom: 2px; }
    .emp-msg-text { font-size: .82rem; color: var(--color-text); line-height: 1.4; }
    .emp-chat-input { display: flex; border-top: 1px solid var(--color-border-light); }
    .emp-chat-input input {
      flex: 1; padding: 10px 14px; border: none; background: var(--color-bg); color: var(--color-text);
      font-family: inherit; font-size: .82rem; outline: none;
    }
    .emp-chat-input button {
      padding: 8px 14px; border: none; background: var(--color-primary); color: #0A0A0A;
      cursor: pointer; display: flex; align-items: center;
    }
    .emp-chat-input button:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Memory panel */
    .memory-panel { border: 1px solid var(--color-border-light); border-radius: var(--radius-md); margin-bottom: 1rem; overflow: hidden; }
    .memory-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid var(--color-border-light);
    }
    .memory-header h3 { margin: 0; font-size: .85rem; display: flex; align-items: center; gap: 6px; color: var(--color-text); }
    .memory-actions { display: flex; gap: 6px; }
    .mem-btn {
      display: flex; align-items: center; gap: 4px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); font-family: inherit; font-size: .72rem; font-weight: 600;
      padding: 4px 8px; cursor: pointer;
    }
    .mem-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .mem-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .mem-btn.danger:hover { border-color: #ef4444; color: #ef4444; }
    .mem-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .memory-filters { display: flex; gap: 4px; padding: 8px 14px; flex-wrap: wrap; border-bottom: 1px solid var(--color-border-light); }
    .memory-list { max-height: 400px; overflow-y: auto; padding: 8px; }
    .mem-card {
      padding: 10px 12px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      margin-bottom: 6px; background: rgba(255,255,255,0.02);
    }
    .mem-card.learning { border-left: 3px solid #f59e0b; }
    .mem-card.goal { border-left: 3px solid #22c55e; }
    .mem-card.blocker { border-left: 3px solid #ef4444; }
    .mem-card.decision { border-left: 3px solid #8b5cf6; }
    .mem-card.preference { border-left: 3px solid var(--color-primary); }
    .mem-card.context { border-left: 3px solid #64748b; }
    .mem-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .mem-cat-badge { font-size: .68rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-subtle); }
    .mem-importance { font-size: .68rem; color: var(--color-text-subtle); margin-left: auto; }
    .mem-delete {
      border: none; background: none; color: var(--color-text-subtle); cursor: pointer; padding: 2px; display: flex; opacity: 0.3;
    }
    .mem-delete:hover { opacity: 1; color: #ef4444; }
    .mem-delete mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .mem-content { margin: 0; font-size: .82rem; color: var(--color-text); line-height: 1.4; }
    .mem-tags { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
    .mem-tag { font-size: .65rem; padding: 1px 6px; border-radius: 8px; background: rgba(212,175,55,0.12); color: var(--color-primary); }
    .mem-source { font-size: .65rem; color: var(--color-text-subtle); margin-top: 4px; display: block; }
    .mem-add { display: flex; gap: 6px; padding: 8px 10px; border-top: 1px solid var(--color-border-light); }
    .mem-add-cat {
      padding: 6px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: .75rem; min-width: 90px;
    }
    .mem-add-input {
      flex: 1; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: .82rem; outline: none;
    }
    .mem-add-input:focus { border-color: var(--color-primary); }
    .mem-add-btn {
      border: none; border-radius: var(--radius-sm); background: var(--color-primary); color: #0A0A0A;
      cursor: pointer; padding: 6px 10px; display: flex;
    }
    .mem-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Logs panel */
    .logs-panel { background: #0d1117; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); margin-bottom: 1rem; overflow: hidden; }
    .logs-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); }
    .logs-header h3 { margin: 0; font-size: .85rem; display: flex; align-items: center; gap: 6px; color: var(--color-text); flex-shrink: 0; }
    .logs-header h3 mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .logs-filters { display: flex; gap: 4px; flex: 1; flex-wrap: wrap; }
    .filter-chip { padding: 2px 8px; border: 1px solid var(--color-border-light); border-radius: 100px; background: none; color: var(--color-text-subtle); font-family: inherit; font-size: .68rem; cursor: pointer; }
    .filter-chip.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,.08); }
    .logs-close { border: none; background: none; color: var(--color-text-subtle); cursor: pointer; padding: 4px; display: flex; }
    .logs-close:hover { color: var(--color-text); }
    .logs-body { max-height: 400px; overflow-y: auto; font-family: 'Fira Code', monospace; font-size: .75rem; }
    .logs-loading, .logs-empty { padding: 1.5rem; text-align: center; color: var(--color-text-subtle); display: flex; align-items: center; justify-content: center; gap: 8px; }
    .log-row { display: flex; gap: 8px; padding: 4px 14px; border-bottom: 1px solid rgba(255,255,255,.03); color: #c9d1d9; align-items: flex-start; }
    .log-row:hover { background: rgba(255,255,255,.02); }
    .log-row.task_start { color: #22c55e; }
    .log-row.task_complete { color: #22c55e; }
    .log-row.task_fail { color: #f85149; }
    .log-row.error { color: #f85149; }
    .log-row.tool_use { color: #d4af37; }
    .log-time { flex-shrink: 0; color: #8b949e; min-width: 100px; }
    .log-cat { flex-shrink: 0; min-width: 100px; font-weight: 600; }
    .log-content { flex: 1; word-break: break-word; white-space: pre-wrap; }
    .log-tool { flex-shrink: 0; padding: 1px 6px; background: rgba(212,175,55,.1); border-radius: 4px; font-size: .65rem; color: var(--color-primary); }
    .logs-pagination { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 8px; border-top: 1px solid var(--color-border-light); }
    .logs-pagination button { padding: 3px 10px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: none; color: var(--color-text); font-family: inherit; font-size: .72rem; cursor: pointer; }
    .logs-pagination button:disabled { opacity: .3; cursor: not-allowed; }
    .logs-pagination span { font-size: .72rem; color: var(--color-text-subtle); }

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

    /* Message injection */
    .inject-section { margin-top: 10px; }
    .inject-row { display: flex; gap: 6px; align-items: center; }
    .inject-input {
      flex: 1; padding: 8px 12px; border: 1px solid #22c55e40; border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: 0.82rem;
      outline: none;
    }
    .inject-input:focus { border-color: #22c55e; }
    .inject-input::placeholder { color: var(--color-text-subtle); }
    .inject-btn {
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      border: none; border-radius: var(--radius-sm); background: #22c55e;
      color: #0A0A0A; cursor: pointer; flex-shrink: 0;
    }
    .inject-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .inject-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .inject-result {
      display: flex; align-items: center; gap: 6px; margin-top: 6px;
      font-size: 0.75rem; color: #f59e0b; padding: 4px 8px;
      border-radius: var(--radius-sm); background: #f59e0b10;
    }
    .inject-result.success { color: #22c55e; background: #22c55e10; }
    .inject-result mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Task controls */
    .task-header-row { display: flex; align-items: center; justify-content: space-between; }
    .task-header-row h3 { margin: 0; }
    .task-controls { display: flex; gap: 4px; }
    .ctrl-btn {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; cursor: pointer; transition: all 0.15s;
    }
    .ctrl-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .ctrl-btn.stop { color: #ef4444; }
    .ctrl-btn.stop:hover { background: #ef444412; border-color: #ef4444; }
    .ctrl-btn.restart { color: #f59e0b; }
    .ctrl-btn.restart:hover { background: #f59e0b12; border-color: #f59e0b; }

    /* Agent output */
    .agent-output {
      margin-top: 12px; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); overflow: hidden;
    }
    .agent-bar {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      background: rgba(34,197,94,0.06); border-bottom: 1px solid var(--color-border-light);
      font-size: 0.82rem; font-weight: 600; color: #22c55e; cursor: pointer;
      user-select: none;
    }
    .agent-bar mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .agent-bar.done { background: rgba(34,197,94,0.06); color: #22c55e; }
    .agent-bar.errored { background: rgba(239,68,68,0.06); color: #ef4444; }
    .log-count { font-weight: 400; font-size: 0.72rem; color: var(--color-text-subtle); }
    .agent-bar .spacer { flex: 1; }
    .expand-btn {
      width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      border: none; background: none; color: var(--color-text-subtle); cursor: pointer;
      border-radius: var(--radius-sm);
    }
    .expand-btn:hover { color: var(--color-text); background: rgba(255,255,255,0.05); }
    .expand-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .pulse { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .agent-log {
      max-height: 250px; overflow-y: auto; padding: 8px 12px;
      font-family: 'Fira Code', monospace; font-size: 0.72rem; line-height: 1.5;
      background: var(--color-bg); color: var(--color-text-subtle);
    }
    .agent-log.expanded { max-height: 600px; }
    .log-entry { white-space: pre-wrap; word-break: break-all; }
    .log-time { color: var(--color-text-subtle); margin-right: 6px; font-size: 0.65rem; opacity: 0.7; }
    .log-cat { margin-right: 4px; }
    .log-section-label {
      font-size: 0.68rem; font-weight: 700; color: var(--color-primary);
      padding: 6px 0 2px; border-bottom: 1px solid var(--color-border-light); margin-bottom: 4px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .log-more {
      text-align: center; font-size: 0.72rem; color: var(--color-primary); cursor: pointer;
      padding: 6px; border-top: 1px solid var(--color-border-light);
    }
    .log-more:hover { background: rgba(212,175,55,0.06); }
    .log-empty { text-align: center; padding: 1rem; color: var(--color-text-subtle); font-size: 0.8rem; }
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

    /* Skills Configuration */
    .skills-config { padding: 0.5rem 0; }
    .skills-title { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
    .skills-title mat-icon { font-size: 22px; width: 22px; height: 22px; color: var(--color-primary); }
    .skills-subtitle { margin: 0 0 1rem; font-size: .82rem; color: var(--color-text-subtle); }

    .skills-role-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 1rem; }
    .skills-role-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-bg-card); color: var(--color-text-subtle);
      font-family: inherit; font-size: .78rem; font-weight: 600; cursor: pointer; transition: all .15s;
    }
    .skills-role-btn:hover { border-color: var(--color-primary); color: var(--color-text); }
    .skills-role-btn.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,.06); }
    .skills-role-avatar { font-size: 1.1rem; }
    .skills-role-name { white-space: nowrap; }
    .skills-role-count {
      font-size: .62rem; font-weight: 700; padding: 1px 6px; border-radius: 100px;
      background: var(--color-border-light); color: var(--color-text-subtle); min-width: 16px; text-align: center;
    }
    .skills-role-btn.active .skills-role-count { background: rgba(212,175,55,.15); color: var(--color-primary); }

    .skills-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .skills-panel {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      background: var(--color-bg-card); overflow: hidden;
    }
    .skills-panel-header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); background: rgba(0,0,0,.06);
    }
    .skills-panel-header h4 { margin: 0; font-size: .85rem; font-weight: 700; color: var(--color-text); }
    .skills-search {
      padding: 4px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: .75rem; outline: none; max-width: 160px;
    }
    .skills-search:focus { border-color: var(--color-primary); }
    .skills-search::placeholder { color: var(--color-text-subtle); }
    .skills-save-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 12px; border: none; border-radius: var(--radius-sm);
      background: var(--color-primary); color: #0A0A0A; font-family: inherit; font-size: .72rem; font-weight: 700; cursor: pointer;
    }
    .skills-save-btn:hover { opacity: .9; }
    .skills-save-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .skills-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; max-height: 400px; overflow-y: auto; }
    .skill-chip {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-radius: var(--radius-sm); transition: background .15s;
    }
    .skill-chip.assigned { background: rgba(212,175,55,.06); }
    .skill-chip.available { cursor: pointer; }
    .skill-chip.available:hover { background: rgba(212,175,55,.08); }
    .skill-chip-name { font-family: 'Fira Code', monospace; font-size: .78rem; font-weight: 600; color: var(--color-primary); white-space: nowrap; }
    .skill-chip-desc { flex: 1; font-size: .72rem; color: var(--color-text-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .skill-chip-remove {
      width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); cursor: pointer; flex-shrink: 0;
    }
    .skill-chip-remove:hover { border-color: #f85149; color: #f85149; }
    .skill-chip-remove mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .skill-chip-add { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); opacity: 0; transition: opacity .15s; flex-shrink: 0; }
    .skill-chip.available:hover .skill-chip-add { opacity: 1; }
    .skills-empty { padding: 1.5rem; text-align: center; font-size: .82rem; color: var(--color-text-subtle); font-style: italic; }
    .skills-empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem; color: var(--color-text-subtle); }
    .skills-empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: .3; margin-bottom: .5rem; }

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
  activeTab: 'overview' | 'team' | 'hire' | 'comms' | 'skills' | 'manager' = 'overview';

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

  // Message injection
  injectMessage = '';
  sendingMessage = false;
  injectResult: { delivered: boolean; detail: string } | null = null;

  // Logs
  logsExpanded = false;
  historicalLogs: { category: string; icon: string; time: string; content: string }[] = [];
  private lastTaskInput = '';

  // Logs
  showLogsFor = '';
  logsFilter = '';
  logsLoading = false;
  employeeLogs: any[] = [];
  logsPagination = { page: 1, pages: 1, total: 0 };

  // Comms
  comms: CommFile[] = [];
  commsLoading = false;

  // Skills config
  skillsLoading = false;
  skillsSelectedRole = '';
  skillsSearch = '';
  skillsDirty = false;
  localSkills: { name: string; description: string }[] = [];
  assignedSkills: { name: string; description: string; prompt?: string }[] = [];
  roleSkillsCache: Record<string, { name: string; description: string; prompt?: string }[]> = {};

  get availableSkills(): { name: string; description: string }[] {
    return this.localSkills.filter(s => !this.assignedSkills.some(a => a.name === s.name));
  }

  get filteredAvailableSkills(): { name: string; description: string }[] {
    const q = this.skillsSearch.toLowerCase();
    return this.availableSkills.filter(s => !q || s.name.includes(q) || s.description.toLowerCase().includes(q));
  }

  // Cycle
  cyclePhases: ('idle' | 'pending_directions' | 'active' | 'dev' | 'qa' | 'done')[] = ['idle', 'pending_directions', 'active', 'dev', 'qa', 'done'];
  expandedCycleAdvice = '';
  editingDirection = false;
  directionEditText = '';

  // Modal
  modalEmployee: Employee | null = null;
  modalTab: 'tasks' | 'logs' | 'memory' | 'chat' | 'skills' = 'tasks';
  modalTaskInput = '';
  modalLogs: any[] = [];
  modalLogsLoading = false;
  modalLogFilter = '';
  modalLogPage = 1;
  modalLogPages = 1;
  modalMemories: any[] = [];
  modalMemLoading = false;
  modalCompacting = false;
  modalChatMessages: { role: 'user' | 'agent'; text: string }[] = [];
  modalChatInput = '';
  modalChatSending = false;
  wsExpanded = false;

  // Detail tabs
  detailTab: 'task' | 'chat' | 'memory' = 'task';

  // Chat
  chatMessages: { role: 'user' | 'agent'; text: string }[] = [];
  chatInput = '';
  chatSending = false;

  // Memory
  employeeMemories: any[] = [];
  memoriesLoading = false;
  memoryFilter = '';
  compacting = false;
  newMemCategory = 'learning';
  newMemContent = '';

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

  private wsSubs: Subscription[] = [];

  constructor(
    private employeeService: EmployeeService,
    private projectService: ProjectService,
    private wsService: WebSocketService,
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

    // Real-time WebSocket updates
    this.wsService.connect();

    this.wsSubs.push(
      this.wsService.onEmployeeStatus().subscribe((ev) => {
        // Update employee status in all lists
        const emp = this.findEmployee(ev.employeeId);
        if (emp) emp.status = ev.status as any;
        if (this.modalEmployee?._id === ev.employeeId) this.modalEmployee.status = ev.status as any;
      }),
      this.wsService.onTaskUpdate().subscribe((ev) => {
        const emp = this.findEmployee(ev.employeeId);
        if (emp) {
          const task = emp.taskHistory.find(t => t.taskId === ev.taskId);
          if (task) {
            task.status = ev.status as any;
            if (ev.result) task.result = ev.result;
          }
        }
        if (this.modalEmployee?._id === ev.employeeId) {
          const task = this.modalEmployee.taskHistory.find(t => t.taskId === ev.taskId);
          if (task) {
            task.status = ev.status as any;
            if (ev.result) task.result = ev.result;
          }
        }
      }),
      this.wsService.onTaskNew().subscribe((ev) => {
        const emp = this.findEmployee(ev.employeeId);
        if (emp && !emp.taskHistory.find(t => t.taskId === ev.taskId)) {
          emp.taskHistory.push({ taskId: ev.taskId, description: ev.description, status: 'in_progress', resultRead: false, startedAt: new Date().toISOString() });
        }
      }),
      this.wsService.onEmployeeLog().subscribe((ev) => {
        // Append to modal logs if viewing this employee
        if (this.modalEmployee?._id === ev.employeeId && this.modalTab === 'logs') {
          this.modalLogs.unshift({ _id: Date.now().toString(), ...ev, createdAt: ev.timestamp });
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.agentSub?.unsubscribe();
    this.wsSubs.forEach(s => s.unsubscribe());
    this.wsService.disconnect();
  }

  private findEmployee(id: string): Employee | null {
    for (const pg of this.projectGroups) {
      const emp = pg.employees.find(e => e._id === id);
      if (emp) return emp;
    }
    return this.allEmployees.find(e => e._id === id) || null;
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
    this.detailTab = 'task';
    this.chatMessages = [];
    this.employeeMemories = [];
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

  openLogs(emp: Employee): void {
    if (this.showLogsFor === emp._id) {
      this.showLogsFor = '';
      return;
    }
    this.showLogsFor = emp._id!;
    this.logsFilter = '';
    this.loadLogs(emp);
  }

  loadLogs(emp: Employee): void {
    this.loadLogsPage(emp, 1);
  }

  loadLogsPage(emp: Employee, page: number): void {
    if (!emp?._id) return;
    this.logsLoading = true;
    this.employeeService.getLogs(emp._id, page, 100, this.logsFilter || undefined).subscribe({
      next: (res) => {
        this.employeeLogs = res.logs;
        this.logsPagination = { page: res.page, pages: res.pages, total: res.total };
        this.logsLoading = false;
      },
      error: () => {
        this.employeeLogs = [];
        this.logsLoading = false;
      },
    });
  }

  logIcon(category: string): string {
    const icons: Record<string, string> = {
      task_start: '🟢', task_complete: '✅', task_fail: '❌',
      tool_use: '🔧', tool_result: '📤', text: '💬', error: '🚨', comms: '📝',
    };
    return icons[category] || '📋';
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
    this.lastTaskInput = this.taskInput.trim();
    this.taskError = '';
    this.agentRunning = true;
    this.agentEntries = [];
    this.historicalLogs = [];
    this.logsExpanded = false;
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

  stopEmployee(): void {
    if (!this.selectedEmployee) return;
    this.employeeService.stopTask(this.selectedEmployee._id!).subscribe({
      next: (res) => {
        if (res.stopped) {
          this.agentRunning = false;
          this.agentSub?.unsubscribe();
          this.agentSub = null;
          this.agentEntries.push({ type: 'text', content: '⏹️ Stopped by user' });
          if (this.selectedEmployee) {
            this.selectedEmployee.status = 'idle';
            this.updateOverviewStatus(this.selectedEmployee._id!, 'idle');
          }
          this.snackBar.open('Employee stopped', 'Close', { duration: 2000 });
          this.loadEmployees();
          this.loadAllEmployees();
        }
      },
      error: () => this.snackBar.open('Failed to stop', 'Close', { duration: 3000 }),
    });
  }

  restartEmployee(): void {
    if (!this.selectedEmployee) return;
    this.employeeService.restartEmployee(this.selectedEmployee._id!).subscribe({
      next: (res) => {
        this.agentRunning = false;
        this.agentSub?.unsubscribe();
        this.agentSub = null;
        this.snackBar.open(res.message, 'Close', { duration: 3000 });
        // Refresh employee data
        this.employeeService.getById(this.selectedEmployee!._id!).subscribe({
          next: (fresh) => {
            this.selectedEmployee = fresh;
            if (this.modalEmployee?._id === fresh._id) this.modalEmployee = fresh;
          },
        });
        this.loadEmployees();
        this.loadAllEmployees();
      },
      error: () => this.snackBar.open('Failed to restart', 'Close', { duration: 3000 }),
    });
  }

  loadHistoricalLogs(): void {
    if (!this.selectedEmployee) return;
    this.employeeService.getLogs(this.selectedEmployee._id!, 1, 200).subscribe({
      next: (res) => {
        const iconMap: Record<string, string> = {
          task_start: '🟢', task_complete: '✅', task_fail: '❌',
          tool_use: '🔧', tool_result: '📋', text: '💬',
          error: '🚨', comms: '📝',
        };
        this.historicalLogs = res.logs.reverse().map((l: any) => ({
          category: l.category,
          icon: iconMap[l.category] || '📝',
          time: new Date(l.createdAt).toLocaleTimeString(),
          content: l.content,
        }));
        this.logsExpanded = true;
      },
      error: () => this.snackBar.open('Failed to load logs', 'Close', { duration: 3000 }),
    });
  }

  sendMessageToEmployee(): void {
    if (!this.selectedEmployee || !this.injectMessage.trim()) return;
    this.sendingMessage = true;
    this.injectResult = null;
    this.employeeService.sendMessage(this.selectedEmployee._id!, this.injectMessage.trim()).subscribe({
      next: (result) => {
        this.injectResult = result;
        this.sendingMessage = false;
        if (result.delivered) {
          this.agentEntries.push({ type: 'text', content: `📩 [You]: ${this.injectMessage.trim()}` });
          this.injectMessage = '';
          // Clear result after 5s
          setTimeout(() => this.injectResult = null, 5000);
        }
      },
      error: (err) => {
        this.sendingMessage = false;
        this.injectResult = { delivered: false, detail: err?.error?.error || err?.message || 'Failed to send message' };
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

  // Skills config
  loadSkillsConfig(): void {
    if (this.localSkills.length) return; // already loaded
    this.skillsLoading = true;
    this.employeeService.getLocalSkills().subscribe({
      next: (skills) => {
        this.localSkills = skills;
        this.skillsLoading = false;
      },
      error: () => {
        this.skillsLoading = false;
        this.snackBar.open('Failed to load local skills', 'Close', { duration: 3000 });
      },
    });
  }

  selectSkillsRole(role: string): void {
    this.skillsSelectedRole = role;
    this.skillsDirty = false;
    this.skillsSearch = '';

    // Load from cache or fetch
    if (this.roleSkillsCache[role]) {
      this.assignedSkills = [...this.roleSkillsCache[role]];
      return;
    }

    this.employeeService.getRoleSkills(role).subscribe({
      next: (skills) => {
        this.assignedSkills = skills;
        this.roleSkillsCache[role] = [...skills];
      },
      error: () => { this.assignedSkills = []; },
    });
  }

  getRoleSkillCount(role: string): number {
    return (this.roleSkillsCache[role] || []).length;
  }

  assignSkill(skill: { name: string; description: string }): void {
    if (this.assignedSkills.some(s => s.name === skill.name)) return;
    this.assignedSkills.push({ name: skill.name, description: skill.description });
    this.skillsDirty = true;
  }

  unassignSkill(name: string): void {
    this.assignedSkills = this.assignedSkills.filter(s => s.name !== name);
    this.skillsDirty = true;
  }

  saveRoleSkills(): void {
    if (!this.skillsSelectedRole) return;
    this.employeeService.setRoleSkills(this.skillsSelectedRole, this.assignedSkills).subscribe({
      next: (res) => {
        this.roleSkillsCache[this.skillsSelectedRole] = [...this.assignedSkills];
        this.skillsDirty = false;
        this.snackBar.open(`Skills saved — ${res.updated} employee(s) updated`, 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to save skills', 'Close', { duration: 3000 }),
    });
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

  // ── Chat ──

  sendChatMessage(emp: Employee): void {
    const msg = this.chatInput.trim();
    if (!msg) return;
    this.chatMessages.push({ role: 'user', text: msg });
    this.chatInput = '';
    this.chatSending = true;

    this.employeeService.sendMessage(emp._id!, msg).subscribe({
      next: (res) => {
        this.chatSending = false;
        this.chatMessages.push({ role: 'agent', text: res.detail || (res.delivered ? 'Message delivered' : 'Not delivered — employee may not be working') });
      },
      error: (err) => {
        this.chatSending = false;
        this.chatMessages.push({ role: 'agent', text: `Error: ${err.error?.error || err.message}` });
      },
    });
  }

  // ── Memory ──

  loadMemories(emp: Employee): void {
    this.memoriesLoading = true;
    this.employeeService.getMemories(emp._id!, this.memoryFilter || undefined).subscribe({
      next: (mems) => { this.employeeMemories = mems; this.memoriesLoading = false; },
      error: () => { this.memoriesLoading = false; },
    });
  }

  compactLogs(emp: Employee): void {
    this.compacting = true;
    this.employeeService.compactLogs(emp._id!).subscribe({
      next: (res) => {
        this.compacting = false;
        this.snackBar.open(res.summary, 'Close', { duration: 3000 });
        this.loadMemories(emp);
      },
      error: (err) => {
        this.compacting = false;
        this.snackBar.open(err.error?.error || 'Compaction failed', 'Close', { duration: 3000 });
      },
    });
  }

  wipeMemories(emp: Employee): void {
    if (!confirm(`Wipe all memories for ${emp.name}? This cannot be undone.`)) return;
    this.employeeService.wipeMemories(emp._id!).subscribe({
      next: (res) => {
        this.snackBar.open(res.message, 'Close', { duration: 2000 });
        this.employeeMemories = [];
      },
      error: () => this.snackBar.open('Wipe failed', 'Close', { duration: 3000 }),
    });
  }

  deleteMemory(emp: Employee, memoryId: string): void {
    this.employeeService.deleteMemory(emp._id!, memoryId).subscribe({
      next: () => {
        this.employeeMemories = this.employeeMemories.filter(m => m._id !== memoryId);
      },
      error: () => this.snackBar.open('Delete failed', 'Close', { duration: 3000 }),
    });
  }

  addManualMemory(emp: Employee): void {
    const content = this.newMemContent.trim();
    if (!content) return;
    this.employeeService.addMemory(emp._id!, {
      category: this.newMemCategory,
      content,
      importance: 5,
    }).subscribe({
      next: (mem) => {
        this.employeeMemories.unshift(mem);
        this.newMemContent = '';
        this.snackBar.open('Memory added', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to add memory', 'Close', { duration: 3000 }),
    });
  }

  memoryCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      goal: '🎯', learning: '💡', blocker: '🚧', decision: '⚖️', preference: '⭐', context: '📋',
    };
    return map[cat] || '📝';
  }

  // ── Cycle ──

  // ── Modal ──

  openEmployeeModal(emp: Employee, projectId: string): void {
    this.selectedProjectId = projectId;
    this.selectedEmployee = emp;
    this.modalTab = 'tasks';
    this.modalChatMessages = [];
    this.modalLogs = [];
    this.modalMemories = [];
    this.modalTaskInput = '';
    this.wsExpanded = false;
    this.employeeService.getById(emp._id!).subscribe({
      next: (fresh) => { this.modalEmployee = fresh; this.selectedEmployee = fresh; },
      error: () => { this.modalEmployee = emp; },
    });
  }

  closeModal(): void {
    this.modalEmployee = null;
  }

  loadModalLogs(): void {
    if (!this.modalEmployee) return;
    this.modalLogsLoading = true;
    this.employeeService.getLogs(this.modalEmployee._id!, this.modalLogPage, 100, this.modalLogFilter || undefined).subscribe({
      next: (res) => { this.modalLogs = res.logs; this.modalLogPages = res.pages; this.modalLogsLoading = false; },
      error: () => { this.modalLogsLoading = false; },
    });
  }

  loadModalMemories(): void {
    if (!this.modalEmployee) return;
    this.modalMemLoading = true;
    this.employeeService.getMemories(this.modalEmployee._id!).subscribe({
      next: (mems) => { this.modalMemories = mems; this.modalMemLoading = false; },
      error: () => { this.modalMemLoading = false; },
    });
  }

  compactModalLogs(): void {
    if (!this.modalEmployee) return;
    this.modalCompacting = true;
    this.employeeService.compactLogs(this.modalEmployee._id!).subscribe({
      next: (res) => { this.modalCompacting = false; this.snackBar.open(res.summary, 'Close', { duration: 3000 }); this.loadModalMemories(); },
      error: () => { this.modalCompacting = false; },
    });
  }

  wipeModalMemories(): void {
    if (!this.modalEmployee || !confirm(`Wipe all memories for ${this.modalEmployee.name}?`)) return;
    this.employeeService.wipeMemories(this.modalEmployee._id!).subscribe({
      next: () => { this.modalMemories = []; this.snackBar.open('Memories wiped', 'Close', { duration: 2000 }); },
    });
  }

  deleteModalMemory(memoryId: string): void {
    if (!this.modalEmployee) return;
    this.employeeService.deleteMemory(this.modalEmployee._id!, memoryId).subscribe({
      next: () => { this.modalMemories = this.modalMemories.filter(m => m._id !== memoryId); },
    });
  }

  sendModalChat(): void {
    if (!this.modalEmployee || !this.modalChatInput.trim()) return;
    const msg = this.modalChatInput.trim();
    this.modalChatMessages.push({ role: 'user', text: msg });
    this.modalChatInput = '';
    this.modalChatSending = true;
    this.employeeService.sendMessage(this.modalEmployee._id!, msg).subscribe({
      next: (res) => {
        this.modalChatSending = false;
        this.modalChatMessages.push({ role: 'agent', text: res.detail || (res.delivered ? 'Delivered' : 'Not delivered') });
      },
      error: (err) => {
        this.modalChatSending = false;
        this.modalChatMessages.push({ role: 'agent', text: `Error: ${err.error?.error || err.message}` });
      },
    });
  }

  assignModalTask(): void {
    if (!this.modalEmployee || !this.modalTaskInput.trim()) return;
    const task = this.modalTaskInput.trim();
    this.modalTaskInput = '';
    this.employeeService.assignTask(this.modalEmployee._id!, task).subscribe({
      next: () => {
        this.snackBar.open('Task assigned', 'Close', { duration: 2000 });
        // Refresh employee
        this.employeeService.getById(this.modalEmployee!._id!).subscribe({
          next: (fresh) => { this.modalEmployee = fresh; },
        });
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed', 'Close', { duration: 3000 }),
    });
  }

  getLatestTask(emp: Employee): any {
    if (!emp.taskHistory?.length) return null;
    return emp.taskHistory[emp.taskHistory.length - 1];
  }

  taskStatusIcon(status: string): string {
    const map: Record<string, string> = { pending: '⏳', in_progress: '🔄', completed: '✅', failed: '❌' };
    return map[status] || '•';
  }

  cyclePhaseIcon(phase: string): string {
    const map: Record<string, string> = { idle: '⬚', pending_directions: '🧭', active: '📋', dev: '🔨', qa: '🧪', done: '✅' };
    return map[phase] || '•';
  }

  isCyclePhaseDone(project: Project, phase: string): boolean {
    const order = ['idle', 'active', 'dev', 'qa', 'done'];
    const current = project.strategicCycle?.status || 'idle';
    return order.indexOf(phase) < order.indexOf(current);
  }

  setCycleStatus(project: Project, phase: 'idle' | 'pending_directions' | 'active' | 'dev' | 'qa' | 'done'): void {
    if (!project._id) return;
    const current = project.strategicCycle?.status || 'idle';
    if (phase === current) return;

    const msg = phase === 'idle'
      ? `Reset cycle for ${project.name}? This clears the current advice.`
      : `Set ${project.name} cycle to "${phase}"?`;
    if (!confirm(msg)) return;

    this.projectService.update(project._id, {
      strategicCycle: {
        status: phase,
        advice: phase === 'idle' ? '' : (project.strategicCycle?.advice || ''),
        advisorRole: phase === 'idle' ? '' : (project.strategicCycle?.advisorRole || ''),
        advisorName: phase === 'idle' ? '' : (project.strategicCycle?.advisorName || ''),
        startedAt: phase === 'idle' ? undefined : (project.strategicCycle?.startedAt || new Date().toISOString()),
        completedAt: phase === 'done' ? new Date().toISOString() : undefined,
        devTasksTotal: project.strategicCycle?.devTasksTotal || 0,
        devTasksDone: project.strategicCycle?.devTasksDone || 0,
        qaTasksTotal: project.strategicCycle?.qaTasksTotal || 0,
        qaTasksDone: project.strategicCycle?.qaTasksDone || 0,
      } as any,
    }).subscribe({
      next: (updated) => {
        project.strategicCycle = updated.strategicCycle;
        this.snackBar.open(`Cycle → ${phase}`, 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update cycle', 'Close', { duration: 3000 }),
    });
  }

  scrollCycle(event: Event, direction: number): void {
    const btn = event.currentTarget as HTMLElement;
    const bar = btn.closest('.cycle-bar');
    const phases = bar?.querySelector('.cycle-phases') as HTMLElement;
    if (phases) {
      phases.scrollBy({ left: direction * 100, behavior: 'smooth' });
    }
  }

  toggleCycleAdvice(projectId: string): void {
    this.expandedCycleAdvice = this.expandedCycleAdvice === projectId ? '' : projectId;
    this.editingDirection = false;
  }

  startEditDirection(project: Project): void {
    this.directionEditText = project.strategicDirection || project.strategicCycle?.advice || '';
    this.editingDirection = true;
  }

  saveDirection(project: Project): void {
    if (!project._id) return;
    this.projectService.update(project._id, { strategicDirection: this.directionEditText }).subscribe({
      next: (updated) => {
        project.strategicDirection = updated.strategicDirection;
        this.editingDirection = false;
        this.snackBar.open('Strategic direction saved', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to save', 'Close', { duration: 3000 }),
    });
  }
}
