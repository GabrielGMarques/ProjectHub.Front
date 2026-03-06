import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
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
    MatOptionModule,
  ],
  template: `
    <h2 mat-dialog-title>Create New Project</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="create-form">
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Project Name</mat-label>
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
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="submit()">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .create-form { display: flex; flex-direction: column; gap: 0.25rem; min-width: 400px; }
    .full-width { width: 100%; }
    .form-row { display: flex; gap: 1rem; }
    .form-row mat-form-field { flex: 1; }
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
    });
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
