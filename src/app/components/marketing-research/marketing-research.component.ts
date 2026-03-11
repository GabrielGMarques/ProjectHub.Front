import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { MarketingResearchService, ResearchStepEvent } from '../../services/marketing-research.service';
import { ProjectService } from '../../services/project.service';
import { Project, AIModel, AIModelOption, MarketingResearch } from '../../models/project.model';

interface PipelineStep {
  id: string;
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

@Component({
  selector: 'app-marketing-research',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule, MatCheckboxModule],
  template: `
    <div class="research-container">
      <!-- Header -->
      <div class="research-header">
        <div class="header-left">
          <h3><mat-icon>campaign</mat-icon> Marketing Research</h3>
          <p class="subtitle">AI-powered market analysis and strategy</p>
        </div>
        <div class="header-actions">
          <div class="model-selector">
            @for (m of availableModels; track m.id) {
              <button class="model-chip" [class.active]="selectedModel === m.id" [class.unavailable]="!m.available"
                (click)="m.available && (selectedModel = m.id)" [matTooltip]="m.name">
                {{ m.name }}
              </button>
            }
          </div>
          <button class="run-btn" (click)="runFullResearch()" [disabled]="isRunning">
            @if (isRunning) { <mat-spinner diameter="18"></mat-spinner> } @else { <mat-icon>play_arrow</mat-icon> }
            {{ isRunning ? 'Researching...' : 'Run Full Research' }}
          </button>
        </div>
      </div>

      <!-- Pipeline Steps -->
      @if (isRunning || hasPipelineActivity) {
        <div class="pipeline">
          @for (step of pipelineSteps; track step.id) {
            <div class="pipeline-step" [class]="step.status">
              @if (step.status === 'running') {
                <mat-spinner diameter="16"></mat-spinner>
              } @else {
                <mat-icon>{{ step.status === 'completed' ? 'check_circle' : step.status === 'failed' ? 'error' : 'radio_button_unchecked' }}</mat-icon>
              }
              <span>{{ step.name }}</span>
            </div>
          }
        </div>
      }

      <!-- Results -->
      @if (research) {
        <div class="results-grid">
          <!-- Competitors -->
          @if (research.competitors?.length) {
            <div class="result-card full-width">
              <div class="card-header">
                <mat-icon>groups</mat-icon>
                <span>Competitors ({{ research.competitors.length }})</span>
              </div>
              <div class="competitors-grid">
                @for (c of research.competitors; track c.name) {
                  <div class="competitor-card">
                    <div class="comp-name">{{ c.name }}</div>
                    @if (c.url) { <a class="comp-url" [href]="c.url" target="_blank">{{ c.url }}</a> }
                    @if (c.estimatedMrr) { <div class="comp-mrr">\${{ c.estimatedMrr | number }} MRR</div> }
                    @if (c.strengths?.length) {
                      <div class="comp-list">
                        <span class="list-label good">Strengths</span>
                        @for (s of c.strengths; track s) { <span class="tag good">{{ s }}</span> }
                      </div>
                    }
                    @if (c.weaknesses?.length) {
                      <div class="comp-list">
                        <span class="list-label bad">Weaknesses</span>
                        @for (w of c.weaknesses; track w) { <span class="tag bad">{{ w }}</span> }
                      </div>
                    }
                    @if (c.notes) { <p class="comp-notes">{{ c.notes }}</p> }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Market Size -->
          @if (research.marketSize?.tam) {
            <div class="result-card">
              <div class="card-header"><mat-icon>pie_chart</mat-icon><span>Market Size</span></div>
              <div class="market-metrics">
                <div class="market-metric"><span class="label">TAM</span><span class="value">{{ research.marketSize.tam }}</span></div>
                <div class="market-metric"><span class="label">SAM</span><span class="value">{{ research.marketSize.sam }}</span></div>
                <div class="market-metric"><span class="label">SOM</span><span class="value">{{ research.marketSize.som }}</span></div>
              </div>
              @if (research.marketSize.sources?.length) {
                <div class="sources">
                  <span class="sources-label">Sources:</span>
                  @for (s of research.marketSize.sources; track s) { <span class="source-tag">{{ s }}</span> }
                </div>
              }
            </div>
          }

          <!-- Trends -->
          @if (research.trends?.length) {
            <div class="result-card">
              <div class="card-header"><mat-icon>trending_up</mat-icon><span>Trends</span></div>
              <div class="trends-list">
                @for (t of research.trends; track t.title) {
                  <div class="trend-item">
                    <span class="trend-relevance" [class]="t.relevance">{{ t.relevance }}</span>
                    <div class="trend-info">
                      <div class="trend-title">{{ t.title }}</div>
                      <div class="trend-desc">{{ t.description }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Benchmarks -->
          @if (research.benchmarks?.raw) {
            <div class="result-card full-width">
              <div class="card-header"><mat-icon>analytics</mat-icon><span>Industry Benchmarks</span></div>
              <div class="markdown-body" [innerHTML]="parsedBenchmarks"></div>
            </div>
          }

          <!-- Marketing Plan -->
          @if (research.marketingPlan?.summary) {
            <div class="result-card full-width">
              <div class="card-header"><mat-icon>assignment</mat-icon><span>Marketing Plan</span></div>
              <p class="plan-summary">{{ research.marketingPlan.summary }}</p>

              @if (research.marketingPlan.channels?.length) {
                <div class="channels-grid">
                  @for (ch of research.marketingPlan.channels; track ch.name) {
                    <div class="channel-card" [class]="ch.priority">
                      <div class="ch-header">
                        <span class="ch-name">{{ ch.name }}</span>
                        <span class="ch-priority">{{ ch.priority }}</span>
                      </div>
                      <p class="ch-strategy">{{ ch.strategy }}</p>
                      <div class="ch-metrics">
                        @if (ch.budget) { <span>Budget: {{ ch.budget }}</span> }
                        @if (ch.expectedRoi) { <span>ROI: {{ ch.expectedRoi }}</span> }
                      </div>
                    </div>
                  }
                </div>
              }

              @if (research.marketingPlan.actionItems?.length) {
                <div class="action-items">
                  <h4>Action Items</h4>
                  @for (item of research.marketingPlan.actionItems; track item.task) {
                    <div class="action-item" [class.done]="item.done">
                      <mat-checkbox [checked]="item.done" (change)="toggleActionItem(item)" color="primary"></mat-checkbox>
                      <div class="action-info">
                        <span class="action-task">{{ item.task }}</span>
                        <span class="action-meta">{{ item.channel }} · {{ item.deadline }}</span>
                      </div>
                    </div>
                  }
                </div>
              }

              @if (research.marketingPlan.raw) {
                <details class="raw-details">
                  <summary>View full plan</summary>
                  <div class="markdown-body" [innerHTML]="parsedPlan"></div>
                </details>
              }
            </div>
          }
        </div>
      } @else if (!isRunning) {
        <div class="empty-state">
          <mat-icon>campaign</mat-icon>
          <h3>No research yet</h3>
          <p>Run a full marketing research to get competitor analysis, market sizing, trend identification, benchmarks, and a complete marketing plan.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .research-container { display: flex; flex-direction: column; gap: 1rem; }
    .research-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .header-left h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
    .header-left h3 mat-icon { color: var(--color-primary); }
    .subtitle { margin: 4px 0 0; font-size: .82rem; color: var(--color-text-subtle); }
    .header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .model-selector { display: flex; gap: 4px; }
    .model-chip { padding: 4px 10px; border: 1px solid var(--color-border); border-radius: 100px; background: var(--color-bg); color: var(--color-text-subtle); font-family: inherit; font-size: .72rem; font-weight: 600; cursor: pointer; }
    .model-chip:hover:not(.unavailable) { border-color: var(--color-primary); color: var(--color-primary); }
    .model-chip.active { background: var(--color-primary); color: #0A0A0A; border-color: var(--color-primary); }
    .model-chip.unavailable { opacity: .35; cursor: not-allowed; }
    .run-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius-sm); background: var(--color-primary); color: #0A0A0A; font-family: inherit; font-size: .85rem; font-weight: 600; cursor: pointer; }
    .run-btn:disabled { opacity: .5; cursor: not-allowed; }
    .run-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .pipeline { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px; background: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border-light); }
    .pipeline-step { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; font-size: .78rem; font-weight: 600; color: var(--color-text-subtle); background: var(--color-bg-card); border: 1px solid var(--color-border-light); }
    .pipeline-step.running { color: var(--color-primary); border-color: var(--color-primary); }
    .pipeline-step.completed { color: var(--color-success); border-color: var(--color-success); }
    .pipeline-step.failed { color: var(--color-danger); border-color: var(--color-danger); }
    .pipeline-step mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .results-grid { display: flex; flex-direction: column; gap: 1rem; }
    .result-card { background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 1rem; }
    .card-header { display: flex; align-items: center; gap: 8px; font-size: .95rem; font-weight: 700; color: var(--color-text); margin-bottom: .75rem; }
    .card-header mat-icon { color: var(--color-primary); font-size: 20px; width: 20px; height: 20px; }

    .competitors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: .75rem; }
    .competitor-card { padding: 12px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: var(--color-bg); }
    .comp-name { font-weight: 700; font-size: .9rem; color: var(--color-text); }
    .comp-url { font-size: .75rem; color: var(--color-primary); text-decoration: none; display: block; margin: 2px 0; }
    .comp-mrr { font-size: .8rem; font-weight: 600; color: var(--color-primary); margin: 4px 0; }
    .comp-list { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .list-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; }
    .list-label.good { color: var(--color-success); }
    .list-label.bad { color: var(--color-danger); }
    .tag { font-size: .72rem; padding: 2px 8px; border-radius: 100px; }
    .tag.good { background: rgba(34,197,94,.1); color: var(--color-success); }
    .tag.bad { background: rgba(239,68,68,.1); color: var(--color-danger); }
    .comp-notes { font-size: .8rem; color: var(--color-text-subtle); margin: 6px 0 0; }

    .market-metrics { display: flex; gap: 1rem; flex-wrap: wrap; }
    .market-metric { display: flex; flex-direction: column; gap: 2px; padding: 10px 16px; background: var(--color-bg); border-radius: var(--radius-sm); min-width: 100px; }
    .market-metric .label { font-size: .7rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-subtle); }
    .market-metric .value { font-size: .88rem; font-weight: 600; color: var(--color-primary); }
    .sources { margin-top: .5rem; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .sources-label { font-size: .72rem; font-weight: 600; color: var(--color-text-subtle); }
    .source-tag { font-size: .7rem; padding: 2px 8px; background: var(--color-bg); border-radius: 100px; color: var(--color-text-subtle); }

    .trends-list { display: flex; flex-direction: column; gap: 8px; }
    .trend-item { display: flex; gap: 10px; align-items: flex-start; }
    .trend-relevance { font-size: .68rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 100px; flex-shrink: 0; }
    .trend-relevance.high { background: rgba(239,68,68,.1); color: var(--color-danger); }
    .trend-relevance.medium { background: rgba(234,179,8,.1); color: var(--color-warning); }
    .trend-relevance.low { background: rgba(34,197,94,.1); color: var(--color-success); }
    .trend-title { font-size: .85rem; font-weight: 600; color: var(--color-text); }
    .trend-desc { font-size: .8rem; color: var(--color-text-subtle); margin-top: 2px; }

    .plan-summary { font-size: .88rem; color: var(--color-text); line-height: 1.6; margin: 0 0 .75rem; }
    .channels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: .75rem; margin-bottom: 1rem; }
    .channel-card { padding: 12px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); background: var(--color-bg); }
    .ch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .ch-name { font-weight: 700; font-size: .88rem; color: var(--color-text); }
    .ch-priority { font-size: .68rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 100px; }
    .channel-card.high .ch-priority { background: rgba(239,68,68,.1); color: var(--color-danger); }
    .channel-card.medium .ch-priority { background: rgba(234,179,8,.1); color: var(--color-warning); }
    .channel-card.low .ch-priority { background: rgba(34,197,94,.1); color: var(--color-success); }
    .ch-strategy { font-size: .8rem; color: var(--color-text-subtle); margin: 0 0 8px; line-height: 1.5; }
    .ch-metrics { display: flex; gap: 12px; font-size: .75rem; font-weight: 600; color: var(--color-text-subtle); }

    .action-items h4 { margin: 0 0 8px; font-size: .9rem; color: var(--color-text); }
    .action-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .action-item.done .action-task { text-decoration: line-through; color: var(--color-text-subtle); }
    .action-task { font-size: .85rem; color: var(--color-text); }
    .action-meta { font-size: .72rem; color: var(--color-text-subtle); }
    .action-info { display: flex; flex-direction: column; gap: 2px; }

    .raw-details { margin-top: .75rem; }
    .raw-details summary { font-size: .82rem; font-weight: 600; color: var(--color-primary); cursor: pointer; }

    .markdown-body p { margin: 0 0 .5em; } .markdown-body p:last-child { margin-bottom: 0; }
    .markdown-body h1,.markdown-body h2,.markdown-body h3 { margin: .6em 0 .3em; font-weight: 700; }
    .markdown-body ul,.markdown-body ol { margin: .3em 0; padding-left: 1.4em; }
    .markdown-body li { margin: .15em 0; }
    .markdown-body code { background: rgba(255,255,255,.08); padding: 1px 5px; border-radius: 4px; font-size: .82em; }
    .markdown-body pre { background: rgba(0,0,0,.3); padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: .5em 0; }
    .markdown-body pre code { background: none; padding: 0; }
    .markdown-body strong { font-weight: 700; }

    .empty-state { text-align: center; padding: 3rem 1rem; color: var(--color-text-subtle); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--color-primary); opacity: .5; }
    .empty-state h3 { margin: 8px 0 4px; color: var(--color-text); }
    .empty-state p { font-size: .85rem; max-width: 400px; margin: 0 auto; line-height: 1.5; }
  `],
})
export class MarketingResearchComponent implements OnInit {
  @Input() project!: Project;
  @Input() availableModels: AIModelOption[] = [];

