import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { ClaudeCodeService, AgentSessionSummary } from '../../services/claude-code.service';
import { Project, ClaudeCodeEvent } from '../../models/project.model';

interface TerminalEntry {
  type: 'input' | 'text' | 'tool_use' | 'tool_result' | 'error' | 'system';
  content: string;
  html?: SafeHtml;
  tool?: string;
  timestamp: Date;
}

@Component({
  selector: 'app-agent-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="terminal-container">
      <div class="terminal-header">
        <div class="header-left">
          <h3><mat-icon>terminal</mat-icon> Claude Code Agent</h3>
          <span class="status-badge" [class]="isAvailable ? 'available' : 'unavailable'">
            {{ isAvailable ? 'Available' : 'Not Available' }}
          </span>
        </div>
        <div class="header-right">
          @if (isRunning) {
            <button class="cancel-btn" (click)="cancel()">
              <mat-icon>stop</mat-icon> Stop
            </button>
          }
          @if (project.localPath) {
            <button class="history-btn" [class.active]="showHistory" (click)="toggleHistory()" matTooltip="Session history">
              <mat-icon>history</mat-icon>
            </button>
          }
        </div>
      </div>

      @if (showHistory && pastSessions.length > 0) {
        <div class="session-list">
          @for (s of pastSessions; track s.sessionId) {
            <button class="session-item" (click)="loadSession(s)" [class.active]="activeHistorySessionId === s.sessionId">
              <div class="session-meta">
                <span class="session-status" [class]="s.status">{{ s.status }}</span>
                <span class="session-date">{{ s.createdAt | date:'short' }}</span>
              </div>
              <div class="session-prompt">{{ s.prompt || 'No prompt' }}</div>
              <div class="session-events">{{ s.eventCount }} events</div>
              @if (s.sdkSessionId) {
                <button class="resume-btn" (click)="resumeSession(s, $event)" matTooltip="Continue this conversation">
                  <mat-icon>replay</mat-icon>
                </button>
              }
            </button>
          }
        </div>
      } @else if (showHistory) {
        <div class="session-list empty">No past sessions</div>
      }

      @if (!project.localPath) {
        <div class="setup-notice">
          <mat-icon>info</mat-icon>
          <div>
            <strong>Local path required</strong>
            <p>Set the project's local path in Edit mode to use the Claude Code agent. This tells the agent where your project files are on disk.</p>
          </div>
        </div>
      } @else {
        <div class="terminal-output" #terminalOutput>
          @if (entries.length === 0 && !isRunning) {
            <div class="terminal-welcome">
              <p>Run any operation on your project using Claude Code. The agent can read, write, and modify your codebase.</p>
              <div class="quick-actions">
                <button class="quick-action" (click)="runQuick('Review the codebase and suggest improvements')"><mat-icon>rate_review</mat-icon> Code Review</button>
                <button class="quick-action" (click)="runQuick('Generate a comprehensive README.md')"><mat-icon>description</mat-icon> Generate README</button>
                <button class="quick-action" (click)="runQuick('Find and fix security vulnerabilities')"><mat-icon>security</mat-icon> Security Audit</button>
                <button class="quick-action" (click)="runQuick('Analyze performance and suggest optimizations')"><mat-icon>speed</mat-icon> Performance</button>
              </div>
            </div>
          }
          @for (entry of entries; track $index) {
            <div class="entry" [class]="entry.type">
              @if (entry.type === 'input') {
                <span class="prompt">&gt;</span>
                <span class="input-text">{{ entry.content }}</span>
              } @else if (entry.type === 'tool_use') {
                <div class="tool-badge"><mat-icon>build</mat-icon> {{ entry.tool }}</div>
                <div class="tool-content">{{ entry.content }}</div>
              } @else if (entry.type === 'error') {
                <mat-icon class="err-icon">error</mat-icon>
                <span>{{ entry.content }}</span>
              } @else if (entry.type === 'text' && entry.html) {
                <div class="markdown-body" [innerHTML]="entry.html"></div>
              } @else {
                <span>{{ entry.content }}</span>
              }
            </div>
          }
          @if (isRunning) {
            <div class="entry system">
              <mat-spinner diameter="14"></mat-spinner>
              <span>Agent is working...</span>
            </div>
          }
        </div>

        <div class="terminal-input">
          <span class="prompt-icon">&gt;</span>
          <input
            [(ngModel)]="userPrompt"
            [placeholder]="resumingSdkSessionId ? 'Continue the conversation...' : 'Tell the agent what to do...'"
            (keydown.enter)="run()"
            [disabled]="isRunning || !isAvailable"
          />
          @if (resumingSdkSessionId) {
            <button class="resume-badge" (click)="clearResume()" matTooltip="Click to start fresh">
              <mat-icon>replay</mat-icon> Resuming
            </button>
          }
          <button class="send-btn" (click)="run()" [disabled]="!userPrompt.trim() || isRunning || !isAvailable">
            <mat-icon>play_arrow</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .terminal-container { display: flex; flex-direction: column; gap: .75rem; }
    .terminal-header { display: flex; justify-content: space-between; align-items: center; }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .header-left h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
    .header-left h3 mat-icon { color: var(--color-primary); }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .status-badge { font-size: .7rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; }
    .status-badge.available { background: rgba(34,197,94,.1); color: var(--color-success); }
    .status-badge.unavailable { background: rgba(239,68,68,.1); color: var(--color-danger); }
    .cancel-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border: 1px solid var(--color-danger); border-radius: var(--radius-sm); background: none; color: var(--color-danger); font-family: inherit; font-size: .8rem; font-weight: 600; cursor: pointer; }
    .cancel-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .history-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: none; color: var(--color-text-subtle); cursor: pointer; }
    .history-btn:hover, .history-btn.active { border-color: var(--color-primary); color: var(--color-primary); }
    .history-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .session-list { background: #0d1117; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 6px; max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
    .session-list.empty { padding: 1rem; text-align: center; color: #8b949e; font-size: .82rem; }
    .session-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid transparent; border-radius: var(--radius-sm); background: #161b22; color: #c9d1d9; font-family: inherit; font-size: .78rem; cursor: pointer; text-align: left; width: 100%; }
    .session-item:hover { border-color: var(--color-border-light); }
    .session-item.active { border-color: var(--color-primary); background: rgba(212,175,55,.06); }
    .session-meta { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; min-width: 80px; }
    .session-status { font-size: .65rem; font-weight: 700; text-transform: uppercase; }
    .session-status.completed { color: var(--color-success); }
    .session-status.failed { color: var(--color-danger); }
    .session-status.cancelled { color: var(--color-warning); }
    .session-date { font-size: .65rem; color: #8b949e; }
    .session-prompt { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .session-events { font-size: .65rem; color: #8b949e; flex-shrink: 0; }
    .resume-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: none; color: var(--color-text-subtle); cursor: pointer; flex-shrink: 0; }
    .resume-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .resume-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .resume-badge { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border: 1px solid var(--color-primary); border-radius: var(--radius-sm); background: rgba(212,175,55,.1); color: var(--color-primary); font-family: inherit; font-size: .7rem; font-weight: 600; cursor: pointer; flex-shrink: 0; }
    .resume-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .setup-notice { display: flex; gap: 12px; padding: 1rem; background: rgba(234,179,8,.06); border: 1px solid rgba(234,179,8,.2); border-radius: var(--radius-md); color: var(--color-text); font-size: .85rem; }
    .setup-notice mat-icon { color: var(--color-warning); flex-shrink: 0; margin-top: 2px; }
    .setup-notice strong { display: block; margin-bottom: 4px; }
    .setup-notice p { margin: 0; color: var(--color-text-subtle); line-height: 1.5; }

    .terminal-output { background: #0d1117; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 1rem; min-height: 300px; max-height: 500px; overflow-y: auto; font-family: 'Fira Code', 'Consolas', monospace; font-size: .82rem; display: flex; flex-direction: column; gap: 8px; }
    .terminal-welcome { padding: 1rem; text-align: center; color: #8b949e; }
    .terminal-welcome p { margin: 0 0 1rem; line-height: 1.5; }
    .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .quick-action { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid #30363d; border-radius: var(--radius-sm); background: #161b22; color: #c9d1d9; font-family: inherit; font-size: .8rem; cursor: pointer; text-align: left; }
    .quick-action:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .quick-action mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    .entry { display: flex; gap: 8px; align-items: flex-start; color: #c9d1d9; line-height: 1.5; }
    .entry.input { color: var(--color-primary); }
    .entry.error { color: #f85149; }
    .entry.system { color: #8b949e; align-items: center; }
    .prompt { color: var(--color-primary); font-weight: 700; flex-shrink: 0; }
    .tool-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: rgba(212,175,55,.1); border-radius: 4px; color: var(--color-primary); font-size: .75rem; font-weight: 600; flex-shrink: 0; }
    .tool-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .tool-content { color: #8b949e; word-break: break-all; }
    .err-icon { color: #f85149; font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

    .markdown-body { color: #c9d1d9; }
    .markdown-body p { margin: 0 0 .4em; } .markdown-body p:last-child { margin: 0; }
    .markdown-body code { background: rgba(255,255,255,.06); padding: 1px 5px; border-radius: 4px; font-size: .85em; }
    .markdown-body pre { background: #161b22; padding: 8px 10px; border-radius: 6px; overflow-x: auto; margin: .4em 0; }
    .markdown-body pre code { background: none; padding: 0; }
    .markdown-body ul,.markdown-body ol { margin: .3em 0; padding-left: 1.4em; }
    .markdown-body strong { font-weight: 700; color: #e6edf3; }

    .terminal-input { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #0d1117; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); }
    .prompt-icon { color: var(--color-primary); font-weight: 700; font-family: monospace; flex-shrink: 0; }
    .terminal-input input { flex: 1; background: none; border: none; color: #c9d1d9; font-family: 'Fira Code', monospace; font-size: .85rem; outline: none; }
    .terminal-input input::placeholder { color: #484f58; }
    .send-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; border-radius: var(--radius-sm); background: var(--color-primary); color: #0A0A0A; cursor: pointer; flex-shrink: 0; }
    .send-btn:disabled { opacity: .3; cursor: not-allowed; }
    .send-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class AgentTerminalComponent implements OnInit, OnDestroy {
  @Input() project!: Project;
  @ViewChild('terminalOutput') terminalOutput!: ElementRef;

  isAvailable = false;
  isRunning = false;
  userPrompt = '';
  entries: TerminalEntry[] = [];
  showHistory = false;
  pastSessions: AgentSessionSummary[] = [];
  activeHistorySessionId = '';
  resumingSdkSessionId = '';
  private currentSessionId = '';
  private runSubscription: any = null;

  constructor(
    private claudeCodeService: ClaudeCodeService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.claudeCodeService.checkStatus().subscribe({
      next: (s) => { this.isAvailable = s.available; },
      error: () => { this.isAvailable = false; },
    });
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory && this.project._id) {
      this.claudeCodeService.getSessions(this.project._id).subscribe({
        next: (sessions) => { this.pastSessions = sessions; },
        error: () => { this.pastSessions = []; },
      });
    }
  }

  loadSession(session: AgentSessionSummary): void {
    if (!this.project._id) return;
    this.activeHistorySessionId = session.sessionId;
    this.claudeCodeService.getSession(this.project._id, session.sessionId).subscribe({
      next: (full) => {
        this.entries = [];
        // Replay stored events into the terminal
        if (full.prompt) {
          this.entries.push({ type: 'input', content: full.prompt, timestamp: new Date(full.createdAt) });
        }
        for (const event of full.events || []) {
          if (event.type === 'text' && event.content) {
            const html = this.sanitizer.bypassSecurityTrustHtml(marked.parse(event.content) as string);
            this.entries.push({ type: 'text', content: event.content, html, timestamp: new Date() });
          } else if (event.type === 'tool_use') {
            this.entries.push({ type: 'tool_use', content: event.content || '', tool: event.tool, timestamp: new Date() });
          } else if (event.type === 'tool_result') {
            this.entries.push({ type: 'tool_result', content: event.content || '', timestamp: new Date() });
          } else if (event.type === 'error') {
            this.entries.push({ type: 'error', content: event.content || '', timestamp: new Date() });
          }
        }
        this.entries.push({ type: 'system', content: `Session ${full.status} - ${new Date(full.createdAt).toLocaleString()}`, timestamp: new Date() });
        this.showHistory = false;
        this.scrollBottom();
      },
    });
  }

  resumeSession(session: AgentSessionSummary, event: Event): void {
    event.stopPropagation();
    if (!session.sdkSessionId) return;
    this.resumingSdkSessionId = session.sdkSessionId;
    this.showHistory = false;
    // Load the past session first, then user can type a follow-up
    this.loadSession(session);
  }

  clearResume(): void {
    this.resumingSdkSessionId = '';
  }

  runQuick(prompt: string): void {
    this.userPrompt = prompt;
    this.run();
  }

  run(): void {
    const prompt = this.userPrompt.trim();
    if (!prompt || this.isRunning || !this.project?._id) return;

    this.entries.push({ type: 'input', content: prompt, timestamp: new Date() });
    this.userPrompt = '';
    this.isRunning = true;
    this.activeHistorySessionId = '';
    this.scrollBottom();

    const sdkSessionId = this.resumingSdkSessionId || undefined;
    this.resumingSdkSessionId = '';

    this.runSubscription = this.claudeCodeService.runAgent(this.project._id, prompt, sdkSessionId).subscribe({
      next: (event: ClaudeCodeEvent) => {
        if (event.sessionId) this.currentSessionId = event.sessionId;

        if (event.type === 'text' && event.content) {
          const html = this.sanitizer.bypassSecurityTrustHtml(marked.parse(event.content) as string);
          this.entries.push({ type: 'text', content: event.content, html, timestamp: new Date() });
        } else if (event.type === 'tool_use') {
          this.entries.push({ type: 'tool_use', content: event.content || '', tool: event.tool, timestamp: new Date() });
        } else if (event.type === 'tool_result') {
          this.entries.push({ type: 'tool_result', content: event.content || '', timestamp: new Date() });
        } else if (event.type === 'error') {
          this.entries.push({ type: 'error', content: event.content || 'Unknown error', timestamp: new Date() });
        }
        this.scrollBottom();
      },
      error: (err) => {
        this.entries.push({ type: 'error', content: err.message || 'Connection failed', timestamp: new Date() });
        this.isRunning = false;
        this.runSubscription = null;
      },
      complete: () => {
        this.isRunning = false;
        this.runSubscription = null;
        this.entries.push({ type: 'system', content: 'Agent finished.', timestamp: new Date() });
        this.scrollBottom();
      },
    });
  }

  ngOnDestroy(): void {
    if (this.isRunning) {
      if (this.runSubscription) {
        this.runSubscription.unsubscribe();
        this.runSubscription = null;
      }
      if (this.currentSessionId) {
        this.claudeCodeService.cancelAgent(this.currentSessionId).subscribe();
      }
    }
  }

  cancel(): void {
    if (this.runSubscription) {
      this.runSubscription.unsubscribe();
      this.runSubscription = null;
    }
    if (this.currentSessionId) {
      this.claudeCodeService.cancelAgent(this.currentSessionId).subscribe();
    }
    this.isRunning = false;
    this.entries.push({ type: 'system', content: 'Session cancelled.', timestamp: new Date() });
  }

  private scrollBottom(): void {
    setTimeout(() => {
      if (this.terminalOutput) {
        this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
