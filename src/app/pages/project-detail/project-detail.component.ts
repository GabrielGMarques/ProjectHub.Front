import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { marked } from 'marked';
import { ProjectService } from '../../services/project.service';
import { Project, ChatMessage, CoachAction, Todo, WeeklySchedule, AIModel, AIModelOption } from '../../models/project.model';
import { MarketingResearchComponent } from '../../components/marketing-research/marketing-research.component';
import { AgentTerminalComponent } from '../../components/agent-terminal/agent-terminal.component';
import { SkillsPanelComponent } from '../../components/skills-panel/skills-panel.component';
import { FileExplorerComponent } from '../../components/file-explorer/file-explorer.component';
import { EmployeeService } from '../../services/employee.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatOptionModule, MatCheckboxModule,
    MarketingResearchComponent, AgentTerminalComponent, SkillsPanelComponent, FileExplorerComponent,
  ],
  template: `
    <div class="detail-page">
      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!project) {
        <div class="empty-state">
          <h2>Company not found</h2>
          <a routerLink="/dashboard" class="back-link"><mat-icon>arrow_back</mat-icon> Back to Dashboard</a>
        </div>
      } @else {
        <!-- Header -->
        <div class="page-header">
          <div class="header-top">
            <a routerLink="/dashboard" class="back-link">
              <mat-icon>arrow_back</mat-icon> Dashboard
            </a>
          </div>

          <h1>{{ project.name }}</h1>
          @if (project.description) {
            <p class="description">{{ project.description }}</p>
          }
        </div>

        <!-- Metrics (always visible in header) -->
        <div class="metrics-row">
          <div class="metric-card">
            <span class="metric-label">MRR</span>
            <span class="metric-value">\${{ project.mrr | number }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Clients</span>
            <span class="metric-value">{{ project.clientCount }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Impact</span>
            <span class="metric-value impact-{{ project.impact }}">{{ project.impact }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Hours/Week</span>
            <span class="metric-value">{{ weeklyHours }}h</span>
          </div>
          @if (project.niche) {
            <div class="metric-card">
              <span class="metric-label">Niche</span>
              <span class="metric-value">{{ project.niche }}</span>
            </div>
          }
        </div>

        @if (project.monetizationPlan) {
          <div class="monetization-banner">
            <mat-icon>attach_money</mat-icon>
            <span>{{ project.monetizationPlan }}</span>
          </div>
        }

        <!-- Presentation -->
        @if (project.presentation) {
          <div class="presentation-card">
            <div class="section-header">
              <span class="section-title"><mat-icon>article</mat-icon> Presentation</span>
            </div>
            <div class="markdown-body presentation-content" [innerHTML]="parsedPresentation"></div>
          </div>
        }

        <!-- Tabs -->
        <div class="tab-bar">
          <button class="tab" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'"><mat-icon>dashboard</mat-icon> Overview</button>
          <button class="tab" [class.active]="activeTab === 'marketing'" (click)="activeTab = 'marketing'"><mat-icon>campaign</mat-icon> Marketing</button>
          <button class="tab" [class.active]="activeTab === 'agent'" (click)="activeTab = 'agent'"><mat-icon>terminal</mat-icon> Agent</button>
          <button class="tab" [class.active]="activeTab === 'skills'" (click)="activeTab = 'skills'"><mat-icon>auto_fix_high</mat-icon> Skills</button>
          <button class="tab" [class.active]="activeTab === 'employees'" (click)="loadEmployees(); activeTab = 'employees'"><mat-icon>groups</mat-icon> Team <span class="tab-badge" *ngIf="projectEmployees.length">{{ projectEmployees.length }}</span></button>
          <button class="tab" [class.active]="activeTab === 'apps'" (click)="activeTab = 'apps'"><mat-icon>dns</mat-icon> Apps <span class="tab-badge" *ngIf="project.applications?.length">{{ project.applications.length }}</span></button>
          <button class="tab" [class.active]="activeTab === 'files'" (click)="activeTab = 'files'"><mat-icon>folder_open</mat-icon> Files</button>
          <button class="tab" [class.active]="activeTab === 'settings'" (click)="openSettings()"><mat-icon>settings</mat-icon> Settings</button>
        </div>

        @if (activeTab === 'settings') {
          <div class="settings-tab">
            <div class="settings-header">
              <h2>Company Settings</h2>
              <button class="settings-save-btn" (click)="saveSettings()">
                <mat-icon>check</mat-icon> Save Changes
              </button>
            </div>
            <form [formGroup]="form" class="settings-form">
              <div class="settings-section">
                <h3><mat-icon>info</mat-icon> General</h3>
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>Company Name</mat-label>
                  <input matInput formControlName="name" />
                </mat-form-field>
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="2"></textarea>
                </mat-form-field>
                <div class="settings-row">
                  <mat-form-field appearance="outline">
                    <mat-label>MRR ($)</mat-label>
                    <input matInput type="number" formControlName="mrr" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Clients</mat-label>
                    <input matInput type="number" formControlName="clientCount" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Impact</mat-label>
                    <mat-select formControlName="impact">
                      <mat-option value="low">Low</mat-option>
                      <mat-option value="medium">Medium</mat-option>
                      <mat-option value="high">High</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Niche</mat-label>
                    <input matInput formControlName="niche" />
                  </mat-form-field>
                </div>
                <div class="holding-toggle">
                  <label class="holding-label">
                    <input type="checkbox" [checked]="project.onHolding" (change)="toggleHolding()" />
                    <span class="holding-text">⏸️ On Holding</span>
                    <span class="holding-hint">When on holding, Alfred will ignore this company</span>
                  </label>
                </div>
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>Background Image URL</mat-label>
                  <input matInput formControlName="backgroundImage" />
                </mat-form-field>
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>Monetization Plan</mat-label>
                  <textarea matInput formControlName="monetizationPlan" rows="3"
                    placeholder="How will this company generate revenue?"></textarea>
                </mat-form-field>
              </div>

              <div class="settings-section">
                <h3><mat-icon>snippet_folder</mat-icon> Company Folders</h3>
                <p class="settings-hint">The first folder is the agent's working directory. All folders are accessible from the Files tab.</p>
                @for (folder of editFolders; track $index) {
                  <div class="folder-row">
                    <span class="folder-index" [class.primary]="$index === 0">{{ $index === 0 ? 'cwd' : $index }}</span>
                    <input class="folder-input" [value]="folder" (input)="updateFolder($index, $event)" placeholder="e.g. D:\\Projects\\MyApp" />
                    <button type="button" class="folder-browse" (click)="pickFolder($index)" matTooltip="Browse" [disabled]="pickingFolder">
                      <mat-icon>folder_open</mat-icon>
                    </button>
                    <button type="button" class="folder-remove" (click)="removeFolder($index)" matTooltip="Remove">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
                <button type="button" class="add-folder-btn" (click)="pickAndAddFolder()" [disabled]="pickingFolder">
                  @if (pickingFolder) {
                    <mat-spinner diameter="14"></mat-spinner>
                  } @else {
                    <mat-icon>add</mat-icon>
                  }
                  Add folder
                </button>
              </div>

              <div class="settings-section">
                <h3><mat-icon>article</mat-icon> Presentation</h3>
                <p class="settings-hint">This presentation is shared as context with AI Coach, Agent, Marketing Research, and Skills.</p>
                <textarea
                  class="presentation-textarea"
                  formControlName="presentation"
                  rows="10"
                  placeholder="# My Company&#10;&#10;Describe your company, goals, target audience, tech stack, unique value proposition, etc.&#10;&#10;This context will be available to all AI tools."></textarea>
              </div>
            </form>
          </div>
        } @else if (activeTab === 'marketing') {
          <app-marketing-research [project]="project" [availableModels]="availableModels"></app-marketing-research>
        } @else if (activeTab === 'agent') {
          <app-agent-terminal [project]="project"></app-agent-terminal>
        } @else if (activeTab === 'skills') {
          <app-skills-panel [project]="project" [availableModels]="availableModels"></app-skills-panel>
        } @else if (activeTab === 'employees') {
          <div class="employees-tab">
            @if (projectEmployees.length === 0) {
              <div class="empty-employees">
                <mat-icon>groups</mat-icon>
                <h3>No employees assigned</h3>
                <p>Go to the <a routerLink="/hr">HR Department</a> to hire employees for this company.</p>
              </div>
            } @else {
              <div class="employees-grid">
                @for (emp of projectEmployees; track emp._id) {
                  <div class="emp-card" [class.working]="emp.status === 'working'">
                    <div class="emp-card-header">
                      <span class="emp-avatar">{{ emp.avatar }}</span>
                      <div class="emp-meta">
                        <span class="emp-name">{{ emp.name }}</span>
                        <span class="emp-title">{{ emp.title }}</span>
                      </div>
                      <span class="emp-status-badge" [class]="emp.status">
                        @if (emp.status === 'working') {
                          <mat-spinner diameter="12"></mat-spinner>
                        }
                        {{ emp.status }}
                      </span>
                    </div>
                    <div class="emp-specialties">
                      @for (s of emp.specialties; track s) {
                        <span class="emp-spec">{{ s }}</span>
                      }
                    </div>
                    @if (emp.currentTask) {
                      <div class="emp-current-task">
                        <mat-icon>engineering</mat-icon>
                        <span>{{ emp.taskHistory[emp.taskHistory.length - 1]?.description || 'Working...' }}</span>
                      </div>
                    }
                    @if (emp.taskHistory?.length) {
                      <div class="emp-history-summary">
                        <span class="emp-stat completed">{{ countTasks(emp, 'completed') }} done</span>
                        <span class="emp-stat failed">{{ countTasks(emp, 'failed') }} failed</span>
                        <span class="emp-stat">{{ emp.taskHistory.length }} total</span>
                      </div>
                    }
                    <div class="emp-actions">
                      @if (emp.lastActivity) {
                        <span class="emp-last-active">Last active: {{ emp.lastActivity | date:'short' }}</span>
                      }
                      <button class="emp-logs-btn" (click)="toggleEmpLogs(emp)">
                        <mat-icon>receipt_long</mat-icon> Logs
                      </button>
                    </div>
                    @if (empLogsOpen === emp._id) {
                      <div class="emp-logs-panel">
                        <div class="emp-logs-filters">
                          <button class="emp-filter" [class.active]="empLogsFilter === ''" (click)="empLogsFilter = ''; loadEmpLogs(emp)">All</button>
                          <button class="emp-filter" [class.active]="empLogsFilter === 'tool_use'" (click)="empLogsFilter = 'tool_use'; loadEmpLogs(emp)">Tools</button>
                          <button class="emp-filter" [class.active]="empLogsFilter === 'text'" (click)="empLogsFilter = 'text'; loadEmpLogs(emp)">Text</button>
                          <button class="emp-filter" [class.active]="empLogsFilter === 'error'" (click)="empLogsFilter = 'error'; loadEmpLogs(emp)">Errors</button>
                          <button class="emp-filter" [class.active]="empLogsFilter === 'task_complete'" (click)="empLogsFilter = 'task_complete'; loadEmpLogs(emp)">Done</button>
                          <button class="emp-filter" [class.active]="empLogsFilter === 'task_fail'" (click)="empLogsFilter = 'task_fail'; loadEmpLogs(emp)">Failed</button>
                        </div>
                        <div class="emp-logs-list">
                          @if (empLogsLoading) {
                            <div class="emp-logs-load"><mat-spinner diameter="16"></mat-spinner></div>
                          } @else if (empLogsList.length === 0) {
                            <div class="emp-logs-empty">No logs</div>
                          } @else {
                            @for (log of empLogsList; track log._id) {
                              <div class="emp-log-row" [class]="log.category">
                                <span class="elr-time">{{ log.createdAt | date:'MM/dd HH:mm' }}</span>
                                <span class="elr-cat">{{ log.category }}</span>
                                <span class="elr-content">{{ log.content }}</span>
                              </div>
                            }
                          }
                        </div>
                        @if (empLogsPagination.pages > 1) {
                          <div class="emp-logs-pager">
                            <button [disabled]="empLogsPagination.page <= 1" (click)="loadEmpLogsPage(emp, empLogsPagination.page - 1)">←</button>
                            <span>{{ empLogsPagination.page }}/{{ empLogsPagination.pages }}</span>
                            <button [disabled]="empLogsPagination.page >= empLogsPagination.pages" (click)="loadEmpLogsPage(emp, empLogsPagination.page + 1)">→</button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        } @else if (activeTab === 'apps') {
          <div class="apps-tab">
            <div class="apps-header">
              <h3><mat-icon>dns</mat-icon> Applications & Services</h3>
              <div class="apps-header-actions">
                <button class="btn-gold-sm" (click)="showAddApp = !showAddApp">
                  <mat-icon>{{ showAddApp ? 'close' : 'add' }}</mat-icon> {{ showAddApp ? 'Cancel' : 'Add App' }}
                </button>
              </div>
            </div>

            @if (showAddApp) {
              <div class="add-app-form">
                <div class="form-row">
                  <input class="form-input" [(ngModel)]="newApp.name" placeholder="App name (e.g. landing-page)" />
                  <input class="form-input port-input" [(ngModel)]="newApp.port" type="number" placeholder="Port" />
                  <select class="form-input type-select" [(ngModel)]="newApp.type">
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="fullstack">Full Stack</option>
                    <option value="service">Service</option>
                    <option value="database">Database</option>
                  </select>
                </div>
                <div class="form-row">
                  <input class="form-input" [(ngModel)]="newApp.dockerService" placeholder="Docker service name" />
                  <input class="form-input" [(ngModel)]="newApp.description" placeholder="Description" />
                  <button class="btn-gold-sm" (click)="addApplication()" [disabled]="!newApp.name || !newApp.port">
                    <mat-icon>check</mat-icon> Save
                  </button>
                </div>
              </div>
            }

            <div class="apps-grid">
              @for (app of project.applications || []; track app.name) {
                <div class="app-card" [class.running]="app.status === 'running'" [class.error]="app.status === 'error'">
                  <div class="app-card-header">
                    <div class="app-type-badge" [attr.data-type]="app.type">{{ app.type }}</div>
                    <div class="app-status" [class]="'status-' + app.status">
                      <span class="status-dot"></span> {{ app.status }}
                    </div>
                  </div>
                  <div class="app-card-body">
                    <h4 class="app-name">{{ app.name }}</h4>
                    <p class="app-desc" *ngIf="app.description">{{ app.description }}</p>
                    <div class="app-meta">
                      <span class="app-port" matTooltip="Docker port"><mat-icon>lan</mat-icon> :{{ app.port }}</span>
                      <span class="app-path" matTooltip="Gateway path"><mat-icon>link</mat-icon> {{ app.basePath }}</span>
                    </div>
                    @if (app.dockerService) {
                      <div class="app-docker"><mat-icon>inventory_2</mat-icon> {{ app.dockerService }}</div>
                    }
                    @if (app.testInstructions) {
                      <div class="app-test-instructions">
                        <div class="test-instructions-header"><mat-icon>science</mat-icon> Test Instructions</div>
                        <div class="test-instructions-body">{{ app.testInstructions }}</div>
                      </div>
                    } @else {
                      <div class="app-test-instructions empty">
                        <mat-icon>science</mat-icon> <span>No test instructions yet</span>
                      </div>
                    }
                  </div>
                  <!-- Screenshot gallery -->
                  @if (appScreenshots[app.name]?.length) {
                    <div class="app-screenshots">
                      <div class="screenshots-header">
                        <mat-icon>photo_library</mat-icon>
                        <span>{{ appScreenshots[app.name].length }} screenshot{{ appScreenshots[app.name].length !== 1 ? 's' : '' }}</span>
                      </div>
                      <div class="screenshots-track">
                        @for (ss of appScreenshots[app.name]; track ss.filename; let i = $index) {
                          <div class="screenshot-thumb"
                               (click)="openLightbox(app, ss, i)"
                               [matTooltip]="ss.caption || ss.originalName">
                            <img [src]="getScreenshotUrl(app.name, ss.filename)" [alt]="ss.caption" loading="lazy" />
                            @if (ss.caption) {
                              <span class="thumb-caption">{{ ss.caption }}</span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <div class="app-card-actions">
                    <button class="app-action-btn" (click)="toggleAppStatus(app)" matTooltip="{{ app.status === 'running' ? 'Stop' : 'Start' }}">
                      <mat-icon>{{ app.status === 'running' ? 'stop' : 'play_arrow' }}</mat-icon>
                    </button>
                    <button class="app-action-btn" (click)="openAppUrl(app)" matTooltip="Open in browser">
                      <mat-icon>open_in_new</mat-icon>
                    </button>
                    <button class="app-action-btn danger" (click)="removeApplication(app.name)" matTooltip="Remove">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
              @if (!(project.applications || []).length) {
                <div class="apps-empty">
                  <mat-icon>dns</mat-icon>
                  <p>No applications registered yet.</p>
                  <p class="hint">Add an application to route traffic through the gateway.</p>
                </div>
              }
            </div>

            <!-- Screenshot lightbox -->
            @if (lightboxUrl) {
              <div class="lightbox-overlay" (click)="lightboxUrl = ''">
                @if (lightboxScreenshots.length > 1 && lightboxIndex > 0) {
                  <button class="lightbox-nav lb-prev" (click)="navigateLightbox(-1, $event)"><mat-icon>chevron_left</mat-icon></button>
                }
                <img [src]="lightboxUrl" (click)="$event.stopPropagation()" />
                @if (lightboxScreenshots.length > 1 && lightboxIndex < lightboxScreenshots.length - 1) {
                  <button class="lightbox-nav lb-next" (click)="navigateLightbox(1, $event)"><mat-icon>chevron_right</mat-icon></button>
                }
                <span class="lightbox-caption">{{ lightboxCaption }}</span>
                @if (lightboxScreenshots.length > 1) {
                  <span class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ lightboxScreenshots.length }}</span>
                }
                <button class="lightbox-close" (click)="lightboxUrl = ''"><mat-icon>close</mat-icon></button>
              </div>
            }

            <!-- Gateway info -->
            <div class="gateway-info">
              <div class="gateway-label"><mat-icon>router</mat-icon> Gateway</div>
              <span class="gateway-url">https://nonshattering-adelaida-ponchoed.ngrok-free.dev</span>
              <span class="gateway-port">Port {{ gatewayPort }}</span>
            </div>
          </div>
        } @else if (activeTab === 'files') {
          <app-file-explorer [project]="project" (projectUpdated)="project = $event"></app-file-explorer>
        }

        <!-- Main content grid (Overview tab) -->
        @if (activeTab === 'overview') {
        <div class="content-grid">
          <!-- Left column: Todos + Documents -->
          <div class="left-column">
            <!-- Todo List -->
            <div class="section-card">
              <div class="section-header">
                <span class="section-title">
                  <mat-icon>checklist</mat-icon>
                  To-Do List
                </span>
                <span class="todo-count">{{ doneCount }}/{{ project.todos?.length || 0 }}</span>
              </div>

              @if (project.todos?.length) {
                <div class="todo-progress">
                  <div class="todo-progress-bar" [style.width.%]="progressPercent"></div>
                </div>
              }

              <div class="todo-list">
                @for (todo of project.todos; track $index) {
                  <div class="todo-item" [class.done]="todo.done">
                    <mat-checkbox
                      [checked]="todo.done"
                      (change)="toggleTodo($index)"
                      color="primary">
                    </mat-checkbox>
                    <span class="todo-text">{{ todo.text }}</span>
                    <button class="icon-btn-sm" (click)="removeTodo($index)" matTooltip="Remove">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <div class="add-todo">
                <input
                  class="todo-input"
                  [(ngModel)]="newTodoText"
                  placeholder="Add a task..."
                  (keydown.enter)="addTodo()"
                />
                <button class="icon-btn-sm add" (click)="addTodo()" [disabled]="!newTodoText.trim()" matTooltip="Add">
                  <mat-icon>add</mat-icon>
                </button>
              </div>

              @if (!project.todos?.length) {
                <div class="no-items">No tasks yet. Add one above.</div>
              }
            </div>

            <!-- Documents -->
            <div class="section-card">
              <div class="section-header">
                <span class="section-title">
                  <mat-icon>folder</mat-icon>
                  Documents
                </span>
                <span class="doc-count">{{ project.documents?.length || 0 }} files</span>
              </div>

              <div class="upload-area"
                (dragover)="onDragOver($event)"
                (dragleave)="dragOver = false"
                (drop)="onDrop($event)"
                [class.drag-over]="dragOver"
                (click)="fileInput.click()">
                <input #fileInput type="file" hidden multiple (change)="onFileSelected($event)" />
                <mat-icon>cloud_upload</mat-icon>
                <span>Drop files here or click to upload</span>
                <span class="upload-hint">Max 10MB per file</span>
              </div>

              @if (uploading) {
                <div class="upload-progress">
                  <mat-spinner diameter="20"></mat-spinner>
                  <span>Uploading...</span>
                </div>
              }

              <div class="file-list">
                @for (doc of project.documents; track doc._id) {
                  <div class="file-item">
                    <mat-icon class="file-icon">{{ getFileIcon(doc.mimeType) }}</mat-icon>
                    <div class="file-info">
                      <span class="file-name">{{ doc.originalName }}</span>
                      <span class="file-size">{{ formatSize(doc.size) }}</span>
                    </div>
                    <div class="file-actions">
                      <a class="icon-btn" [href]="getDownloadUrl(doc._id)" matTooltip="Download">
                        <mat-icon>download</mat-icon>
                      </a>
                      <button class="icon-btn danger" (click)="deleteDoc(doc._id)" matTooltip="Delete">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
                @if (!project.documents?.length) {
                  <div class="no-items">No documents uploaded yet</div>
                }
              </div>
            </div>
          </div>

          <!-- Right column: AI Coach -->
          <div class="section-card chat-section">
            <div class="section-header">
              <span class="section-title">
                <mat-icon>psychology</mat-icon>
                AI Coach
              </span>
              <div class="coach-header-actions">
                @if (messages.length > 0) {
                  <button class="icon-btn" (click)="clearChat()" matTooltip="Clear chat">
                    <mat-icon>delete_sweep</mat-icon>
                  </button>
                }
                <div class="model-selector">
                  @for (m of availableModels; track m.id) {
                    <button
                      class="model-chip"
                      [class.active]="selectedModel === m.id"
                      [class.unavailable]="!m.available"
                      (click)="m.available && selectModel(m.id)"
                      [matTooltip]="m.available ? m.name : m.name + ' (no API key)'"
                    >
                      {{ m.name }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <div class="chat-messages" #chatContainer>
              @if (messages.length === 0) {
                <div class="chat-welcome">
                  <mat-icon>smart_toy</mat-icon>
                  <h3>Company Coach</h3>
                  <p>Ask me anything about growing this company. I can also suggest changes to your todos, presentation, and more.</p>
                  <div class="suggestions">
                    <button class="suggestion" (click)="sendSuggestion('How can I increase my MRR?')">How can I increase my MRR?</button>
                    <button class="suggestion" (click)="sendSuggestion('What should I focus on next?')">What should I focus on next?</button>
                    <button class="suggestion" (click)="sendSuggestion('Review my monetization plan')">Review my monetization plan</button>
                    <button class="suggestion" (click)="sendSuggestion('Create a TODO list for this week')">Create a TODO list for this week</button>
                  </div>
                </div>
              }
              @for (msg of messages; track $index; let mi = $index) {
                <div class="chat-msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
                  <div class="msg-avatar">
                    <mat-icon>{{ msg.role === 'user' ? 'person' : 'smart_toy' }}</mat-icon>
                  </div>
                  <div class="msg-content-wrapper">
                    @if (msg.role === 'assistant') {
                      <div class="msg-content markdown-body" [innerHTML]="parsedMessages[mi]"></div>
                    } @else {
                      <div class="msg-content">{{ msg.content }}</div>
                    }
                    @if (msg.actions?.length) {
                      @for (action of msg.actions; track $index; let ai = $index) {
                        <div class="action-card" [class.accepted]="action.status === 'accepted'" [class.rejected]="action.status === 'rejected'">
                          <div class="action-card-header">
                            <mat-icon>{{ getActionIcon(action.type) }}</mat-icon>
                            <span class="action-label">{{ getActionLabel(action) }}</span>
                          </div>
                          <div class="action-card-body">
                            @if (action.type === 'add_todos' && action.items) {
                              <ul class="action-todo-list">
                                @for (item of action.items; track $index) {
                                  <li>{{ item }}</li>
                                }
                              </ul>
                            }
                            @if (action.type === 'update_presentation' && action.content) {
                              <div class="action-preview">{{ action.content.length > 200 ? action.content.substring(0, 200) + '...' : action.content }}</div>
                            }
                            @if (action.type === 'update_field') {
                              <div class="action-preview"><strong>{{ action.field }}:</strong> {{ action.value }}</div>
                            }
                          </div>
                          @if (action.status === 'pending') {
                            <div class="action-card-footer">
                              <button class="action-btn apply" (click)="applyAction(mi, ai)">
                                <mat-icon>check</mat-icon> Apply
                              </button>
                              <button class="action-btn dismiss" (click)="dismissAction(mi, ai)">
                                <mat-icon>close</mat-icon> Dismiss
                              </button>
                            </div>
                          }
                          @if (action.status === 'accepted') {
                            <div class="action-status applied">
                              <mat-icon>check_circle</mat-icon> Applied
                            </div>
                          }
                          @if (action.status === 'rejected') {
                            <div class="action-status dismissed">
                              <mat-icon>cancel</mat-icon> Dismissed
                            </div>
                          }
                        </div>
                      }
                    }
                  </div>
                </div>
              }
              @if (aiLoading) {
                <div class="chat-msg assistant">
                  <div class="msg-avatar"><mat-icon>smart_toy</mat-icon></div>
                  <div class="msg-content typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              }
            </div>

            <div class="chat-input">
              <input
                [(ngModel)]="userMessage"
                placeholder="Ask your AI coach..."
                (keydown.enter)="sendMessage()"
                [disabled]="aiLoading"
              />
              <button class="send-btn" (click)="sendMessage()" [disabled]="!userMessage.trim() || aiLoading">
                <mat-icon>send</mat-icon>
              </button>
            </div>
          </div>
        </div>
        }
      }
    </div>
  `,
  styles: [`
    .detail-page { padding: 0 24px 2rem; max-width: 1400px; margin: 0 auto; }
    .loading { display: flex; justify-content: center; padding: 4rem; }
    .empty-state { text-align: center; padding: 5rem 2rem; }
    .empty-state h2 { color: var(--color-text); }

    .back-link {
      display: inline-flex; align-items: center; gap: 4px;
      color: var(--color-text-subtle); text-decoration: none;
      font-size: 0.85rem; font-weight: 600;
      transition: color var(--transition);
    }
    .back-link:hover { color: var(--color-primary); }
    .back-link mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .header-top {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 0.75rem;
    }
    .edit-toggle {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg-card);
      color: var(--color-text); font-family: var(--font-family);
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: all var(--transition);
    }
    .edit-toggle:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .edit-toggle.active { background: var(--color-primary); color: #0A0A0A; border-color: var(--color-primary); }
    .edit-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .page-header { padding-top: 0.5rem; margin-bottom: 1.25rem; }
    .page-header h1 {
      margin: 0; font-size: 1.75rem; font-weight: 700;
      color: var(--color-text); letter-spacing: -0.02em;
    }
    .description { margin: 6px 0 0; color: var(--color-text-subtle); font-size: 0.95rem; line-height: 1.5; }
    .edit-header { display: flex; flex-direction: column; gap: 0.25rem; }
    .full-width { width: 100%; }

    /* Metrics edit */
    .metrics-edit { margin-bottom: 1.5rem; }
    .metrics-edit-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .metrics-edit-row mat-form-field { flex: 1; min-width: 150px; }

    /* Metrics display */
    .metrics-row {
      display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;
    }
    .metric-card {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px 20px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      min-width: 120px;
    }
    .metric-label {
      font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--color-text-subtle);
    }
    .metric-value { font-size: 1.25rem; font-weight: 700; color: var(--color-primary); }
    .impact-low { color: var(--color-success) !important; }
    .impact-medium { color: var(--color-warning) !important; }
    .impact-high { color: var(--color-danger) !important; }

    .holding-toggle { margin-top: 8px; }
    .holding-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; }
    .holding-label input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--color-primary); cursor: pointer; }
    .holding-text { font-weight: 600; color: var(--color-text); }
    .holding-hint { font-size: 0.75rem; color: var(--color-text-subtle); }

    .monetization-banner {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 16px; background: var(--color-bg-card);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      margin-bottom: 1.5rem; font-size: 0.9rem; line-height: 1.5;
      color: var(--color-text-muted); white-space: pre-wrap;
    }
    .monetization-banner mat-icon {
      color: var(--color-primary); font-size: 20px; width: 20px; height: 20px;
      flex-shrink: 0; margin-top: 2px;
    }

    /* Presentation */
    .presentation-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;
    }
    .presentation-content { font-size: 0.9rem; line-height: 1.7; color: var(--color-text-muted); max-height: 200px; overflow-y: auto; }
    .presentation-edit-section { margin-top: 0.5rem; }
    .presentation-label { display: flex; align-items: center; gap: 6px; font-size: 0.88rem; font-weight: 700; color: var(--color-text); margin-bottom: 4px; }
    .presentation-label mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary); }
    .presentation-hint { font-size: 0.78rem; color: var(--color-text-subtle); margin: 0 0 8px; }
    .presentation-textarea {
      width: 100%; padding: 12px 14px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg);
      color: var(--color-text); font-family: 'Fira Code', monospace;
      font-size: 0.84rem; line-height: 1.6; outline: none; resize: vertical;
      transition: border-color var(--transition); box-sizing: border-box;
    }
    .presentation-textarea::placeholder { color: var(--color-text-subtle); }
    .presentation-textarea:focus { border-color: var(--color-primary); }

    /* Tabs */
    .tab-bar { display: flex; gap: 4px; margin-bottom: 1.25rem; border-bottom: 1px solid var(--color-border-light); padding-bottom: 0; }
    .tab { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; background: none; color: var(--color-text-subtle); font-family: inherit; font-size: .85rem; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .2s; }
    .tab:hover { color: var(--color-text); }
    .tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    .tab mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Content grid */
    .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .left-column { display: flex; flex-direction: column; gap: 1.25rem; }
    @media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }

    .section-card {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 1.25rem;
      display: flex; flex-direction: column;
    }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1rem;
    }
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 1rem; font-weight: 700; color: var(--color-text);
    }
    .section-title mat-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; }
    .doc-count, .todo-count { font-size: 0.8rem; font-weight: 600; color: var(--color-text-subtle); }

    /* Todo */
    .todo-progress {
      height: 4px; background: var(--color-border-light);
      border-radius: 100px; margin-bottom: 0.75rem; overflow: hidden;
    }
    .todo-progress-bar {
      height: 100%; background: var(--color-primary);
      border-radius: 100px; transition: width 0.3s ease;
    }
    .todo-list { display: flex; flex-direction: column; gap: 2px; }
    .todo-item {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 0; border-radius: var(--radius-sm);
    }
    .todo-item.done .todo-text {
      text-decoration: line-through; color: var(--color-text-subtle);
    }
    .todo-text { flex: 1; font-size: 0.88rem; color: var(--color-text); }
    .icon-btn-sm {
      width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      border: none; background: none; border-radius: 4px;
      color: var(--color-text-subtle); cursor: pointer; transition: all var(--transition);
      opacity: 0;
    }
    .todo-item:hover .icon-btn-sm, .add-todo .icon-btn-sm { opacity: 1; }
    .icon-btn-sm mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .icon-btn-sm:hover { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }
    .icon-btn-sm.add { opacity: 1; color: var(--color-primary); }
    .icon-btn-sm.add:hover { background: rgba(212, 175, 55, 0.15); color: var(--color-primary); }
    .icon-btn-sm:disabled { opacity: 0.3; cursor: not-allowed; }

    .add-todo { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
    .todo-input {
      flex: 1; padding: 8px 10px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg);
      color: var(--color-text); font-family: var(--font-family);
      font-size: 0.85rem; outline: none; transition: border-color var(--transition);
    }
    .todo-input::placeholder { color: var(--color-text-subtle); }
    .todo-input:focus { border-color: var(--color-primary); }
    .no-items {
      padding: 1rem; text-align: center; color: var(--color-text-subtle);
      font-size: 0.85rem; font-style: italic;
    }

    /* Upload */
    .upload-area {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 1.5rem; border: 2px dashed var(--color-border); border-radius: var(--radius-md);
      cursor: pointer; transition: all var(--transition); color: var(--color-text-subtle);
      font-size: 0.85rem; font-weight: 500;
    }
    .upload-area:hover, .upload-area.drag-over {
      border-color: var(--color-primary); color: var(--color-primary);
      background: rgba(212, 175, 55, 0.04);
    }
    .upload-area mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .upload-hint { font-size: 0.75rem; color: var(--color-text-subtle); }
    .upload-progress { display: flex; align-items: center; gap: 8px; padding: 8px 0; color: var(--color-text-subtle); font-size: 0.85rem; }

    /* File list */
    .file-list { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 2px; }
    .file-item {
      display: flex; align-items: center; gap: 10px; padding: 10px;
      border-radius: var(--radius-sm); transition: background var(--transition);
    }
    .file-item:hover { background: var(--color-bg); }
    .file-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; }
    .file-info { flex: 1; min-width: 0; }
    .file-name {
      display: block; font-size: 0.85rem; font-weight: 600; color: var(--color-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-size { font-size: 0.75rem; color: var(--color-text-subtle); }
    .file-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .icon-btn {
      width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
      border: none; background: none; border-radius: var(--radius-sm);
      color: var(--color-text-subtle); cursor: pointer; transition: all var(--transition);
      text-decoration: none;
    }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .icon-btn:hover { background: var(--color-border-light); color: var(--color-primary); }
    .icon-btn.danger:hover { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }

    .model-selector { display: flex; gap: 6px; }
    .model-chip { padding: 4px 10px; border: 1px solid var(--color-border); border-radius: 100px; background: var(--color-bg); color: var(--color-text-subtle); font-family: inherit; font-size: .72rem; font-weight: 600; cursor: pointer; }
    .model-chip:hover:not(.unavailable) { border-color: var(--color-primary); color: var(--color-primary); }
    .model-chip.active { background: var(--color-primary); color: #0A0A0A; border-color: var(--color-primary); }
    .model-chip.unavailable { opacity: .35; cursor: not-allowed; }

    /* Chat */
    .chat-section { min-height: 500px; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 0.5rem 0; display: flex; flex-direction: column; gap: 12px; max-height: 450px; }
    .chat-welcome {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      text-align: center; padding: 2rem 1rem; color: var(--color-text-subtle);
    }
    .chat-welcome mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--color-primary); }
    .chat-welcome h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
    .chat-welcome p { margin: 0; font-size: 0.85rem; line-height: 1.5; max-width: 300px; }
    .suggestions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; width: 100%; }
    .suggestion {
      padding: 10px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: var(--font-family);
      font-size: 0.82rem; font-weight: 500; cursor: pointer; text-align: left;
      transition: all var(--transition);
    }
    .suggestion:hover { border-color: var(--color-primary); color: var(--color-primary); }

    .coach-header-actions { display: flex; align-items: center; gap: 8px; }

    .chat-msg { display: flex; gap: 10px; align-items: flex-start; }
    .chat-msg.user { flex-direction: row-reverse; }
    .msg-avatar {
      width: 30px; height: 30px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      background: var(--color-border-light);
    }
    .chat-msg.assistant .msg-avatar { background: rgba(212, 175, 55, 0.15); }
    .msg-avatar mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--color-text-subtle); }
    .chat-msg.assistant .msg-avatar mat-icon { color: var(--color-primary); }
    .msg-content-wrapper { max-width: 80%; display: flex; flex-direction: column; gap: 8px; }
    .msg-content {
      padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.88rem;
      line-height: 1.6; word-break: break-word;
    }
    .chat-msg.user .msg-content-wrapper { align-items: flex-end; }
    .chat-msg.user .msg-content { background: var(--color-primary); color: #0A0A0A; border-bottom-right-radius: 4px; white-space: pre-wrap; }
    .chat-msg.assistant .msg-content { background: var(--color-bg); color: var(--color-text); border-bottom-left-radius: 4px; }

    /* Action Cards */
    .action-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--color-bg-card);
      transition: all var(--transition);
    }
    .action-card.accepted { border-color: #22c55e40; }
    .action-card.rejected { border-color: var(--color-border-light); opacity: 0.6; }
    .action-card-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px;
      background: rgba(212, 175, 55, 0.06);
      border-bottom: 1px solid var(--color-border-light);
      font-size: 0.82rem; font-weight: 600; color: var(--color-primary);
    }
    .action-card-header mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .action-label { flex: 1; }
    .action-card-body {
      padding: 10px 14px;
      font-size: 0.85rem; color: var(--color-text);
    }
    .action-todo-list {
      margin: 0; padding-left: 1.2em;
      list-style: disc;
    }
    .action-todo-list li { margin: 3px 0; }
    .action-preview {
      font-size: 0.82rem; color: var(--color-text-subtle);
      line-height: 1.5; white-space: pre-wrap;
    }
    .action-card-footer {
      display: flex; gap: 8px;
      padding: 8px 14px;
      border-top: 1px solid var(--color-border-light);
    }
    .action-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 14px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg);
      color: var(--color-text); font-family: var(--font-family);
      font-size: 0.78rem; font-weight: 600; cursor: pointer;
      transition: all var(--transition);
    }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-btn.apply { border-color: #22c55e40; color: #22c55e; }
    .action-btn.apply:hover { background: #22c55e15; border-color: #22c55e; }
    .action-btn.dismiss { border-color: #ef444440; color: #ef4444; }
    .action-btn.dismiss:hover { background: #ef444415; border-color: #ef4444; }
    .action-status {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; font-size: 0.78rem; font-weight: 600;
      border-top: 1px solid var(--color-border-light);
    }
    .action-status mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-status.applied { color: #22c55e; }
    .action-status.dismissed { color: var(--color-text-subtle); }

    /* Markdown in assistant messages */
    .markdown-body p { margin: 0 0 .5em; }
    .markdown-body p:last-child { margin-bottom: 0; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 { margin: .6em 0 .3em; font-size: 1em; font-weight: 700; }
    .markdown-body h1 { font-size: 1.1em; }
    .markdown-body h2 { font-size: 1.05em; }
    .markdown-body ul, .markdown-body ol { margin: .3em 0; padding-left: 1.4em; }
    .markdown-body li { margin: .15em 0; }
    .markdown-body code { background: rgba(255,255,255,.08); padding: 1px 5px; border-radius: 4px; font-size: .82em; font-family: 'Fira Code', monospace; }
    .markdown-body pre { background: rgba(0,0,0,.3); padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: .5em 0; }
    .markdown-body pre code { background: none; padding: 0; font-size: .82em; }
    .markdown-body strong { font-weight: 700; }
    .markdown-body blockquote { border-left: 3px solid var(--color-primary); margin: .5em 0; padding: 2px 10px; color: var(--color-text-subtle); }
    .markdown-body hr { border: none; border-top: 1px solid var(--color-border); margin: .6em 0; }
    .markdown-body a { color: var(--color-primary); text-decoration: underline; }

    .typing { display: flex; gap: 4px; padding: 14px 18px !important; }
    .typing span {
      width: 6px; height: 6px; border-radius: 50%; background: var(--color-text-subtle);
      animation: blink 1.4s infinite both;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }

    .chat-input {
      display: flex; gap: 8px; margin-top: 1rem;
      padding-top: 1rem; border-top: 1px solid var(--color-border-light);
    }
    .chat-input input {
      flex: 1; padding: 10px 14px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text);
      font-family: var(--font-family); font-size: 0.88rem; outline: none;
      transition: border-color var(--transition);
    }
    .chat-input input::placeholder { color: var(--color-text-subtle); }
    .chat-input input:focus { border-color: var(--color-primary); }
    .send-btn {
      width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
      border: none; border-radius: var(--radius-sm); background: var(--color-primary);
      color: #0A0A0A; cursor: pointer; transition: all var(--transition); flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) { background: var(--color-primary-dark); }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Folders */
    .folders-section { margin-bottom: 12px; }
    .folders-label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 700; color: var(--color-text); margin-bottom: 4px; }
    .folders-label mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .folders-hint { font-size: 0.78rem; color: var(--color-text-subtle); margin: 0 0 8px; }
    .folder-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
    .folder-index {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      font-size: 0.68rem; font-weight: 700; color: var(--color-text-subtle);
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-bg); flex-shrink: 0;
    }
    .folder-index.primary { color: var(--color-primary); border-color: var(--color-primary); background: rgba(212,175,55,0.06); font-size: 0.6rem; }
    .folder-input {
      flex: 1; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: 0.82rem; outline: none;
    }
    .folder-input:focus { border-color: var(--color-primary); }
    .folder-input::placeholder { color: var(--color-text-subtle); }
    .folder-browse, .folder-remove {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); cursor: pointer; flex-shrink: 0;
    }
    .folder-browse:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .folder-remove:hover { border-color: #ef4444; color: #ef4444; }
    .folder-browse mat-icon, .folder-remove mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .add-folder-btn {
      display: flex; align-items: center; gap: 4px; border: 1px dashed var(--color-border);
      border-radius: var(--radius-sm); background: none; color: var(--color-text-subtle);
      font-family: inherit; font-size: 0.78rem; font-weight: 600;
      padding: 6px 14px; cursor: pointer; transition: all 0.15s;
    }
    .add-folder-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .add-folder-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Settings tab */
    .tab-badge { font-size: .65rem; background: var(--color-primary); color: #0A0A0A; padding: 1px 6px; border-radius: 100px; font-weight: 700; margin-left: 2px; }

    .employees-tab { padding: 1rem 0; }
    .empty-employees { text-align: center; padding: 3rem 1rem; color: var(--color-text-subtle); }
    .empty-employees mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: .3; }
    .empty-employees h3 { margin: .5rem 0; color: var(--color-text); }
    .empty-employees a { color: var(--color-primary); text-decoration: none; font-weight: 600; }
    .employees-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .emp-card { background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .emp-card.working { border-color: var(--color-primary); box-shadow: 0 0 0 1px rgba(212,175,55,.15); }
    .emp-card-header { display: flex; align-items: center; gap: 10px; }
    .emp-avatar { font-size: 1.6rem; }
    .emp-meta { flex: 1; display: flex; flex-direction: column; }
    .emp-name { font-weight: 700; font-size: .9rem; color: var(--color-text); }
    .emp-title { font-size: .75rem; color: var(--color-text-subtle); }
    .emp-status-badge { display: flex; align-items: center; gap: 4px; font-size: .68rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; }
    .emp-status-badge.idle { background: rgba(139,155,168,.1); color: #8b9ba8; }
    .emp-status-badge.working { background: rgba(34,197,94,.1); color: var(--color-success); }
    .emp-specialties { display: flex; flex-wrap: wrap; gap: 4px; }
    .emp-spec { font-size: .68rem; padding: 2px 8px; background: rgba(212,175,55,.08); border-radius: 100px; color: var(--color-primary); font-weight: 500; }
    .emp-current-task { display: flex; align-items: center; gap: 6px; font-size: .78rem; color: var(--color-text-subtle); padding: 6px 8px; background: rgba(34,197,94,.05); border-radius: var(--radius-sm); }
    .emp-current-task mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--color-success); }
    .emp-history-summary { display: flex; gap: 10px; font-size: .72rem; }
    .emp-stat { color: var(--color-text-subtle); }
    .emp-stat.completed { color: var(--color-success); }
    .emp-stat.failed { color: var(--color-danger); }
    .emp-actions { display: flex; align-items: center; justify-content: space-between; }
    .emp-last-active { font-size: .68rem; color: var(--color-text-subtle); }
    .emp-logs-btn { display: flex; align-items: center; gap: 4px; padding: 3px 10px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: none; color: var(--color-text-subtle); font-family: inherit; font-size: .7rem; cursor: pointer; }
    .emp-logs-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .emp-logs-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .emp-logs-panel { background: #0d1117; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); overflow: hidden; font-family: 'Fira Code', monospace; font-size: .72rem; }
    .emp-logs-filters { display: flex; gap: 3px; padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.05); flex-wrap: wrap; }
    .emp-filter { padding: 1px 6px; border: 1px solid var(--color-border-light); border-radius: 100px; background: none; color: var(--color-text-subtle); font-family: inherit; font-size: .62rem; cursor: pointer; }
    .emp-filter.active { border-color: var(--color-primary); color: var(--color-primary); }
    .emp-logs-list { max-height: 250px; overflow-y: auto; }
    .emp-logs-load, .emp-logs-empty { padding: 1rem; text-align: center; color: var(--color-text-subtle); }
    .emp-log-row { display: flex; gap: 6px; padding: 3px 8px; border-bottom: 1px solid rgba(255,255,255,.02); color: #c9d1d9; }
    .emp-log-row.task_complete, .emp-log-row.task_start { color: #22c55e; }
    .emp-log-row.task_fail, .emp-log-row.error { color: #f85149; }
    .emp-log-row.tool_use { color: #d4af37; }
    .elr-time { flex-shrink: 0; color: #8b949e; min-width: 80px; }
    .elr-cat { flex-shrink: 0; min-width: 80px; font-weight: 600; font-size: .65rem; }
    .elr-content { flex: 1; word-break: break-word; white-space: pre-wrap; }
    .emp-logs-pager { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 4px; border-top: 1px solid rgba(255,255,255,.05); }
    .emp-logs-pager button { padding: 2px 8px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: none; color: var(--color-text); cursor: pointer; font-size: .68rem; }
    .emp-logs-pager button:disabled { opacity: .3; }
    .emp-logs-pager span { font-size: .68rem; color: var(--color-text-subtle); }

    /* Apps Tab */
    .apps-tab { padding: 1rem 0; }
    .apps-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .apps-header h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1rem; font-weight: 700; color: var(--color-text); }
    .apps-header h3 mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary); }
    .apps-header-actions { display: flex; gap: 8px; }
    .btn-gold-sm {
      display: flex; align-items: center; gap: 4px;
      padding: 6px 14px; border: 1px solid var(--color-primary); border-radius: var(--radius-sm);
      background: none; color: var(--color-primary); font-family: inherit; font-size: .78rem; font-weight: 600; cursor: pointer;
    }
    .btn-gold-sm:hover { background: rgba(212,175,55,.08); }
    .btn-gold-sm:disabled { opacity: .4; cursor: not-allowed; }
    .btn-gold-sm mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .add-app-form {
      padding: 14px; margin-bottom: 1rem; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); background: var(--color-bg-card);
    }
    .form-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .form-row:last-child { margin-bottom: 0; }
    .form-input {
      flex: 1; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: .82rem; outline: none;
    }
    .form-input:focus { border-color: var(--color-primary); }
    .form-input::placeholder { color: var(--color-text-subtle); }
    .port-input { max-width: 90px; }
    .type-select { max-width: 130px; }

    .apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .app-card {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      background: var(--color-bg-card); overflow: hidden; transition: border-color .15s;
    }
    .app-card:hover { border-color: var(--color-primary); }
    .app-card.running { border-left: 3px solid #22c55e; }
    .app-card.error { border-left: 3px solid #f85149; }
    .app-card-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); }
    .app-type-badge {
      font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      padding: 2px 8px; border-radius: 100px; background: rgba(212,175,55,.1); color: var(--color-primary);
    }
    .app-type-badge[data-type="backend"] { background: rgba(96,165,250,.1); color: #60a5fa; }
    .app-type-badge[data-type="service"] { background: rgba(167,139,250,.1); color: #a78bfa; }
    .app-type-badge[data-type="database"] { background: rgba(251,146,60,.1); color: #fb923c; }
    .app-status { display: flex; align-items: center; gap: 4px; font-size: .72rem; font-weight: 600; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-running { color: #22c55e; }
    .status-running .status-dot { background: #22c55e; }
    .status-stopped { color: var(--color-text-subtle); }
    .status-stopped .status-dot { background: var(--color-text-subtle); }
    .status-building { color: #f59e0b; }
    .status-building .status-dot { background: #f59e0b; }
    .status-error { color: #f85149; }
    .status-error .status-dot { background: #f85149; }
    .app-card-body { padding: 14px; }
    .app-name { margin: 0 0 4px 0; font-size: .9rem; font-weight: 700; color: var(--color-text); }
    .app-desc { margin: 0 0 8px 0; font-size: .78rem; color: var(--color-text-subtle); }
    .app-meta { display: flex; gap: 12px; margin-bottom: 6px; }
    .app-port, .app-path { display: flex; align-items: center; gap: 3px; font-size: .72rem; color: var(--color-text-subtle); font-family: 'Fira Code', monospace; }
    .app-port mat-icon, .app-path mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .app-docker { display: flex; align-items: center; gap: 4px; font-size: .72rem; color: var(--color-text-subtle); margin-top: 4px; }
    .app-docker mat-icon { font-size: 14px; width: 14px; height: 14px; color: #60a5fa; }
    .app-test-instructions { margin-top: 8px; padding: 8px; border-radius: var(--radius-sm); background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.15); }
    .app-test-instructions.empty { background: rgba(255,255,255,.03); border-color: var(--color-border-light); display: flex; align-items: center; gap: 4px; font-size: .72rem; color: var(--color-text-subtle); }
    .app-test-instructions.empty mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .test-instructions-header { display: flex; align-items: center; gap: 4px; font-size: .72rem; font-weight: 600; color: #22c55e; margin-bottom: 4px; }
    .test-instructions-header mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .test-instructions-body { font-size: .75rem; color: var(--color-text-secondary); white-space: pre-wrap; line-height: 1.4; }
    .app-card-actions { display: flex; gap: 4px; padding: 8px 14px; border-top: 1px solid var(--color-border-light); }
    .app-action-btn {
      width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); cursor: pointer;
    }
    .app-action-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .app-action-btn.danger:hover { border-color: #f85149; color: #f85149; }
    .app-action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    /* Screenshot gallery */
    .app-screenshots { padding: 8px 14px; border-top: 1px solid var(--color-border-light); }
    .screenshots-header { display: flex; align-items: center; gap: 6px; font-size: .75rem; color: var(--color-text-subtle); margin-bottom: 6px; }
    .screenshots-header mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .screenshots-track { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; scroll-snap-type: x mandatory; }
    .screenshot-thumb {
      scroll-snap-align: start; flex-shrink: 0; position: relative; cursor: pointer;
      border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border-light); transition: border-color .2s, transform .2s;
    }
    .screenshot-thumb:hover { border-color: var(--color-primary); transform: scale(1.03); }
    .screenshot-thumb img { width: 140px; height: 90px; object-fit: cover; display: block; }
    .thumb-caption {
      position: absolute; bottom: 0; left: 0; right: 0; padding: 2px 6px;
      background: rgba(0,0,0,.6); color: #fff; font-size: .6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    /* Lightbox */
    .lightbox-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,.85); display: flex; flex-direction: column;
      align-items: center; justify-content: center; cursor: pointer;
    }
    .lightbox-overlay img { max-width: 90vw; max-height: 80vh; border-radius: 8px; cursor: default; }
    .lightbox-caption { color: #fff; font-size: .88rem; margin-top: .75rem; }
    .lightbox-close {
      position: absolute; top: 20px; right: 20px;
      border: none; background: rgba(255,255,255,.1); color: #fff;
      width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .lightbox-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      border: none; background: rgba(255,255,255,.15); color: #fff;
      width: 48px; height: 48px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .2s; z-index: 10;
    }
    .lightbox-nav:hover { background: rgba(255,255,255,.3); }
    .lightbox-nav mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .lb-prev { left: 24px; }
    .lb-next { right: 24px; }
    .lightbox-counter {
      position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,.8); font-size: .8rem; background: rgba(0,0,0,.4);
      padding: 4px 12px; border-radius: 12px;
    }

    .apps-empty {
      grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;
      padding: 3rem; text-align: center; color: var(--color-text-subtle);
    }
    .apps-empty mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: .3; margin-bottom: .5rem; }
    .apps-empty p { margin: .2rem 0; font-size: .88rem; }
    .apps-empty .hint { font-size: .78rem; opacity: .7; }
    .gateway-info {
      display: flex; align-items: center; gap: 12px; margin-top: 1rem; padding: 10px 16px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: var(--color-bg-card);
    }
    .gateway-label { display: flex; align-items: center; gap: 6px; font-size: .82rem; font-weight: 700; color: var(--color-primary); }
    .gateway-label mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .gateway-url { font-size: .78rem; font-family: 'Fira Code', monospace; color: var(--color-text); }
    .gateway-port { font-size: .72rem; color: var(--color-text-subtle); margin-left: auto; }

    .settings-tab { padding: 1rem 0; }
    .settings-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .settings-header h2 { margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--color-text); }
    .settings-save-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 20px; border: none; border-radius: var(--radius-sm);
      background: var(--color-primary); color: #0A0A0A;
      font-family: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    }
    .settings-save-btn:hover { opacity: 0.9; }
    .settings-save-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .settings-form { display: flex; flex-direction: column; gap: 0; }
    .settings-section {
      background: var(--color-bg-card); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem;
    }
    .settings-section h3 {
      display: flex; align-items: center; gap: 6px;
      margin: 0 0 1rem; font-size: 0.95rem; font-weight: 700; color: var(--color-text);
    }
    .settings-section h3 mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .settings-hint { font-size: 0.78rem; color: var(--color-text-subtle); margin: -0.5rem 0 0.75rem; }
    .settings-row {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px;
    }

    /* Folder Picker */
    .folder-picker { border: 1px solid var(--color-border-light); border-radius: var(--radius-md); background: var(--color-bg-card); overflow: hidden; margin-bottom: 8px; }
    .fp-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); }
    .fp-title { display: flex; align-items: center; gap: 6px; font-size: .88rem; font-weight: 700; color: var(--color-text); }
    .fp-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .fp-close { border: none; background: none; color: var(--color-text-subtle); cursor: pointer; display: flex; }
    .fp-close mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .fp-breadcrumb { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--color-bg); border-bottom: 1px solid var(--color-border-light); }
    .fp-up { display: flex; align-items: center; gap: 4px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-card); color: var(--color-text-subtle); font-family: inherit; font-size: .75rem; font-weight: 600; padding: 4px 8px; cursor: pointer; flex-shrink: 0; }
    .fp-up:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .fp-up mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .fp-current { font-size: .78rem; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fp-loading { padding: 1.5rem; text-align: center; display: flex; justify-content: center; }
    .fp-list { max-height: 240px; overflow-y: auto; }
    .fp-item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; cursor: pointer; transition: background .15s; }
    .fp-item:hover { background: var(--color-bg); }
    .fp-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; }
    .fp-name { flex: 1; font-size: .82rem; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fp-select-btn { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: none; color: var(--color-text-subtle); cursor: pointer; flex-shrink: 0; opacity: 0; transition: opacity .15s; }
    .fp-item:hover .fp-select-btn { opacity: 1; }
    .fp-select-btn:hover { border-color: var(--color-success); color: var(--color-success); background: rgba(34,197,94,.08); }
    .fp-select-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .fp-empty { padding: 1.5rem; text-align: center; font-size: .82rem; color: var(--color-text-subtle); font-style: italic; }
    .fp-footer { padding: 10px 14px; border-top: 1px solid var(--color-border-light); }
    .fp-use-current { display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 14px; border: none; border-radius: var(--radius-sm); background: var(--color-primary); color: #0A0A0A; font-family: inherit; font-size: .82rem; font-weight: 600; cursor: pointer; justify-content: center; }
    .fp-use-current:hover { opacity: .9; }
    .fp-use-current mat-icon { font-size: 18px; width: 18px; height: 18px; }

  `],
})
export class ProjectDetailComponent implements OnInit {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  project: Project | null = null;
  loading = true;
  isEditing = false;
  activeTab: 'overview' | 'marketing' | 'agent' | 'skills' | 'employees' | 'apps' | 'files' | 'settings' = 'overview';
  projectEmployees: any[] = [];