  selectedModel: AIModel = (localStorage.getItem('ai-model') as AIModel) || 'claude-sonnet';
  isRunning = false;
  research: MarketingResearch | null = null;
  parsedBenchmarks: SafeHtml = '';
  parsedPlan: SafeHtml = '';

  pipelineSteps: PipelineStep[] = [
    { id: 'competitors', name: 'Competitors', icon: 'groups', status: 'pending' },
    { id: 'market-size', name: 'Market Size', icon: 'pie_chart', status: 'pending' },
    { id: 'trends', name: 'Trends', icon: 'trending_up', status: 'pending' },
    { id: 'benchmarks', name: 'Benchmarks', icon: 'analytics', status: 'pending' },
    { id: 'plan', name: 'Marketing Plan', icon: 'assignment', status: 'pending' },
  ];

  get hasPipelineActivity(): boolean {
    return this.pipelineSteps.some(s => s.status !== 'pending');
  }

  constructor(
    private researchService: MarketingResearchService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadLatest();
  }

  loadLatest(): void {
    if (!this.project?._id) return;
    this.researchService.getLatest(this.project._id).subscribe({
      next: (data) => {
        if (data && Object.keys(data).length > 0) {
          this.research = data;
          this.parseMarkdownFields();
        }
      },
    });
  }

