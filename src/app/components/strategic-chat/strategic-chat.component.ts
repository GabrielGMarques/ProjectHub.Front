import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { StrategicChatService, StrategicMessage, StrategicAction } from '../../services/strategic-chat.service';
import { ProjectService } from '../../services/project.service';
import { AIModel, AIModelOption, Project } from '../../models/project.model';
import { marked } from 'marked';

@Component({
  selector: 'app-strategic-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="strategic-chat" [class.expanded]="expanded">
      <!-- Header -->
      <div class="chat-header" (click)="expanded = !expanded">
        <div class="chat-header-left">
          <mat-icon class="chat-icon">psychology</mat-icon>
          <span class="chat-title">Strategic Advisor</span>
          @if (activeAgentCount > 0) {
            <span class="agent-badge">{{ activeAgentCount }} agent{{ activeAgentCount > 1 ? 's' : '' }}</span>
          }
        </div>
        <div class="chat-header-right">
          @if (expanded) {
            <button class="header-btn" (click)="clearChat(); $event.stopPropagation()" matTooltip="Clear chat">
              <mat-icon>delete_outline</mat-icon>
            </button>
            <button class="header-btn" (click)="stopAllAgents(); $event.stopPropagation()" matTooltip="Stop all agents" [class.hidden]="activeAgentCount === 0">
              <mat-icon>stop_circle</mat-icon>
            </button>
          }
          <mat-icon class="expand-icon">{{ expanded ? 'expand_more' : 'expand_less' }}</mat-icon>
        </div>
      </div>

      @if (expanded) {
        <!-- Model selector -->
        <div class="model-row">
          @for (m of availableModels; track m.id) {
            <button
              class="model-btn"
              [class.active]="selectedModel === m.id"
              [class.unavailable]="!m.available"
              (click)="m.available && selectModel(m.id)"
              [matTooltip]="m.available ? m.name : m.name + ' (not configured)'"
            >
              {{ m.name }}
            </button>
          }
        </div>

        <!-- Messages -->
        <div class="messages-container" #messagesContainer>
          @if (messages.length === 0 && !loading) {
            <div class="empty-chat">
              <mat-icon>psychology</mat-icon>
              <p>Ask me about priorities, time allocation, or how to grow your companies.</p>
              <div class="suggestions">
                <button class="suggestion-btn" (click)="sendSuggestion('What should I prioritize this week?')">
                  <mat-icon>trending_up</mat-icon> What to prioritize?
                </button>
                <button class="suggestion-btn" (click)="sendSuggestion('Am I spreading my time too thin? Analyze my time allocation.')">
                  <mat-icon>schedule</mat-icon> Time analysis
                </button>
                <button class="suggestion-btn" (click)="sendSuggestion('Which company has the highest ROI potential?')">
                  <mat-icon>insights</mat-icon> Best ROI company
                </button>
                <button class="suggestion-btn" (click)="sendSuggestion('Create a todo list of the most impactful next steps across all companies.')">
                  <mat-icon>checklist</mat-icon> Action items
                </button>
              </div>
            </div>
          }

          @for (msg of messages; track $index; let i = $index) {
            <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
              @if (msg.role === 'user') {
                <div class="msg-content user-msg">{{ msg.content }}</div>
              } @else {
                <div class="msg-content ai-msg" [innerHTML]="parsedMessages[i]"></div>
                @if (msg.actions?.length) {
                  <div class="actions-list">
                    @for (action of msg.actions; track $index; let ai = $index) {
                      <div class="action-card" [class.accepted]="action.status === 'accepted'" [class.rejected]="action.status === 'rejected'">
                        <div class="action-info">
                          <mat-icon class="action-icon">{{ getActionIcon(action) }}</mat-icon>
                          <span class="action-label">{{ getActionLabel(action) }}</span>
                        </div>
                        @if (action.status === 'pending') {
                          <div class="action-buttons">
                            @if (action.type === 'run_agent') {
                              <button class="action-btn run" (click)="runAgentAction(i, ai)" [disabled]="agentRunning">
                                <mat-icon>play_arrow</mat-icon> Run Agent
                              </button>
                            } @else {
                              <button class="action-btn apply" (click)="applyAction(i, ai)">
                                <mat-icon>check</mat-icon> Apply
                              </button>
                            }
                            <button class="action-btn dismiss" (click)="dismissAction(i, ai)">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                        } @else {
                          <span class="action-status">{{ action.status }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }

          @if (loading) {
            <div class="message assistant">
              <div class="msg-content ai-msg loading-msg">
                <mat-spinner diameter="18"></mat-spinner>
                <span>Thinking...</span>
              </div>
            </div>
          }

          @if (agentRunning) {
            <div class="agent-output">
              <div class="agent-header">
                <mat-icon class="pulse">terminal</mat-icon>
                <span>Agent running on <strong>{{ agentProjectName }}</strong></span>
                <button class="agent-stop-btn" (click)="stopCurrentAgent()" matTooltip="Stop">
                  <mat-icon>stop</mat-icon>
                </button>
              </div>
              <div class="agent-log" #agentLog>
                @for (entry of agentEntries; track $index) {
                  <div class="agent-entry" [class]="entry.type">
                    @if (entry.type === 'tool_use') {
                      <span class="tool-name">{{ entry.tool }}</span>
                    }
                    <span>{{ entry.content }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Input -->
        <div class="input-row">
          <textarea
            class="chat-input"
            [(ngModel)]="userMessage"
            placeholder="Ask about your companies..."
            (keydown)="onKeyDown($event)"
            rows="1"
          ></textarea>
          <button class="send-btn" (click)="sendMessage()" [disabled]="!userMessage.trim() || loading">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .strategic-chat {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 80px;
      transition: max-height 0.3s ease;
    }
    .strategic-chat.expanded {
      max-height: 700px;
    }

    .chat-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; cursor: pointer;
      background: rgba(212, 175, 55, 0.06);
      border-bottom: 1px solid var(--color-border-light);
      user-select: none;
    }
    .chat-header:hover { background: rgba(212, 175, 55, 0.1); }
    .chat-header-left { display: flex; align-items: center; gap: 10px; }
    .chat-header-right { display: flex; align-items: center; gap: 4px; }
    .chat-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; }
    .chat-title { font-weight: 700; font-size: 0.95rem; color: var(--color-text); }
    .expand-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-text-subtle); }
    .agent-badge {
      font-size: 0.68rem; font-weight: 700;
      background: #22c55e20; color: #22c55e;
      padding: 2px 8px; border-radius: 10px;
    }
    .header-btn {
      border: none; background: none; cursor: pointer;
      color: var(--color-text-subtle); display: flex; padding: 4px;
      border-radius: var(--radius-sm);
    }
    .header-btn:hover { color: var(--color-primary); background: rgba(212,175,55,0.08); }
    .header-btn.hidden { display: none; }
    .header-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Model selector */
    .model-row {
      display: flex; gap: 4px; padding: 8px 12px;
      border-bottom: 1px solid var(--color-border-light);
    }
    .model-btn {
      font-family: inherit; font-size: 0.72rem; font-weight: 600;
      padding: 4px 12px; border: 1px solid var(--color-border);
      border-radius: 100px; background: none; color: var(--color-text-subtle);
      cursor: pointer; transition: all 0.15s;
    }
    .model-btn.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(212,175,55,0.08); }
    .model-btn.unavailable { opacity: 0.35; cursor: not-allowed; }

    /* Messages */
    .messages-container {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 12px;
      min-height: 200px; max-height: 480px;
    }
    .empty-chat {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 2rem 1rem; text-align: center; color: var(--color-text-subtle);
    }
    .empty-chat mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.3; }
    .empty-chat p { font-size: 0.85rem; margin: 0; }
    .suggestions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 8px; }
    .suggestion-btn {
      display: flex; align-items: center; gap: 4px;
      font-family: inherit; font-size: 0.75rem; font-weight: 600;
      padding: 6px 12px; border: 1px solid var(--color-border);
      border-radius: 100px; background: none; color: var(--color-text);
      cursor: pointer; transition: all 0.15s;
    }
    .suggestion-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .suggestion-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .message { display: flex; }
    .message.user { justify-content: flex-end; }
    .msg-content {
      max-width: 85%; padding: 10px 14px; border-radius: var(--radius-md);
      font-size: 0.85rem; line-height: 1.6;
    }
    .user-msg {
      background: var(--color-primary); color: #0A0A0A;
      border-bottom-right-radius: 4px; font-weight: 500;
      white-space: pre-wrap;
    }
    .ai-msg {
      background: var(--color-bg); color: var(--color-text);
      border: 1px solid var(--color-border-light);
      border-bottom-left-radius: 4px;
    }
    .ai-msg :first-child { margin-top: 0; }
    .ai-msg :last-child { margin-bottom: 0; }
    .loading-msg { display: flex; align-items: center; gap: 8px; color: var(--color-text-subtle); }

    /* Actions */
    .actions-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; max-width: 85%; }
    .action-card {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 8px 12px; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm); background: var(--color-bg);
      transition: all 0.15s;
    }
    .action-card.accepted { border-color: #22c55e40; background: #22c55e08; }
    .action-card.rejected { opacity: 0.5; }
    .action-info { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; }
    .action-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; }
    .action-label { font-size: 0.78rem; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .action-buttons { display: flex; gap: 4px; flex-shrink: 0; }
    .action-btn {
      display: flex; align-items: center; gap: 3px;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; font-family: inherit; font-size: 0.72rem; font-weight: 600;
      padding: 4px 8px; cursor: pointer; color: var(--color-text-subtle);
      transition: all 0.15s;
    }
    .action-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .action-btn.apply { border-color: #22c55e40; color: #22c55e; }
    .action-btn.apply:hover { background: #22c55e10; border-color: #22c55e; }
    .action-btn.run { border-color: #3b82f640; color: #3b82f6; }
    .action-btn.run:hover:not(:disabled) { background: #3b82f610; border-color: #3b82f6; }
    .action-btn.run:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-btn.dismiss:hover { border-color: #ef4444; color: #ef4444; }
    .action-status { font-size: 0.72rem; font-weight: 700; color: var(--color-text-subtle); text-transform: capitalize; }

    /* Agent output */
    .agent-output {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      overflow: hidden; background: var(--color-bg);
    }
    .agent-header {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; background: rgba(59,130,246,0.08);
      border-bottom: 1px solid var(--color-border-light);
      font-size: 0.82rem; font-weight: 600; color: var(--color-text);
    }
    .agent-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: #3b82f6; }
    .pulse { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .agent-stop-btn {
      margin-left: auto; border: 1px solid #ef444440; border-radius: var(--radius-sm);
      background: none; color: #ef4444; cursor: pointer; padding: 2px; display: flex;
    }
    .agent-stop-btn:hover { background: #ef444410; }
    .agent-stop-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .agent-log {
      max-height: 200px; overflow-y: auto; padding: 8px 12px;
      font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.75rem;
      line-height: 1.5; color: var(--color-text-subtle);
    }
    .agent-entry { white-space: pre-wrap; word-break: break-all; }
    .agent-entry.text { color: var(--color-text); }
    .agent-entry.tool_use { color: #3b82f6; }
    .agent-entry.tool_result { color: var(--color-text-subtle); opacity: 0.7; }
    .agent-entry.error { color: #ef4444; }
    .tool-name {
      font-weight: 700; margin-right: 6px;
      padding: 1px 6px; background: #3b82f615; border-radius: 3px;
    }

    /* Input */
    .input-row {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 10px 12px; border-top: 1px solid var(--color-border-light);
    }
    .chat-input {
      flex: 1; resize: none; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); padding: 10px 12px;
      background: var(--color-bg); color: var(--color-text);
      font-family: inherit; font-size: 0.85rem; outline: none;
      min-height: 20px; max-height: 80px;
    }
    .chat-input::placeholder { color: var(--color-text-subtle); }
    .chat-input:focus { border-color: var(--color-primary); }
    .send-btn {
      width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
      border: none; border-radius: var(--radius-sm); background: var(--color-primary);
      color: #0A0A0A; cursor: pointer; flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) { opacity: 0.9; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `],
})
export class StrategicChatComponent implements OnInit, OnDestroy {
  @Input() projects: Project[] = [];
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('agentLog') agentLog!: ElementRef<HTMLDivElement>;

  expanded = false;
  messages: StrategicMessage[] = [];
  parsedMessages: SafeHtml[] = [];
  userMessage = '';
  loading = false;
  selectedModel: AIModel = 'claude-sonnet';
  availableModels: AIModelOption[] = [];

  // Agent state
  agentRunning = false;
  agentProjectName = '';
  agentEntries: { type: string; content: string; tool?: string }[] = [];
  activeAgentCount = 0;

  private agentSub: Subscription | null = null;

  constructor(
    private strategicChatService: StrategicChatService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const savedModel = localStorage.getItem('ai-model') as AIModel;
    if (savedModel) this.selectedModel = savedModel;

    this.projectService.getAvailableModels().subscribe({
      next: (models) => this.availableModels = models,
    });

    this.strategicChatService.getMessages().subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.parsedMessages = msgs.map(m =>
          m.role === 'assistant' ? this.parseMarkdown(this.stripActionBlocks(m.content)) : '' as any
        );
      },
    });

    this.pollActiveAgents();
  }

  ngOnDestroy(): void {
    this.agentSub?.unsubscribe();
  }

  selectModel(model: AIModel): void {
    this.selectedModel = model;
    localStorage.setItem('ai-model', model);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendSuggestion(text: string): void {
    this.userMessage = text;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.userMessage.trim();
    if (!text || this.loading) return;

    this.messages.push({ role: 'user', content: text });
    this.parsedMessages.push('' as any);
    this.userMessage = '';
    this.loading = true;
    this.scrollChat();

    const apiMessages = this.messages.map(m => ({ role: m.role, content: m.content }));

    this.strategicChatService.chat(apiMessages, this.selectedModel).subscribe({
      next: (res) => {
        const actions = this.extractActions(res.response);
        const msg: StrategicMessage = {
          role: 'assistant',
          content: res.response,
          actions: actions.length > 0 ? actions : undefined,
        };
        this.messages.push(msg);
        this.parsedMessages.push(this.parseMarkdown(this.stripActionBlocks(res.response)));
        this.loading = false;
        this.scrollChat();
        this.saveMessages();
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Strategic chat failed. Check AI configuration.';
        this.messages.push({ role: 'assistant', content: errorMsg });
        this.parsedMessages.push(this.parseMarkdown(errorMsg));
        this.loading = false;
        this.scrollChat();
        this.saveMessages();
      },
    });
  }

  clearChat(): void {
    this.messages = [];
    this.parsedMessages = [];
    this.strategicChatService.clearMessages().subscribe();
  }

  // --- Actions ---

  applyAction(msgIndex: number, actionIndex: number): void {
    const action = this.messages[msgIndex].actions?.[actionIndex];
    if (!action) return;

    this.strategicChatService.executeAction(action).subscribe({
      next: (res) => {
        action.status = 'accepted';
        this.snackBar.open(res.message || 'Action applied', 'Close', { duration: 3000 });
        this.saveMessages();
        // Refresh projects if data changed
        if (['add_todos', 'update_field', 'create_project', 'prioritize'].includes(action.type)) {
          this.refreshProjects();
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.error || 'Failed to apply action', 'Close', { duration: 3000 });
      },
    });
  }

  dismissAction(msgIndex: number, actionIndex: number): void {
    const action = this.messages[msgIndex].actions?.[actionIndex];
    if (!action) return;
    action.status = 'rejected';
    this.saveMessages();
  }

  runAgentAction(msgIndex: number, actionIndex: number): void {
    const action = this.messages[msgIndex].actions?.[actionIndex];
    if (!action || action.type !== 'run_agent') return;

    const project = this.projects.find(p => p._id === action.projectId);
    this.agentProjectName = project?.name || 'Unknown';
    this.agentRunning = true;
    this.agentEntries = [];
    action.status = 'accepted';
    this.saveMessages();
    this.scrollChat();

    this.agentSub = this.strategicChatService.executeAgentAction(action).subscribe({
      next: (event) => {
        if (event.type === 'text' && event.content) {
          this.agentEntries.push({ type: 'text', content: event.content });
        } else if (event.type === 'tool_use') {
          this.agentEntries.push({ type: 'tool_use', content: event.content || '', tool: event.tool });
        } else if (event.type === 'tool_result' && event.content) {
          const truncated = event.content.length > 300 ? event.content.substring(0, 300) + '...' : event.content;
          this.agentEntries.push({ type: 'tool_result', content: truncated });
        } else if (event.type === 'error') {
          this.agentEntries.push({ type: 'error', content: event.content || 'Error' });
        }
        this.scrollAgentLog();
      },
      complete: () => {
        this.agentRunning = false;
        this.agentEntries.push({ type: 'text', content: '--- Agent finished ---' });
        this.scrollAgentLog();
        this.pollActiveAgents();
        this.refreshProjects();
      },
      error: () => {
        this.agentRunning = false;
        this.agentEntries.push({ type: 'error', content: 'Agent connection lost' });
      },
    });
  }

  stopCurrentAgent(): void {
    this.agentSub?.unsubscribe();
    this.agentRunning = false;
  }

  stopAllAgents(): void {
    this.strategicChatService.stopAllSessions().subscribe({
      next: (res) => {
        this.snackBar.open(res.message || 'All agents stopped', 'Close', { duration: 3000 });
        this.activeAgentCount = 0;
      },
    });
  }

  getActionIcon(action: StrategicAction): string {
    switch (action.type) {
      case 'add_todos': return 'checklist';
      case 'update_field': return 'edit_note';
      case 'create_project': return 'add_circle';
      case 'run_agent': return 'terminal';
      case 'prioritize': return 'sort';
      default: return 'auto_fix_high';
    }
  }

  getActionLabel(action: StrategicAction): string {
    const projectName = this.getProjectName(action.projectId);
    switch (action.type) {
      case 'add_todos': return `Add ${action.items?.length || 0} todo(s) to ${projectName}`;
      case 'update_field': return `Update ${action.field} on ${projectName}`;
      case 'create_project': return `Create company: ${action.projectName}`;
      case 'run_agent': return `Run agent on ${projectName}: ${(action.prompt || '').substring(0, 60)}...`;
      case 'prioritize': return `Reorder ${action.projectIds?.length || 0} companies`;
      default: return 'Action';
    }
  }

  // --- Private helpers ---

  private getProjectName(id?: string): string {
    if (!id) return 'Unknown';
    return this.projects.find(p => p._id === id)?.name || 'Unknown';
  }

  private extractActions(content: string): StrategicAction[] {
    const actions: StrategicAction[] = [];
    const regex = /```strategic-action\n([\s\S]*?)\n```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        const data = JSON.parse(match[1].trim());
        actions.push({
          type: data.type,
          projectId: data.projectId,
          projectName: data.projectName,
          items: data.items,
          field: data.field,
          value: data.value,
          prompt: data.prompt,
          projectIds: data.projectIds,
          status: 'pending',
        });
      } catch {}
    }
    return actions;
  }

  private stripActionBlocks(content: string): string {
    return content.replace(/```strategic-action\n[\s\S]*?\n```/g, '').trim();
  }

  private parseMarkdown(text: string): SafeHtml {
    const html = marked.parse(text, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private saveMessages(): void {
    this.strategicChatService.saveMessages(this.messages).subscribe();
  }

  private scrollChat(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  private scrollAgentLog(): void {
    setTimeout(() => {
      if (this.agentLog) {
        this.agentLog.nativeElement.scrollTop = this.agentLog.nativeElement.scrollHeight;
      }
    }, 50);
  }

  private pollActiveAgents(): void {
    this.strategicChatService.getActiveSessions().subscribe({
      next: (sessions) => this.activeAgentCount = sessions.length,
    });
  }

  private refreshProjects(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => this.projects = projects,
    });
  }
}