  // Apps tab
  showAddApp = false;
  newApp = { name: '', port: 3001, type: 'fullstack' as string, dockerService: '', description: '' };
  gatewayPort = 9080;

  empLogsOpen = '';
  empLogsFilter = '';
  empLogsLoading = false;
  empLogsList: any[] = [];
  empLogsPagination = { page: 1, pages: 1, total: 0 };
  form!: FormGroup;

  // Todos
  newTodoText = '';

  // Documents
  uploading = false;
  dragOver = false;

  // Folders
  editFolders: string[] = [];
  pickingFolder = false;

  // Presentation
  parsedPresentation: SafeHtml = '';

  // AI Chat
  userMessage = '';
  messages: ChatMessage[] = [];
  parsedMessages: SafeHtml[] = [];
  aiLoading = false;
  selectedModel: AIModel = (localStorage.getItem('ai-model') as AIModel) || 'claude-sonnet';
  availableModels: AIModelOption[] = [
    { id: 'claude-sonnet', name: 'Claude Sonnet', available: true },
    { id: 'gpt-4o', name: 'GPT-4o', available: false },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', available: false },
  ];

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
  ) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.projectService.getById(id).subscribe({
      next: (project) => {
        this.project = project;
        if (!this.project.todos) this.project.todos = [];
        if (!this.project.monetizationPlan) this.project.monetizationPlan = '';
        if (!this.project.presentation) this.project.presentation = '';
        this.updateParsedPresentation();
        this.initForm();
        this.loadCoachMessages();
        this.loadAllScreenshots();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
    this.projectService.getAvailableModels().subscribe({
      next: (models) => {
        this.availableModels = models;
        const saved = localStorage.getItem('ai-model') as AIModel;
        const savedAvailable = saved && models.find(m => m.id === saved && m.available);
        if (savedAvailable) {
          this.selectedModel = saved;
        } else {
          const first = models.find(m => m.available);
          if (first) this.selectedModel = first.id;
        }
      },
    });
  }

  private initForm(): void {
    if (!this.project) return;
    this.form = this.fb.group({
      name: [this.project.name],
      description: [this.project.description],
      backgroundImage: [this.project.backgroundImage],
      mrr: [this.project.mrr],
      clientCount: [this.project.clientCount],
      impact: [this.project.impact],
      niche: [this.project.niche],
      presentation: [this.project.presentation || ''],
      monetizationPlan: [this.project.monetizationPlan],
    });
    // Build editFolders: merge folders[] with legacy localPath
    const folders = [...(this.project.folders || [])];
    if (this.project.localPath && !folders.includes(this.project.localPath)) {
      folders.unshift(this.project.localPath);
    }
    this.editFolders = folders.length > 0 ? folders : [];
  }

  get weeklyHours(): number {
    const s = this.project?.schedule;
    if (!s) return 0;
    return (s.monday || 0) + (s.tuesday || 0) + (s.wednesday || 0)
      + (s.thursday || 0) + (s.friday || 0) + (s.saturday || 0) + (s.sunday || 0);
  }

  get doneCount(): number {
    return this.project?.todos?.filter(t => t.done).length || 0;
  }

  get progressPercent(): number {
    const total = this.project?.todos?.length || 0;
    if (total === 0) return 0;
    return (this.doneCount / total) * 100;
  }

  // Employees
  loadEmployees(): void {
    if (!this.project?._id) return;
    this.employeeService.getByProject(this.project._id).subscribe({
      next: (emps) => { this.projectEmployees = emps; },
      error: () => { this.projectEmployees = []; },
    });
  }

  // Applications
  addApplication(): void {
    if (!this.project?._id || !this.newApp.name || !this.newApp.port) return;
    this.projectService.addApplication(this.project._id, this.newApp).subscribe({
      next: (app) => {
        if (!this.project!.applications) this.project!.applications = [];
        this.project!.applications.push(app);
        this.newApp = { name: '', port: 3001, type: 'fullstack', dockerService: '', description: '' };
        this.showAddApp = false;
        this.snackBar.open('Application added', 'Close', { duration: 2000 });
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to add app', 'Close', { duration: 3000 }),
    });
  }

  removeApplication(appName: string): void {
    if (!this.project?._id || !confirm(`Remove ${appName}?`)) return;
    this.projectService.removeApplication(this.project._id, appName).subscribe({
      next: () => {
        this.project!.applications = this.project!.applications.filter(a => a.name !== appName);
        this.snackBar.open('Application removed', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to remove app', 'Close', { duration: 3000 }),
    });
  }

  toggleAppStatus(app: any): void {
    if (!this.project?._id) return;
    const newStatus = app.status === 'running' ? 'stopped' : 'running';
    this.projectService.updateApplication(this.project._id, app.name, { status: newStatus }).subscribe({
      next: () => { app.status = newStatus; },
      error: () => this.snackBar.open('Failed to update status', 'Close', { duration: 3000 }),
    });
  }

  openAppUrl(app: any): void {
    const url = `https://nonshattering-adelaida-ponchoed.ngrok-free.dev${app.basePath}/`;
    window.open(url, '_blank');
  }

  // Screenshot gallery
  lightboxUrl = '';
  lightboxCaption = '';
  lightboxScreenshots: any[] = [];
  lightboxIndex = 0;
  lightboxAppName = '';
  appScreenshots: Record<string, any[]> = {};

  loadAllScreenshots(): void {
    if (!this.project?._id) return;
    for (const app of (this.project.applications || [])) {
      this.projectService.listScreenshots(this.project._id, app.name).subscribe({
        next: (list) => { this.appScreenshots[app.name] = list; },
        error: () => {},
      });
    }
  }

  getScreenshotUrl(appName: string, filename: string): string {
    const token = this.authService.getToken();
    return `${environment.apiUrl}/companies/${this.project?._id}/applications/${encodeURIComponent(appName)}/screenshots/${encodeURIComponent(filename)}?token=${token}`;
  }

  openLightbox(app: any, ss: any, index: number): void {
    this.lightboxAppName = app.name;
    this.lightboxScreenshots = this.appScreenshots[app.name] || [];
    this.lightboxIndex = index;
    this.lightboxUrl = this.getScreenshotUrl(app.name, ss.filename);
    this.lightboxCaption = ss.caption || ss.originalName;
  }

  navigateLightbox(delta: number, event: Event): void {
    event.stopPropagation();
    const newIdx = this.lightboxIndex + delta;
    if (newIdx < 0 || newIdx >= this.lightboxScreenshots.length) return;
    this.lightboxIndex = newIdx;
    const ss = this.lightboxScreenshots[newIdx];
    this.lightboxUrl = this.getScreenshotUrl(this.lightboxAppName, ss.filename);
    this.lightboxCaption = ss.caption || ss.originalName;
  }

  countTasks(emp: any, status: string): number {
    return (emp.taskHistory || []).filter((t: any) => t.status === status).length;
  }

  toggleEmpLogs(emp: any): void {
    if (this.empLogsOpen === emp._id) { this.empLogsOpen = ''; return; }
    this.empLogsOpen = emp._id;
    this.empLogsFilter = '';
    this.loadEmpLogs(emp);
  }

  loadEmpLogs(emp: any): void {
    this.loadEmpLogsPage(emp, 1);
  }

  loadEmpLogsPage(emp: any, page: number): void {
    this.empLogsLoading = true;
    this.employeeService.getLogs(emp._id, page, 50, this.empLogsFilter || undefined).subscribe({
      next: (res) => {
        this.empLogsList = res.logs;
        this.empLogsPagination = { page: res.page, pages: res.pages, total: res.total };
        this.empLogsLoading = false;
      },
      error: () => { this.empLogsList = []; this.empLogsLoading = false; },
    });
  }

  // Settings
  openSettings(): void {
    this.initForm();
    this.activeTab = 'settings';
  }

  saveSettings(): void {
    if (!this.project?._id) return;
    const formValue = this.form.value;
    const filteredFolders = this.editFolders.filter(p => p.trim());
    const updateData = { ...formValue, folders: filteredFolders, localPath: filteredFolders[0] || '' };
    Object.assign(this.project, updateData);
    this.projectService.update(this.project._id, updateData).subscribe({
      next: (updated) => {
        this.project = updated;
        if (!this.project.todos) this.project.todos = [];
        this.updateParsedPresentation();
        this.snackBar.open('Company updated', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update company', 'Close', { duration: 3000 }),
    });
  }

  toggleHolding(): void {
    if (!this.project?._id) return;
    const newValue = !this.project.onHolding;
    this.projectService.update(this.project._id, { onHolding: newValue }).subscribe({
      next: (updated) => {
        this.project = updated;
        this.snackBar.open(newValue ? 'Company on holding' : 'Company reactivated', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update', 'Close', { duration: 3000 }),
    });
  }

  // Todos
  addTodo(): void {
    const text = this.newTodoText.trim();
    if (!text || !this.project?._id) return;
    this.project.todos.push({ text, done: false });
    this.newTodoText = '';
    this.saveTodos();
  }

  toggleTodo(index: number): void {
    if (!this.project) return;
    this.project.todos[index].done = !this.project.todos[index].done;
    this.saveTodos();
  }

  removeTodo(index: number): void {
    if (!this.project) return;
    this.project.todos.splice(index, 1);
    this.saveTodos();
  }

  private saveTodos(): void {
    if (!this.project?._id) return;
    this.projectService.update(this.project._id, { todos: [...this.project.todos] }).subscribe({
      error: () => this.snackBar.open('Failed to save todos', 'Close', { duration: 3000 }),
    });
  }

  // File upload
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files) this.uploadFiles(Array.from(files));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadFiles(Array.from(input.files));
    input.value = '';
  }

  private uploadFiles(files: File[]): void {
    if (!this.project?._id || files.length === 0) return;
    this.uploading = true;
    let completed = 0;
    for (const file of files) {
      this.projectService.uploadDocument(this.project._id, file).subscribe({
        next: (project) => {
          this.project = project;
          completed++;
          if (completed === files.length) {
            this.uploading = false;
            this.snackBar.open(`${files.length} file(s) uploaded`, 'Close', { duration: 2000 });
          }
        },
        error: () => {
          completed++;
          if (completed === files.length) this.uploading = false;
          this.snackBar.open(`Failed to upload ${file.name}`, 'Close', { duration: 3000 });
        },
      });
    }
  }

  deleteDoc(docId: string): void {
    if (!this.project?._id) return;
    this.projectService.deleteDocument(this.project._id, docId).subscribe({
      next: (project) => {
        this.project = project;
        this.snackBar.open('Document deleted', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to delete document', 'Close', { duration: 3000 }),
    });
  }

  getDownloadUrl(docId: string): string {
    return this.projectService.getDocumentDownloadUrl(this.project!._id!, docId);
  }

  getFileIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/')) return 'description';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
    return 'insert_drive_file';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Folders
  removeFolder(index: number): void {
    this.editFolders.splice(index, 1);
  }

  updateFolder(index: number, event: Event): void {
    this.editFolders[index] = (event.target as HTMLInputElement).value;
  }

  pickFolder(index: number): void {
    this.pickingFolder = true;
    this.projectService.pickFolder().subscribe({
      next: (res) => {
        this.pickingFolder = false;
        if (res.path) this.editFolders[index] = res.path;
      },
      error: () => { this.pickingFolder = false; },
    });
  }

  pickAndAddFolder(): void {
    this.pickingFolder = true;
    this.projectService.pickFolder().subscribe({
      next: (res) => {
        this.pickingFolder = false;
        if (res.path) this.editFolders.push(res.path);
      },
      error: () => { this.pickingFolder = false; },
    });
  }

  private updateParsedPresentation(): void {
    if (this.project?.presentation) {
      this.parsedPresentation = this.parseMarkdown(this.project.presentation);
    } else {
      this.parsedPresentation = '';
    }
  }

  // AI Coach
  private parseMarkdown(content: string): SafeHtml {
    const html = marked.parse(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private loadCoachMessages(): void {
    if (!this.project?.coachMessages?.length) return;
    this.messages = this.project.coachMessages.map(m => ({ ...m }));
    this.parsedMessages = this.messages.map(m =>
      m.role === 'assistant' ? this.parseMarkdown(this.stripActionBlocks(m.content)) : ''
    );
    this.scrollChat();
  }

  private stripActionBlocks(content: string): string {
    return content.replace(/```coach-action\n[\s\S]*?\n```/g, '').trim();
  }

  private extractActions(content: string): CoachAction[] {
    const actions: CoachAction[] = [];
    const regex = /```coach-action\n([\s\S]*?)\n```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        const data = JSON.parse(match[1].trim());
        actions.push({
          type: data.type,
          items: data.items,
          content: data.content,
          field: data.field,
          value: data.value,
          status: 'pending',
        });
      } catch { /* skip malformed action blocks */ }
    }
    return actions;
  }

  selectModel(model: AIModel): void {
    this.selectedModel = model;
    localStorage.setItem('ai-model', model);
  }

  sendSuggestion(text: string): void {
    this.userMessage = text;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.userMessage.trim();
    if (!text || !this.project?._id || this.aiLoading) return;

    this.messages.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
    this.parsedMessages.push('');
    this.userMessage = '';
    this.aiLoading = true;
    this.scrollChat();

    // Send clean messages to AI (role + content only)
    const apiMessages = this.messages.map(m => ({ role: m.role, content: m.content }));

    this.projectService.aiCoach(this.project._id, apiMessages, this.selectedModel).subscribe({
      next: (res) => {
        const actions = this.extractActions(res.response);
        const msg: ChatMessage = {
          role: 'assistant',
          content: res.response,
          actions: actions.length > 0 ? actions : undefined,
          timestamp: new Date().toISOString(),
        };
        this.messages.push(msg);
        this.parsedMessages.push(this.parseMarkdown(this.stripActionBlocks(res.response)));
        this.aiLoading = false;
        this.scrollChat();
        this.saveCoachMessages();
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'AI coaching failed. Check your API key configuration.';
        this.messages.push({ role: 'assistant', content: errorMsg, timestamp: new Date().toISOString() });
        this.parsedMessages.push(this.parseMarkdown(errorMsg));
        this.aiLoading = false;
        this.scrollChat();
        this.saveCoachMessages();
      },
    });
  }

  private saveCoachMessages(): void {
    if (!this.project?._id) return;
    this.projectService.saveCoachMessages(this.project._id, this.messages).subscribe();
  }

  clearChat(): void {
    if (!this.project?._id) return;
    this.messages = [];
    this.parsedMessages = [];
    this.projectService.clearCoachMessages(this.project._id).subscribe();
  }

  getActionIcon(type: string): string {
    switch (type) {
      case 'add_todos': return 'checklist';
      case 'update_presentation': return 'article';
      case 'update_field': return 'edit_note';
      default: return 'auto_fix_high';
    }
  }

  getActionLabel(action: CoachAction): string {
    switch (action.type) {
      case 'add_todos': return `Add ${action.items?.length || 0} item(s) to TODO list`;
      case 'update_presentation': return 'Update company presentation';
      case 'update_field': return `Update ${action.field}`;
      default: return 'Suggested action';
    }
  }

  applyAction(msgIndex: number, actionIndex: number): void {
    const action = this.messages[msgIndex].actions?.[actionIndex];
    if (!action || !this.project?._id) return;

    switch (action.type) {
      case 'add_todos':
        if (action.items) {
          for (const item of action.items) {
            this.project.todos.push({ text: item, done: false });
          }
          this.saveTodos();
        }
        break;
      case 'update_presentation':
        if (action.content) {
          this.project.presentation = action.content;
          this.updateParsedPresentation();
          this.projectService.update(this.project._id, { presentation: action.content }).subscribe({
            next: () => this.snackBar.open('Presentation updated', 'Close', { duration: 2000 }),
            error: () => this.snackBar.open('Failed to update presentation', 'Close', { duration: 3000 }),
          });
        }
        break;
      case 'update_field':
        if (action.field && action.value !== undefined) {
          (this.project as any)[action.field] = action.value;
          this.projectService.update(this.project._id, { [action.field]: action.value }).subscribe({
            next: () => this.snackBar.open(`${action.field} updated`, 'Close', { duration: 2000 }),
            error: () => this.snackBar.open(`Failed to update ${action.field}`, 'Close', { duration: 3000 }),
          });
        }
        break;
    }

    action.status = 'accepted';
    this.saveCoachMessages();
    this.snackBar.open('Action applied!', 'Close', { duration: 2000 });
  }

  dismissAction(msgIndex: number, actionIndex: number): void {
    const action = this.messages[msgIndex].actions?.[actionIndex];
    if (!action) return;
    action.status = 'rejected';
    this.saveCoachMessages();
  }

  private scrollChat(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