  runFullResearch(): void {
    if (!this.project?._id || this.isRunning) return;
    this.isRunning = true;
    this.pipelineSteps.forEach(s => s.status = 'pending');

    this.researchService.runFullResearch(this.project._id, this.selectedModel).subscribe({
      next: (event: ResearchStepEvent) => {
        if (event.name) {
          const step = this.pipelineSteps.find(s => s.id === event.name);
          if (step && event.status) {
            step.status = event.status as any;
          }
        }
        if (event.type === 'done' && event.result) {
          this.research = event.result;
          this.parseMarkdownFields();
          this.isRunning = false;
          this.snackBar.open('Research complete', 'Close', { duration: 3000 });
        }
        if (event.type === 'error') {
          this.isRunning = false;
          this.snackBar.open(event.message || 'Research failed', 'Close', { duration: 4000 });
        }
      },
      error: () => {
        this.isRunning = false;
        this.snackBar.open('Research failed', 'Close', { duration: 3000 });
      },
      complete: () => { this.isRunning = false; },
    });
  }

  toggleActionItem(item: any): void {
    item.done = !item.done;
    if (this.project?._id && this.research) {
      this.projectService.update(this.project._id, { marketingResearch: this.research } as any).subscribe();
    }
  }

  private parseMarkdownFields(): void {
    if (this.research?.benchmarks?.raw) {
      this.parsedBenchmarks = this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.research.benchmarks.raw) as string);
    }
    if (this.research?.marketingPlan?.raw) {
      this.parsedPlan = this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.research.marketingPlan.raw) as string);
    }
  }
}
