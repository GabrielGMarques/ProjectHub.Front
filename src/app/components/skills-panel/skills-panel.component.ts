import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { SkillService } from '../../services/skill.service';
import { Project, Skill, AIModel, AIModelOption } from '../../models/project.model';

@Component({
  selector: 'app-skills-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="skills-container">
      <div class="skills-header">
        <div class="header-left">
          <h3><mat-icon>auto_fix_high</mat-icon> Skills</h3>
          <p class="subtitle">One-click operations for your project</p>
        </div>
        <div class="header-actions">
          <div class="model-selector">
            @for (m of availableModels; track m.id) {
              <button class="model-chip" [class.active]="selectedModel === m.id" [class.unavailable]="!m.available"
                (click)="m.available && (selectedModel = m.id)">{{ m.name }}</button>
            }
          </div>
          <button class="add-btn" (click)="showCreateForm = !showCreateForm">
            <mat-icon>{{ showCreateForm ? 'close' : 'add' }}</mat-icon>
            {{ showCreateForm ? 'Cancel' : 'Custom Skill' }}
          </button>
        </div>
      </div>

      @if (showCreateForm) {
        <div class="create-form">
          <input [(ngModel)]="newSkill.name" placeholder="Skill name" class="form-input" />
          <input [(ngModel)]="newSkill.description" placeholder="Description" class="form-input" />
          <textarea [(ngModel)]="newSkill.prompt" placeholder="Prompt template..." class="form-input" rows="3"></textarea>
          <div class="form-row">
            <select [(ngModel)]="newSkill.category" class="form-input">
              <option value="development">Development</option>
              <option value="marketing">Marketing</option>
              <option value="analysis">Analysis</option>
              <option value="operations">Operations</option>
              <option value="custom">Custom</option>
            </select>
            <select [(ngModel)]="newSkill.executionMode" class="form-input">
              <option value="ai-chat">AI Chat</option>
              <option value="claude-code">Claude Code</option>
            </select>
            <button class="save-btn" (click)="createSkill()" [disabled]="!newSkill.name || !newSkill.prompt">
              <mat-icon>save</mat-icon> Save
            </button>
          </div>
        </div>
      }

      <!-- Category groups -->
      @for (cat of categories; track cat.key) {
        @if (getSkillsByCategory(cat.key).length) {
          <div class="category-section">
            <div class="category-header">
              <mat-icon>{{ cat.icon }}</mat-icon>
              <span>{{ cat.label }}</span>
            </div>
            <div class="skills-grid">
              @for (skill of getSkillsByCategory(cat.key); track skill._id) {
                <div class="skill-card" [class.running]="runningSkillId === skill._id">
                  <div class="skill-icon"><mat-icon>{{ skill.icon }}</mat-icon></div>
                  <div class="skill-info">
                    <div class="skill-name">{{ skill.name }}</div>
                    <div class="skill-desc">{{ skill.description }}</div>
                    <div class="skill-meta">
                      <span class="skill-mode">{{ skill.executionMode === 'ai-chat' ? 'AI' : 'CLI' }}</span>
                      @if (!skill.isBuiltIn) {
                        <button class="del-btn" (click)="deleteSkill(skill)" matTooltip="Delete">
                          <mat-icon>delete</mat-icon>
                        </button>
                      }
                    </div>
                  </div>
                  <button class="exec-btn" (click)="executeSkill(skill)" [disabled]="runningSkillId !== null" matTooltip="Run skill">
                    @if (runningSkillId === skill._id) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      <mat-icon>play_arrow</mat-icon>
                    }
                  </button>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Result -->
      @if (lastResult) {
        <div class="result-card">
          <div class="result-header">
            <mat-icon>check_circle</mat-icon>
            <span>Result: {{ lastSkillName }}</span>
            <button class="close-result" (click)="lastResult = null"><mat-icon>close</mat-icon></button>
          </div>
          <div class="markdown-body" [innerHTML]="parsedResult"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skills-container { display: flex; flex-direction: column; gap: 1rem; }
    .skills-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .header-left h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
    .header-left h3 mat-icon { color: var(--color-primary); }
    .subtitle { margin: 4px 0 0; font-size: .82rem; color: var(--color-text-subtle); }
    .header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .model-selector { display: flex; gap: 4px; }
    .model-chip { padding: 4px 10px; border: 1px solid var(--color-border); border-radius: 100px; background: var(--color-bg); color: var(--color-text-subtle); font-family: inherit; font-size: .72rem; font-weight: 600; cursor: pointer; }
    .model-chip:hover:not(.unavailable) { border-color: var(--color-primary); color: var(--color-primary); }
    .model-chip.active { background: var(--color-primary); color: #0A0A0A; border-color: var(--color-primary); }
    .model-chip.unavailable { opacity: .35; cursor: not-allowed; }
    .add-btn { display: flex; align-items: center; gap: 4px; padding: 6px 14px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-card); color: var(--color-text); font-family: inherit; font-size: .82rem; font-weight: 600; cursor: pointer; }
    .add-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .add-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .create-form { display: flex; flex-direction: column; gap: 8px; padding: 1rem; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); }
    .form-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text); font-family: inherit; font-size: .85rem; outline: none; resize: vertical; }
    .form-input:focus { border-color: var(--color-primary); }
    .form-row { display: flex; gap: 8px; align-items: center; }
    .form-row select { flex: 1; }
    .save-btn { display: flex; align-items: center; gap: 4px; padding: 8px 16px; border: none; border-radius: var(--radius-sm); background: var(--color-primary); color: #0A0A0A; font-family: inherit; font-size: .85rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .save-btn:disabled { opacity: .4; cursor: not-allowed; }
    .save-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .category-section { margin-top: .25rem; }
    .category-header { display: flex; align-items: center; gap: 8px; font-size: .85rem; font-weight: 700; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: .04em; margin-bottom: .5rem; }
    .category-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }

    .skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: .6rem; }
    .skill-card { display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); transition: border-color .2s; }
    .skill-card:hover { border-color: var(--color-primary); }
    .skill-card.running { border-color: var(--color-primary); }
    .skill-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); background: rgba(212,175,55,.1); flex-shrink: 0; }
    .skill-icon mat-icon { color: var(--color-primary); font-size: 20px; width: 20px; height: 20px; }
    .skill-info { flex: 1; min-width: 0; }
    .skill-name { font-size: .85rem; font-weight: 700; color: var(--color-text); }
    .skill-desc { font-size: .75rem; color: var(--color-text-subtle); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .skill-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .skill-mode { font-size: .65rem; font-weight: 700; padding: 1px 6px; border-radius: 100px; background: var(--color-bg); color: var(--color-text-subtle); text-transform: uppercase; }
    .del-btn { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: none; background: none; color: var(--color-text-subtle); cursor: pointer; opacity: 0; }
    .skill-card:hover .del-btn { opacity: 1; }
    .del-btn:hover { color: var(--color-danger); }
    .del-btn mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .exec-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; border-radius: var(--radius-sm); background: var(--color-primary); color: #0A0A0A; cursor: pointer; flex-shrink: 0; }
    .exec-btn:disabled { opacity: .3; cursor: not-allowed; }
    .exec-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .result-card { background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 1rem; }
    .result-header { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--color-success); font-size: .9rem; margin-bottom: .75rem; }
    .result-header mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .close-result { margin-left: auto; border: none; background: none; color: var(--color-text-subtle); cursor: pointer; display: flex; }
    .close-result mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .markdown-body p { margin: 0 0 .5em; } .markdown-body p:last-child { margin: 0; }
    .markdown-body h1,.markdown-body h2,.markdown-body h3 { margin: .6em 0 .3em; font-weight: 700; }
    .markdown-body ul,.markdown-body ol { margin: .3em 0; padding-left: 1.4em; }
    .markdown-body code { background: rgba(255,255,255,.08); padding: 1px 5px; border-radius: 4px; font-size: .82em; }
    .markdown-body pre { background: rgba(0,0,0,.3); padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: .5em 0; }
    .markdown-body pre code { background: none; padding: 0; }
    .markdown-body strong { font-weight: 700; }
  `],
})
export class SkillsPanelComponent implements OnInit {
  @Input() project!: Project;
  @Input() availableModels: AIModelOption[] = [];

  selectedModel: AIModel = (localStorage.getItem('ai-model') as AIModel) || 'claude-sonnet';
  skills: Skill[] = [];
  runningSkillId: string | null = null;
  showCreateForm = false;
  lastResult: string | null = null;
  lastSkillName = '';
  parsedResult: SafeHtml = '';

  newSkill: Partial<Skill> = {
    name: '', description: '', prompt: '', category: 'custom', executionMode: 'ai-chat', icon: 'build',
  };

  categories = [
    { key: 'marketing', label: 'Marketing', icon: 'campaign' },
    { key: 'development', label: 'Development', icon: 'code' },
    { key: 'analysis', label: 'Analysis', icon: 'analytics' },
    { key: 'operations', label: 'Operations', icon: 'settings' },
    { key: 'custom', label: 'Custom', icon: 'tune' },
  ];

  constructor(
    private skillService: SkillService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.skillService.getAll(this.project?._id).subscribe({
      next: (skills) => { this.skills = skills; },
    });
  }

  getSkillsByCategory(category: string): Skill[] {
    return this.skills.filter(s => s.category === category);
  }

  createSkill(): void {
    if (!this.newSkill.name || !this.newSkill.prompt) return;
    this.skillService.create({ ...this.newSkill, projectId: this.project._id }).subscribe({
      next: () => {
        this.loadSkills();
        this.showCreateForm = false;
        this.newSkill = { name: '', description: '', prompt: '', category: 'custom', executionMode: 'ai-chat', icon: 'build' };
        this.snackBar.open('Skill created', 'Close', { duration: 2000 });
      },
    });
  }

  deleteSkill(skill: Skill): void {
    if (!skill._id) return;
    this.skillService.delete(skill._id).subscribe({
      next: () => {
        this.loadSkills();
        this.snackBar.open('Skill deleted', 'Close', { duration: 2000 });
      },
    });
  }

  executeSkill(skill: Skill): void {
    if (!skill._id || !this.project._id || this.runningSkillId) return;
    this.runningSkillId = skill._id;
    this.lastSkillName = skill.name;

    this.skillService.execute(skill._id, this.project._id, this.selectedModel).subscribe({
      next: (res) => {
        this.lastResult = res.response;
        this.parsedResult = this.sanitizer.bypassSecurityTrustHtml(marked.parse(res.response) as string);
        this.runningSkillId = null;
      },
      error: (err) => {
        this.snackBar.open(err.error?.error || 'Skill execution failed', 'Close', { duration: 4000 });
        this.runningSkillId = null;
      },
    });
  }
}
