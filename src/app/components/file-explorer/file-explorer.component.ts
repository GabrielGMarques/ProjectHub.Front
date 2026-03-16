import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  ext?: string;
}

@Component({
  selector: 'app-file-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <div class="explorer-container">
      @if (!project?.localPath) {
        <div class="no-path">
          <mat-icon>folder_off</mat-icon>
          <p>No local path configured for this project.</p>
          <p class="hint">Select a folder to start browsing files.</p>
          <div class="setup-folder">
            <div class="setup-input-row">
              <input class="setup-input" [(ngModel)]="manualPath" placeholder="e.g. D:\\Projects\\MyApp" />
              <button class="setup-browse-btn" (click)="openFolderPicker()" matTooltip="Browse folders">
                <mat-icon>folder_open</mat-icon>
              </button>
              <button class="setup-save-btn" (click)="saveLocalPath()" [disabled]="!manualPath.trim()">
                <mat-icon>check</mat-icon> Set Path
              </button>
            </div>
            @if (showFolderPicker) {
              <div class="picker-panel">
                <div class="picker-header">
                  <span class="picker-title"><mat-icon>folder</mat-icon> Select Folder</span>
                  <button class="picker-close" (click)="showFolderPicker = false"><mat-icon>close</mat-icon></button>
                </div>
                <div class="picker-nav">
                  @if (pickerParent !== null) {
                    <button class="picker-up" (click)="browsePicker(pickerParent!)" matTooltip="Go up"><mat-icon>arrow_upward</mat-icon> Up</button>
                  }
                  <span class="picker-current">{{ pickerCurrent || 'Drives' }}</span>
                </div>
                @if (pickerLoading) {
                  <div class="picker-loading"><mat-spinner diameter="20"></mat-spinner></div>
                } @else {
                  <div class="picker-list">
                    @for (entry of pickerEntries; track entry.path) {
                      <div class="picker-item" (dblclick)="browsePicker(entry.path)">
                        <mat-icon class="picker-icon">folder</mat-icon>
                        <span class="picker-name">{{ entry.name }}</span>
                        <button class="picker-select" (click)="selectPickerFolder(entry.path)" matTooltip="Select">
                          <mat-icon>check</mat-icon>
                        </button>
                      </div>
                    }
                    @if (!pickerEntries.length) {
                      <div class="picker-empty">No subfolders</div>
                    }
                  </div>
                }
                @if (pickerCurrent) {
                  <div class="picker-footer">
                    <button class="picker-use-current" (click)="selectPickerFolder(pickerCurrent)">
                      <mat-icon>check_circle</mat-icon> Use current folder
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="explorer-layout">
          <!-- File Tree Panel -->
          <div class="file-panel" [class.collapsed]="!!openFile">
            <!-- Breadcrumb -->
            <div class="panel-header">
              <div class="breadcrumb">
                <button class="bc-root" (click)="navigateTo('')" matTooltip="Project root">
                  <mat-icon>home</mat-icon>
                </button>
                @for (crumb of breadcrumbs; track crumb.path) {
                  <mat-icon class="bc-sep">chevron_right</mat-icon>
                  <button class="bc-item" (click)="navigateTo(crumb.path)">{{ crumb.name }}</button>
                }
              </div>
              <div class="panel-actions">
                <button class="toggle-panel" (click)="openInOsExplorer()" matTooltip="Open in OS file explorer">
                  <mat-icon>launch</mat-icon>
                </button>
                @if (openFile) {
                  <button class="toggle-panel" (click)="openFile = null; modified = false" matTooltip="Back to files">
                    <mat-icon>folder_open</mat-icon>
                  </button>
                }
              </div>
            </div>

            @if (loading) {
              <div class="panel-loading"><mat-spinner diameter="28"></mat-spinner></div>
            } @else {
              <div class="file-list">
                @if (currentPath && parentPath !== null) {
                  <div class="file-item dir" (click)="navigateTo(parentPath!)">
                    <mat-icon class="file-icon dir-icon">subdirectory_arrow_left</mat-icon>
                    <span class="file-name">..</span>
                  </div>
                }
                @for (entry of entries; track entry.path) {
                  <div class="file-item" [class.dir]="entry.isDir"
                       [class.active]="openFile?.path === entry.path"
                       (click)="entry.isDir ? navigateTo(entry.path) : openFileEntry(entry)">
                    <mat-icon class="file-icon" [class.dir-icon]="entry.isDir">{{ getIcon(entry) }}</mat-icon>
                    <span class="file-name">{{ entry.name }}</span>
                    @if (!entry.isDir && entry.size !== undefined) {
                      <span class="file-size">{{ formatSize(entry.size) }}</span>
                    }
                  </div>
                }
                @if (entries.length === 0) {
                  <div class="empty-dir">
                    <mat-icon>folder_open</mat-icon>
                    <span>Empty directory</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Editor Panel -->
          @if (openFile) {
            <div class="editor-panel">
              <div class="editor-header">
                <div class="editor-file-info">
                  <mat-icon class="editor-icon">{{ getIconByExt(openFile.ext || '') }}</mat-icon>
                  <span class="editor-filename">{{ openFile.name }}</span>
                  @if (modified) {
                    <span class="modified-badge">Modified</span>
                  }
                </div>
                <div class="editor-actions">
                  @if (modified) {
                    <button class="editor-btn save" (click)="saveFile()" [disabled]="saving" matTooltip="Save (Ctrl+S)">
                      <mat-icon>save</mat-icon> Save
                    </button>
                    <button class="editor-btn discard" (click)="discardChanges()" matTooltip="Discard changes">
                      <mat-icon>undo</mat-icon>
                    </button>
                  }
                  <button class="editor-btn close" (click)="closeEditor()" matTooltip="Close file">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>

              @if (fileLoading) {
                <div class="editor-loading"><mat-spinner diameter="28"></mat-spinner></div>
              } @else if (fileTooLarge) {
                <div class="file-too-large">
                  <mat-icon>warning</mat-icon>
                  <p>File is too large to display (max 2MB)</p>
                </div>
              } @else if (isBinaryFile) {
                <div class="file-too-large">
                  <mat-icon>block</mat-icon>
                  <p>Binary file cannot be displayed</p>
                </div>
              } @else {
                <div class="editor-body">
                  <div class="line-numbers" #lineNumbers>
                    @for (line of lineCount; track $index) {
                      <span>{{ $index + 1 }}</span>
                    }
                  </div>
                  <textarea
                    #editorTextarea
                    class="code-editor"
                    [value]="fileContent"
                    (input)="onEditorInput($event)"
                    (scroll)="syncScroll($event)"
                    (keydown)="onKeyDown($event)"
                    spellcheck="false"
                    wrap="off"
                  ></textarea>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .explorer-container { min-height: 400px; }

    .no-path {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 3rem; text-align: center; color: var(--color-text-subtle);
    }
    .no-path mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.4; }
    .no-path p { margin: 0.25rem 0; font-size: 0.9rem; }
    .no-path .hint { font-size: 0.8rem; opacity: 0.7; margin-bottom: 1rem; }

    /* Folder Setup */
    .setup-folder { width: 100%; max-width: 500px; margin-top: 0.5rem; }
    .setup-input-row { display: flex; gap: 8px; align-items: center; }
    .setup-input {
      flex: 1; padding: 10px 14px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-text);
      font-family: inherit; font-size: 0.85rem; outline: none;
    }
    .setup-input::placeholder { color: var(--color-text-subtle); }
    .setup-input:focus { border-color: var(--color-primary); }
    .setup-browse-btn {
      width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg-card); color: var(--color-text-subtle); cursor: pointer; flex-shrink: 0;
    }
    .setup-browse-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .setup-browse-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .setup-save-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 10px 18px; border: none; border-radius: var(--radius-sm);
      background: var(--color-primary); color: #0A0A0A; font-family: inherit;
      font-size: 0.85rem; font-weight: 600; cursor: pointer; flex-shrink: 0;
    }
    .setup-save-btn:hover:not(:disabled) { opacity: 0.9; }
    .setup-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .setup-save-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Folder Picker */
    .picker-panel {
      margin-top: 10px; border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md); background: var(--color-bg-card); overflow: hidden;
    }
    .picker-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid var(--color-border-light);
    }
    .picker-title { display: flex; align-items: center; gap: 6px; font-size: 0.88rem; font-weight: 700; color: var(--color-text); }
    .picker-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .picker-close { border: none; background: none; color: var(--color-text-subtle); cursor: pointer; display: flex; }
    .picker-close mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .picker-nav {
      display: flex; align-items: center; gap: 8px; padding: 8px 14px;
      background: var(--color-bg); border-bottom: 1px solid var(--color-border-light);
    }
    .picker-up {
      display: flex; align-items: center; gap: 4px; border: 1px solid var(--color-border);
      border-radius: var(--radius-sm); background: var(--color-bg-card); color: var(--color-text-subtle);
      font-family: inherit; font-size: 0.75rem; font-weight: 600; padding: 4px 8px; cursor: pointer;
    }
    .picker-up:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .picker-up mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .picker-current { font-size: 0.78rem; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .picker-loading { padding: 1.5rem; text-align: center; display: flex; justify-content: center; }
    .picker-list { max-height: 240px; overflow-y: auto; }
    .picker-item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; cursor: pointer; transition: background 0.15s; }
    .picker-item:hover { background: var(--color-bg); }
    .picker-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; }
    .picker-name { flex: 1; font-size: 0.82rem; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .picker-select {
      width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: none; color: var(--color-text-subtle); cursor: pointer; flex-shrink: 0; opacity: 0; transition: opacity 0.15s;
    }
    .picker-item:hover .picker-select { opacity: 1; }
    .picker-select:hover { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.08); }
    .picker-select mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .picker-empty { padding: 1.5rem; text-align: center; font-size: 0.82rem; color: var(--color-text-subtle); font-style: italic; }
    .picker-footer { padding: 10px 14px; border-top: 1px solid var(--color-border-light); }
    .picker-use-current {
      display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 14px;
      border: none; border-radius: var(--radius-sm); background: var(--color-primary);
      color: #0A0A0A; font-family: inherit; font-size: 0.82rem; font-weight: 600;
      cursor: pointer; justify-content: center;
    }
    .picker-use-current:hover { opacity: 0.9; }
    .picker-use-current mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .panel-actions { display: flex; gap: 4px; flex-shrink: 0; }

    .explorer-layout { display: flex; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; min-height: 500px; background: var(--color-bg); }

    /* File Panel */
    .file-panel { width: 300px; min-width: 300px; border-right: 1px solid var(--color-border); display: flex; flex-direction: column; background: var(--color-bg-card); }
    .file-panel.collapsed { width: 260px; min-width: 260px; }

    .panel-header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 8px 12px; border-bottom: 1px solid var(--color-border-light);
      background: rgba(212, 175, 55, 0.04);
    }
    .breadcrumb { display: flex; align-items: center; gap: 2px; flex: 1; overflow: hidden; }
    .bc-root {
      border: none; background: none; color: var(--color-text-subtle);
      cursor: pointer; padding: 4px; display: flex; border-radius: var(--radius-sm);
    }
    .bc-root:hover { color: var(--color-primary); background: rgba(212, 175, 55, 0.08); }
    .bc-root mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .bc-sep { font-size: 14px; width: 14px; height: 14px; color: var(--color-text-subtle); opacity: 0.5; }
    .bc-item {
      border: none; background: none; color: var(--color-text);
      font-family: inherit; font-size: 0.78rem; font-weight: 600;
      cursor: pointer; padding: 2px 4px; border-radius: var(--radius-sm);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;
    }
    .bc-item:hover { color: var(--color-primary); background: rgba(212, 175, 55, 0.08); }
    .bc-item:last-child { color: var(--color-primary); }

    .toggle-panel {
      border: 1px solid var(--color-border); background: var(--color-bg);
      color: var(--color-text-subtle); cursor: pointer; padding: 4px;
      border-radius: var(--radius-sm); display: flex; flex-shrink: 0;
    }
    .toggle-panel:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .toggle-panel mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .panel-loading { display: flex; justify-content: center; padding: 2rem; }

    .file-list { flex: 1; overflow-y: auto; }
    .file-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px; cursor: pointer; transition: background 0.15s;
      border-left: 2px solid transparent;
    }
    .file-item:hover { background: rgba(212, 175, 55, 0.06); }
    .file-item.active { background: rgba(212, 175, 55, 0.1); border-left-color: var(--color-primary); }
    .file-item.dir { font-weight: 600; }
    .file-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-text-subtle); flex-shrink: 0; }
    .file-icon.dir-icon { color: var(--color-primary); }
    .file-name { flex: 1; font-size: 0.82rem; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-size { font-size: 0.72rem; color: var(--color-text-subtle); flex-shrink: 0; }

    .empty-dir {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 2rem; color: var(--color-text-subtle); font-size: 0.82rem;
    }
    .empty-dir mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.4; }

    /* Editor Panel */
    .editor-panel { flex: 1; display: flex; flex-direction: column; min-width: 0; }

    .editor-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px; border-bottom: 1px solid var(--color-border-light);
      background: var(--color-bg-card);
    }
    .editor-file-info { display: flex; align-items: center; gap: 8px; overflow: hidden; }
    .editor-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; }
    .editor-filename { font-size: 0.85rem; font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .modified-badge {
      font-size: 0.68rem; font-weight: 700; color: var(--color-primary);
      background: rgba(212, 175, 55, 0.12); padding: 2px 8px; border-radius: 10px;
      flex-shrink: 0;
    }

    .editor-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .editor-btn {
      display: flex; align-items: center; gap: 4px;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text-subtle);
      font-family: inherit; font-size: 0.78rem; font-weight: 600;
      padding: 4px 10px; cursor: pointer; transition: all 0.15s;
    }
    .editor-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .editor-btn.save { border-color: #22c55e40; color: #22c55e; }
    .editor-btn.save:hover:not(:disabled) { background: #22c55e15; border-color: #22c55e; }
    .editor-btn.save:disabled { opacity: 0.5; cursor: not-allowed; }
    .editor-btn.discard:hover { border-color: #f59e0b; color: #f59e0b; }
    .editor-btn.close:hover { border-color: var(--color-text-subtle); color: var(--color-text); }

    .editor-loading, .file-too-large {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      flex: 1; padding: 2rem; color: var(--color-text-subtle);
    }
    .file-too-large mat-icon { font-size: 36px; width: 36px; height: 36px; margin-bottom: 0.5rem; opacity: 0.5; }

    .editor-body { flex: 1; display: flex; overflow: hidden; position: relative; }
    .line-numbers {
      display: flex; flex-direction: column; align-items: flex-end;
      padding: 12px 8px 12px 12px; background: rgba(0, 0, 0, 0.15);
      color: var(--color-text-subtle); font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 0.8rem; line-height: 1.5; user-select: none;
      overflow: hidden; min-width: 40px; border-right: 1px solid var(--color-border-light);
    }
    .line-numbers span { opacity: 0.5; }

    .code-editor {
      flex: 1; padding: 12px; border: none; outline: none; resize: none;
      background: var(--color-bg); color: var(--color-text);
      font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.8rem;
      line-height: 1.5; tab-size: 2; white-space: pre;
      overflow: auto;
    }
    .code-editor::selection { background: rgba(212, 175, 55, 0.25); }
  `],
})
export class FileExplorerComponent implements OnInit, OnChanges {
  @Input() project!: Project;
  @Output() projectUpdated = new EventEmitter<Project>();
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lineNumbers') lineNumbers!: ElementRef<HTMLDivElement>;

  loading = false;
  entries: FileEntry[] = [];
  currentPath = '';
  parentPath: string | null = null;

  // Folder setup
  manualPath = '';
  showFolderPicker = false;
  pickerCurrent = '';
  pickerParent: string | null = null;
  pickerEntries: { name: string; path: string; isDir: boolean }[] = [];
  pickerLoading = false;

  openFile: FileEntry | null = null;
  fileContent = '';
  originalContent = '';
  fileLoading = false;
  fileTooLarge = false;
  isBinaryFile = false;
  modified = false;
  saving = false;

  private binaryExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.woff', '.woff2', '.ttf', '.eot', '.class', '.pyc', '.o', '.obj']);

  get breadcrumbs(): { name: string; path: string }[] {
    if (!this.currentPath) return [];
    const parts = this.currentPath.split('/');
    return parts.map((name, i) => ({
      name,
      path: parts.slice(0, i + 1).join('/'),
    }));
  }

  get lineCount(): number[] {
    const count = (this.fileContent || '').split('\n').length;
    return new Array(count);
  }

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    if (this.project?.localPath) {
      this.navigateTo('');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !changes['project'].firstChange) {
      this.navigateTo('');
      this.openFile = null;
      this.modified = false;
    }
  }

  navigateTo(dirPath: string): void {
    if (!this.project?._id) return;
    // Fix parent ".." navigation
    if (dirPath === '.') dirPath = '';
    this.loading = true;
    this.projectService.listFiles(this.project._id, dirPath || undefined).subscribe({
      next: (res) => {
        this.currentPath = res.current;
        this.parentPath = res.parent;
        this.entries = res.entries;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load files', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  openFileEntry(entry: FileEntry): void {
    if (!this.project?._id || entry.isDir) return;

    if (this.binaryExts.has(entry.ext || '')) {
      this.openFile = entry;
      this.isBinaryFile = true;
      this.fileTooLarge = false;
      this.fileContent = '';
      return;
    }

    this.openFile = entry;
    this.fileLoading = true;
    this.isBinaryFile = false;
    this.fileTooLarge = false;
    this.modified = false;

    this.projectService.readFile(this.project._id, entry.path).subscribe({
      next: (res) => {
        this.fileContent = res.content;
        this.originalContent = res.content;
        this.fileLoading = false;
      },
      error: (err) => {
        if (err.error?.error?.includes('too large')) {
          this.fileTooLarge = true;
        } else {
          this.snackBar.open('Failed to load file', 'Close', { duration: 3000 });
          this.openFile = null;
        }
        this.fileLoading = false;
      },
    });
  }

  onEditorInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.fileContent = textarea.value;
    this.modified = this.fileContent !== this.originalContent;
  }

  syncScroll(event: Event): void {
    if (this.lineNumbers) {
      const textarea = event.target as HTMLTextAreaElement;
      this.lineNumbers.nativeElement.scrollTop = textarea.scrollTop;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+S to save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (this.modified) this.saveFile();
      return;
    }

    // Tab key inserts spaces
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      textarea.value = value.substring(0, start) + '  ' + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      this.fileContent = textarea.value;
      this.modified = this.fileContent !== this.originalContent;
    }
  }

  saveFile(): void {
    if (!this.project?._id || !this.openFile) return;
    this.saving = true;
    this.projectService.writeFile(this.project._id, this.openFile.path, this.fileContent).subscribe({
      next: () => {
        this.originalContent = this.fileContent;
        this.modified = false;
        this.saving = false;
        this.snackBar.open('File saved', 'Close', { duration: 2000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save file', 'Close', { duration: 3000 });
      },
    });
  }

  discardChanges(): void {
    this.fileContent = this.originalContent;
    this.modified = false;
    if (this.editorTextarea) {
      this.editorTextarea.nativeElement.value = this.originalContent;
    }
  }

  closeEditor(): void {
    if (this.modified) {
      if (!confirm('You have unsaved changes. Close anyway?')) return;
    }
    this.openFile = null;
    this.modified = false;
    this.fileContent = '';
    this.originalContent = '';
  }

  // Folder setup
  openFolderPicker(): void {
    this.showFolderPicker = true;
    this.browsePicker(this.manualPath || '');
  }

  browsePicker(folderPath: string): void {
    this.pickerLoading = true;
    this.projectService.browseFolders(folderPath || undefined).subscribe({
      next: (res) => {
        this.pickerCurrent = res.current;
        this.pickerParent = res.parent ?? null;
        this.pickerEntries = res.entries;
        this.pickerLoading = false;
      },
      error: () => {
        this.pickerLoading = false;
        this.snackBar.open('Failed to browse folders', 'Close', { duration: 3000 });
      },
    });
  }

  selectPickerFolder(folderPath: string): void {
    this.manualPath = folderPath;
    this.showFolderPicker = false;
  }

  saveLocalPath(): void {
    const p = this.manualPath.trim();
    if (!p || !this.project?._id) return;
    this.projectService.update(this.project._id, { localPath: p }).subscribe({
      next: (updated) => {
        this.project = updated;
        this.projectUpdated.emit(updated);
        this.snackBar.open('Local path saved', 'Close', { duration: 2000 });
        this.navigateTo('');
      },
      error: () => this.snackBar.open('Failed to save local path', 'Close', { duration: 3000 }),
    });
  }

  openInOsExplorer(): void {
    if (!this.project?._id) return;
    this.projectService.openInExplorer(this.project._id, this.currentPath || undefined).subscribe({
      next: () => this.snackBar.open('Opened in file explorer', 'Close', { duration: 2000 }),
      error: () => this.snackBar.open('Failed to open file explorer', 'Close', { duration: 3000 }),
    });
  }

  getIcon(entry: FileEntry): string {
    if (entry.isDir) return 'folder';
    return this.getIconByExt(entry.ext || '');
  }

  getIconByExt(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'code', '.js': 'javascript', '.tsx': 'code', '.jsx': 'code',
      '.html': 'html', '.css': 'css', '.scss': 'css',
      '.json': 'data_object', '.yaml': 'settings', '.yml': 'settings',
      '.md': 'description', '.txt': 'description',
      '.py': 'code', '.rb': 'code', '.go': 'code', '.rs': 'code', '.java': 'code',
      '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.svg': 'image',
      '.pdf': 'picture_as_pdf',
      '.env': 'lock', '.gitignore': 'visibility_off',
    };
    return map[ext] || 'insert_drive_file';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
