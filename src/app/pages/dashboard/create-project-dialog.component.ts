import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'app-create-project-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatOptionModule,
  ],
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <h2>New Company</h2>
        <button class="close-btn" mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <form [formGroup]="form" class="create-form">
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Company Name</mat-label>
            <input matInput formControlName="name" required />
          </mat-form-field>

          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Background Image URL</mat-label>
            <input matInput formControlName="backgroundImage" />
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>MRR ($)</mat-label>
              <input matInput type="number" formControlName="mrr" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Clients</mat-label>
              <input matInput type="number" formControlName="clientCount" />
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Impact</mat-label>
              <mat-select formControlName="impact">
                <mat-option value="low">Low</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="high">High</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hours/Week</mat-label>
              <input matInput type="number" formControlName="timeConsumption" />
            </mat-form-field>
          </div>

          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Niche</mat-label>
            <input matInput formControlName="niche" />
          </mat-form-field>

          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Monetization Plan</mat-label>
            <textarea matInput formControlName="monetizationPlan" rows="3"
              placeholder="How will this company generate revenue?"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <div class="dialog-actions">
        <button class="btn-secondary" mat-dialog-close>Cancel</button>
        <button class="btn-primary" [disabled]="form.invalid" (click)="submit()">
          Create Company
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-wrapper {
      padding: 4px;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .dialog-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      border-radius: var(--radius-sm);
      color: var(--color-text-subtle);
      cursor: pointer;
      transition: all var(--transition);
    }
    .close-btn:hover {
      background: var(--color-border-light);
    }
    .close-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 400px;
    }
    .full-width { width: 100%; }
    .form-row { display: flex; gap: 1rem; }
    .form-row mat-form-field { flex: 1; }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 8px;
    }
    .btn-secondary {
      padding: 10px 20px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-text);
      font-family: var(--font-family);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
    }
    .btn-secondary:hover {
      background: var(--color-bg);
    }
    .btn-primary {
      padding: 10px 20px;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--color-primary);
      color: white;
      font-family: var(--font-family);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-dark);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class CreateProjectDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateProjectDialogComponent>
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      backgroundImage: [''],
      mrr: [0],
      clientCount: [0],
      impact: ['low'],
      niche: [''],
      timeConsumption: [0],
      monetizationPlan: [''],
    });
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close({ ...this.form.value, todos: [] });
    }
  }
}
