import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { Project, Application } from '../../models/project.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="apps-page">
      <div class="page-header">
        <div class="page-title">
          <h1><mat-icon>dns</mat-icon> Applications Registry</h1>
          <p class="subtitle">All registered applications across your companies</p>
        </div>
        <div class="page-actions">
          <div class="gateway-badge" [class.active]="infraStatus?.ngrokRunning">
            <mat-icon>router</mat-icon>
            <span>Gateway :{{ infraStatus?.gatewayPort || '?' }}</span>
            <span class="gw-dot"></span>
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else {
        <!-- Stats bar -->
        <div class="stats-bar">
          <div class="stat"><span class="stat-val">{{ totalApps }}</span><span class="stat-label">Applications</span></div>
          <div class="stat"><span class="stat-val">{{ companiesWithApps }}</span><span class="stat-label">Companies</span></div>
          <div class="stat running"><span class="stat-val">{{ runningApps }}</span><span class="stat-label">Running</span></div>
          <div class="stat tested"><span class="stat-val">{{ testedApps }}</span><span class="stat-label">Tested</span></div>
          <div class="stat untested"><span class="stat-val">{{ untestedApps }}</span><span class="stat-label">Untested</span></div>
        </div>

        <!-- Companies with apps -->
        @for (group of groupedApps; track group.companyId) {
          <div class="company-section">
            <div class="company-header">
              <h2>{{ group.companyName }}</h2>
              <span class="company-count">{{ group.apps.length }} app{{ group.apps.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="apps-grid">
              @for (app of group.apps; track app.name) {
                <div class="app-card" [class.running]="app.status === 'running'" [class.error]="app.status === 'error'">
                  <!-- Header -->
                  <div class="app-card-top">
                    <div class="app-badges">
                      <span class="type-badge" [attr.data-type]="app.type">{{ app.type }}</span>
                      @if (app.tested) { <span class="tested-badge"><mat-icon>verified</mat-icon> Tested</span> }
                    </div>
                    <div class="app-status-pill" [class]="'s-' + app.status">
                      <span class="s-dot"></span> {{ app.status }}
                    </div>
                  </div>

                  <!-- Body -->
                  <div class="app-card-body">
                    <h3 class="app-name">{{ app.name }}</h3>
                    @if (app.purpose) { <p class="app-purpose">{{ app.purpose }}</p> }
                    @if (app.description) { <p class="app-desc">{{ app.description }}</p> }
                    <div class="app-meta-row">
                      <span class="meta"><mat-icon>lan</mat-icon> :{{ app.port }}</span>
                      <span class="meta"><mat-icon>link</mat-icon> {{ app.basePath }}</span>
                      @if (app.dockerService) {
                        <span class="meta"><mat-icon>inventory_2</mat-icon> {{ app.dockerService }}</span>
                      }
                    </div>
                  </div>

                  <!-- Test Instructions -->
                  @if (app.testInstructions) {
                    <div class="test-instructions-section">
                      <button class="test-toggle" (click)="app._showTestInstructions = !app._showTestInstructions">
                        <mat-icon>{{ app._showTestInstructions ? 'expand_less' : 'science' }}</mat-icon>
                        <span>Test Instructions</span>
                        <mat-icon class="chevron">{{ app._showTestInstructions ? 'expand_less' : 'expand_more' }}</mat-icon>
                      </button>
                      @if (app._showTestInstructions) {
                        <div class="test-body">{{ app.testInstructions }}</div>
                      }
                    </div>
                  }

                  <!-- Screenshot carousel -->
                  @if (getAppScreenshots(group.companyId, app.name).length) {
                    <div class="app-carousel">
                      <div class="carousel-header">
                        <mat-icon class="carousel-icon">photo_library</mat-icon>
                        <span>{{ getAppScreenshots(group.companyId, app.name).length }} screenshot{{ getAppScreenshots(group.companyId, app.name).length !== 1 ? 's' : '' }}</span>
                      </div>
                      <div class="carousel-track">
                        @for (ss of getAppScreenshots(group.companyId, app.name); track ss.filename; let i = $index) {
                          <div class="carousel-slide"
                               (click)="openScreenshot(group.companyId, app.name, ss, getAppScreenshots(group.companyId, app.name), i)"
                               [matTooltip]="ss.caption || ss.originalName">
                            <img [src]="getScreenshotUrl(group.companyId, app.name, ss.filename)" [alt]="ss.caption" loading="lazy" />
                            @if (ss.caption) {
                              <span class="slide-caption">{{ ss.caption }}</span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Actions -->
                  <div class="app-card-actions">
                    <button class="app-btn" (click)="openAppUrl(app)" matTooltip="Open in browser"><mat-icon>open_in_new</mat-icon></button>
                    <button class="app-btn" (click)="toggleStatus(group.companyId, app)" matTooltip="{{ app.status === 'running' ? 'Stop' : 'Start' }}">
                      <mat-icon>{{ app.status === 'running' ? 'stop' : 'play_arrow' }}</mat-icon>
                    </button>
                    <button class="app-btn" (click)="toggleTested(group.companyId, app)" matTooltip="{{ app.tested ? 'Mark untested' : 'Mark tested' }}">
                      <mat-icon>{{ app.tested ? 'unpublished' : 'task_alt' }}</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (groupedApps.length === 0) {
          <div class="empty-state">
            <mat-icon>dns</mat-icon>
            <h2>No applications registered</h2>
            <p>Register applications in each company's Apps tab, or ask Alfred via Telegram.</p>
          </div>
        }
      }

      <!-- Screenshot lightbox with navigation -->
      @if (lightboxUrl) {
        <div class="lightbox" (click)="lightboxUrl = ''">
          @if (lightboxScreenshots.length > 1 && lightboxIndex > 0) {
            <button class="lightbox-nav lightbox-prev" (click)="lightboxNav(-1, $event)"><mat-icon>chevron_left</mat-icon></button>
          }
          <img [src]="lightboxUrl" (click)="$event.stopPropagation()" />
          @if (lightboxScreenshots.length > 1 && lightboxIndex < lightboxScreenshots.length - 1) {
            <button class="lightbox-nav lightbox-next" (click)="lightboxNav(1, $event)"><mat-icon>chevron_right</mat-icon></button>
          }
          <span class="lightbox-caption">{{ lightboxCaption }}</span>
          @if (lightboxScreenshots.length > 1) {
            <span class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ lightboxScreenshots.length }}</span>
          }
          <button class="lightbox-close" (click)="lightboxUrl = ''"><mat-icon>close</mat-icon></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .apps-page { padding: 0 24px 2rem; max-width: 1100px; margin: 0 auto; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; padding-top: .5rem; }
    .page-title h1 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--color-text); }
    .page-title h1 mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--color-primary); }
    .subtitle { margin: 4px 0 0; font-size: .9rem; color: var(--color-text-subtle); }

    .gateway-badge {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-bg-card); font-size: .8rem; font-weight: 600; color: var(--color-text-subtle);
    }
    .gateway-badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .gw-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-text-subtle); }
    .gateway-badge.active .gw-dot { background: #22c55e; }

    .loading { display: flex; justify-content: center; padding: 4rem; }
    .empty-state { text-align: center; padding: 4rem; color: var(--color-text-subtle); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: .3; }
    .empty-state h2 { color: var(--color-text); margin: .75rem 0 .25rem; }

    /* Stats */
    .stats-bar { display: flex; gap: 8px; margin-bottom: 1.5rem; }
    .stat {
      flex: 1; text-align: center; padding: 12px 10px;
      border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);
      background: var(--color-bg-card);
    }
    .stat-val { display: block; font-size: 1.4rem; font-weight: 800; color: var(--color-text); }
    .stat-label { font-size: .72rem; font-weight: 600; color: var(--color-text-subtle); text-transform: uppercase; letter-spacing: .03em; }
    .stat.running .stat-val { color: #22c55e; }
    .stat.tested .stat-val { color: var(--color-primary); }
    .stat.untested .stat-val { color: #f59e0b; }

    /* Company sections */
    .company-section { margin-bottom: 2rem; }
    .company-header { display: flex; align-items: center; gap: 10px; margin-bottom: .75rem; }
    .company-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
    .company-count { font-size: .72rem; font-weight: 700; padding: 2px 10px; border-radius: 100px; background: var(--color-border-light); color: var(--color-text-subtle); }

    .apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }

    /* App card */
    .app-card {
      border: 1px solid var(--color-border-light); border-radius: var(--radius-md);
      background: var(--color-bg-card); overflow: hidden; transition: border-color .15s;
      display: flex; flex-direction: column;
    }
    .app-card:hover { border-color: var(--color-primary); }
    .app-card.running { border-left: 3px solid #22c55e; }
    .app-card.error { border-left: 3px solid #f85149; }

    .app-card-top { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); }
    .app-badges { display: flex; gap: 6px; align-items: center; }
    .type-badge {
      font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      padding: 2px 8px; border-radius: 100px; background: rgba(212,175,55,.1); color: var(--color-primary);
    }
    .type-badge[data-type="backend"] { background: rgba(96,165,250,.1); color: #60a5fa; }
    .type-badge[data-type="service"] { background: rgba(167,139,250,.1); color: #a78bfa; }
    .type-badge[data-type="database"] { background: rgba(251,146,60,.1); color: #fb923c; }
    .tested-badge { display: flex; align-items: center; gap: 2px; font-size: .62rem; font-weight: 700; color: #22c55e; }
    .tested-badge mat-icon { font-size: 12px; width: 12px; height: 12px; }

    .app-status-pill { display: flex; align-items: center; gap: 4px; font-size: .68rem; font-weight: 600; }
    .s-dot { width: 6px; height: 6px; border-radius: 50%; }
    .s-running { color: #22c55e; } .s-running .s-dot { background: #22c55e; }
    .s-stopped { color: var(--color-text-subtle); } .s-stopped .s-dot { background: var(--color-text-subtle); }
    .s-building { color: #f59e0b; } .s-building .s-dot { background: #f59e0b; }
    .s-error { color: #f85149; } .s-error .s-dot { background: #f85149; }

    .app-card-body { padding: 14px; flex: 1; }
    .app-name { margin: 0 0 4px; font-size: .95rem; font-weight: 700; color: var(--color-text); }
    .app-purpose { margin: 0 0 4px; font-size: .82rem; color: var(--color-primary); font-weight: 600; }
    .app-desc { margin: 0 0 8px; font-size: .78rem; color: var(--color-text-subtle); }
    .app-meta-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .meta { display: flex; align-items: center; gap: 3px; font-size: .72rem; color: var(--color-text-subtle); font-family: 'Fira Code', monospace; }
    .meta mat-icon { font-size: 13px; width: 13px; height: 13px; }

    /* Screenshot carousel */
    .app-carousel { padding: 8px 14px; border-top: 1px solid var(--color-border-light); }
    .carousel-header { display: flex; align-items: center; gap: 6px; font-size: .75rem; color: var(--color-text-subtle); margin-bottom: 6px; }
    .carousel-icon { font-size: 16px; width: 16px; height: 16px; }
    .carousel-track { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; scroll-snap-type: x mandatory; }
    .carousel-slide {
      scroll-snap-align: start; flex-shrink: 0; position: relative; cursor: pointer;
      border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border-light); transition: border-color .2s, transform .2s;
    }
    .carousel-slide:hover { border-color: var(--color-primary); transform: scale(1.03); }
    .carousel-slide img { width: 140px; height: 90px; object-fit: cover; display: block; }
    .slide-caption {
      position: absolute; bottom: 0; left: 0; right: 0; padding: 2px 6px;
      background: rgba(0,0,0,.6); color: #fff; font-size: .6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .gallery-thumb {
      width: 64px; height: 48px; flex-shrink: 0; border-radius: 4px; overflow: hidden;
      cursor: pointer; border: 1px solid var(--color-border-light); transition: border-color .15s;
    }
    .gallery-thumb:hover { border-color: var(--color-primary); }
    .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .gallery-count { display: block; font-size: .65rem; color: var(--color-text-subtle); margin-top: 2px; }

    /* Actions */
    .test-instructions-section { border-top: 1px solid var(--color-border-light); }
    .test-toggle {
      display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 14px;
      border: none; background: none; color: var(--color-text-subtle); cursor: pointer;
      font-family: inherit; font-size: .75rem; font-weight: 600;
    }
    .test-toggle:hover { color: var(--color-primary); background: rgba(212,175,55,0.04); }
    .test-toggle mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .test-toggle .chevron { margin-left: auto; }
    .test-body {
      padding: 0 14px 12px; font-size: .78rem; color: var(--color-text); line-height: 1.5;
      white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto;
      background: rgba(0,0,0,0.08); margin: 0 8px 8px; border-radius: var(--radius-sm); padding: 10px 12px;
    }

    .app-card-actions { display: flex; gap: 4px; padding: 8px 14px; border-top: 1px solid var(--color-border-light); }
    .app-btn {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); cursor: pointer;
    }
    .app-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .app-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Lightbox */
    .lightbox {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,.85); display: flex; flex-direction: column;
      align-items: center; justify-content: center; cursor: pointer;
    }
    .lightbox img { max-width: 90vw; max-height: 80vh; border-radius: 8px; cursor: default; }
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
    .lightbox-prev { left: 24px; }
    .lightbox-next { right: 24px; }
    .lightbox-counter {
      position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,.8); font-size: .8rem; background: rgba(0,0,0,.4);
      padding: 4px 12px; border-radius: 12px;
    }
  `],
})
export class ApplicationsComponent implements OnInit {
  loading = true;
  projects: Project[] = [];
  infraStatus: any = null;
  lightboxUrl = '';
  lightboxCaption = '';
  lightboxScreenshots: any[] = [];
  lightboxIndex = 0;
  lightboxCompanyId = '';
  lightboxAppName = '';
  appScreenshots: Record<string, any[]> = {};  // key: "projectId/appName"

  get groupedApps(): { companyId: string; companyName: string; apps: Application[] }[] {
    return this.projects
      .filter(p => (p.applications || []).length > 0)
      .map(p => ({ companyId: p._id!, companyName: p.name, apps: p.applications || [] }));
  }

  get totalApps(): number { return this.projects.reduce((s, p) => s + (p.applications || []).length, 0); }
  get companiesWithApps(): number { return this.projects.filter(p => (p.applications || []).length > 0).length; }
  get runningApps(): number { return this.projects.reduce((s, p) => s + (p.applications || []).filter(a => a.status === 'running').length, 0); }
  get testedApps(): number { return this.projects.reduce((s, p) => s + (p.applications || []).filter(a => a.tested).length, 0); }
  get untestedApps(): number { return this.totalApps - this.testedApps; }

  constructor(
    private projectService: ProjectService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  getAppScreenshots(companyId: string, appName: string): any[] {
    return this.appScreenshots[companyId + '/' + appName] || [];
  }

  private loadAllScreenshots(): void {
    for (const p of this.projects) {
      for (const app of (p.applications || [])) {
        this.projectService.listScreenshots(p._id!, app.name).subscribe({
          next: (list) => { this.appScreenshots[p._id + '/' + app.name] = list; },
          error: () => {},
        });
      }
    }
  }

  ngOnInit(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => { this.projects = projects; this.loading = false; this.loadAllScreenshots(); },
      error: () => { this.loading = false; },
    });
    this.projectService.getInfraStatus().subscribe({
      next: (s) => this.infraStatus = s,
      error: () => {},
    });
  }

  getScreenshotUrl(companyId: string, appName: string, filename: string): string {
    const token = this.authService.getToken();
    return `${environment.apiUrl}/companies/${companyId}/applications/${encodeURIComponent(appName)}/screenshots/${encodeURIComponent(filename)}?token=${token}`;
  }

  openScreenshot(companyId: string, appName: string, ss: any, allScreenshots?: any[], index?: number): void {
    this.lightboxCompanyId = companyId;
    this.lightboxAppName = appName;
    this.lightboxScreenshots = allScreenshots || [ss];
    this.lightboxIndex = index ?? 0;
    this.lightboxUrl = this.getScreenshotUrl(companyId, appName, ss.filename);
    this.lightboxCaption = ss.caption || ss.originalName;
  }

  lightboxNav(delta: number, event: Event): void {
    event.stopPropagation();
    const newIdx = this.lightboxIndex + delta;
    if (newIdx < 0 || newIdx >= this.lightboxScreenshots.length) return;
    this.lightboxIndex = newIdx;
    const ss = this.lightboxScreenshots[newIdx];
    this.lightboxUrl = this.getScreenshotUrl(this.lightboxCompanyId, this.lightboxAppName, ss.filename);
    this.lightboxCaption = ss.caption || ss.originalName;
  }

  openAppUrl(app: Application): void {
    window.open(`https://nonshattering-adelaida-ponchoed.ngrok-free.dev${app.basePath}/`, '_blank');
  }

  toggleStatus(companyId: string, app: Application): void {
    const newStatus = app.status === 'running' ? 'stopped' : 'running';
    this.projectService.updateApplication(companyId, app.name, { status: newStatus }).subscribe({
      next: () => { app.status = newStatus; },
      error: () => this.snackBar.open('Failed to update', 'Close', { duration: 3000 }),
    });
  }

  toggleTested(companyId: string, app: Application): void {
    const newTested = !app.tested;
    this.projectService.updateApplication(companyId, app.name, { tested: newTested }).subscribe({
      next: () => { app.tested = newTested; },
      error: () => this.snackBar.open('Failed to update', 'Close', { duration: 3000 }),
    });
  }
}
