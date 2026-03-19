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
          <h2>Project not found</h2>
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
          <button class="tab" [class.active]="activeTab === 'files'" (click)="activeTab = 'files'"><mat-icon>folder_open</mat-icon> Files</button>
          <button class="tab" [class.active]="activeTab === 'settings'" (click)="openSettings()"><mat-icon>settings</mat-icon> Settings</button>
        </div>

        @if (activeTab === 'settings') {
          <div class="settings-tab">
            <div class="settings-header">
              <h2>Project Settings</h2>
              <button class="settings-save-btn" (click)="saveSettings()">
                <mat-icon>check</mat-icon> Save Changes
              </button>
            </div>
            <form [formGroup]="form" class="settings-form">
              <div class="settings-section">
                <h3><mat-icon>info</mat-icon> General</h3>
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>Project Name</mat-label>
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
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>Background Image URL</mat-label>
                  <input matInput formControlName="backgroundImage" />
                </mat-form-field>
                <mat-form-field class="full-width" appearance="outline">
                  <mat-label>Monetization Plan</mat-label>
                  <textarea matInput formControlName="monetizationPlan" rows="3"
                    placeholder="How will this project generate revenue?"></textarea>
                </mat-form-field>
              </div>

              <div class="settings-section">
                <h3><mat-icon>snippet_folder</mat-icon> Project Folders</h3>
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
                  placeholder="# My Project&#10;&#10;Describe your project, goals, target audience, tech stack, unique value proposition, etc.&#10;&#10;This context will be available to all AI tools."></textarea>
              </div>
            </form>
          </div>
        } @else if (activeTab === 'marketing') {
          <app-marketing-research [project]="project" [availableModels]="availableModels"></app-marketing-research>
        } @else if (activeTab === 'agent') {
          <app-agent-terminal [project]="project"></app-agent-terminal>
        } @else if (activeTab === 'skills') {
          <app-skills-panel [project]="project" [availableModels]="availableModels"></app-skills-panel>
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
                  <h3>Project Coach</h3>
                  <p>Ask me anything about growing this project. I can also suggest changes to your todos, presentation, and more.</p>
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
  activeTab: 'overview' | 'marketing' | 'agent' | 'skills' | 'files' | 'settings' = 'overview';
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
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
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
        this.snackBar.open('Project updated', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update project', 'Close', { duration: 3000 }),
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
      case 'update_presentation': return 'Update project presentation';
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
