import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  ApiService,
  PostServiceStepsRequest,
  PutServiceStepRequest,
} from '../../../services/api.service';

export type AddManualStepDialogMode = 'add' | 'edit';

export interface AddManualStepDialogInitial {
  stepName: string;
  description: string;
  displayOrder: number;
}

export interface AddManualStepDialogData {
  serviceId: number;
  placementOptions: number[];
  mode?: AddManualStepDialogMode;
  /** Required when mode === 'edit' */
  stepId?: number;
  /** From step.isManual — when editing a form (non-manual) step, step name stays disabled. */
  isManual?: boolean;
  initial?: AddManualStepDialogInitial;
}

/** `true` when step was saved via API; `null` when cancelled. */
export type AddManualStepDialogResult = boolean | null;

@Component({
  selector: 'app-add-manual-step-dialog',
  templateUrl: './add-manual-step-dialog.component.html',
  styleUrl: './add-manual-step-dialog.component.scss',
  standalone: false,
})
export class AddManualStepDialogComponent {
  readonly form: FormGroup;
  readonly placementSelectOptions: { label: string; value: number }[];
  submitting = false;

  readonly isEditMode: boolean;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<AddManualStepDialogComponent, AddManualStepDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AddManualStepDialogData,
    private readonly api: ApiService,
    private readonly toastr: ToastrService,
  ) {
    this.isEditMode = data.mode === 'edit';

    const placements =
      Array.isArray(data?.placementOptions) && data.placementOptions.length ? data.placementOptions : [1, 2, 3];

    this.placementSelectOptions = placements.map((n) => ({ label: String(n), value: n }));

    const initial = data.initial;
    const defaultOrder = initial?.displayOrder ?? placements[0];

    this.form = this.fb.group({
      stepName: [initial?.stepName?.trim() ?? '', Validators.required],
      displayOrder: [defaultOrder, Validators.required],
      description: [initial?.description ?? ''],
    });

    if (this.isEditMode && data.isManual === false) {
      this.form.get('stepName')?.disable({ emitEvent: false });
    }
  }

  get dialogTitle(): string {
    return this.isEditMode ? 'Edit Step' : 'Add Manual Steps';
  }

  get submitLabel(): string {
    return this.isEditMode ? 'Save' : 'Add Step';
  }

  getControl(name: string): FormControl {
    return this.form.get(name) as FormControl;
  }

  onClose(): void {
    if (this.submitting) return;
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const sid = this.data?.serviceId;
    if (sid == null || !Number.isFinite(sid)) {
      this.toastr.error('Invalid service.');
      return;
    }

    const raw = this.form.getRawValue() as { stepName: string; displayOrder: number; description?: string };

    if (this.isEditMode) {
      const stepId = this.data.stepId;
      if (stepId == null || !Number.isFinite(stepId)) {
        this.toastr.error('Invalid step.');
        return;
      }
      const payload: PutServiceStepRequest = {
        stepName: raw.stepName.trim(),
        description: (raw.description ?? '').trim(),
        displayOrder: Number(raw.displayOrder),
      };
      this.submitting = true;
      this.api.putServiceStep(sid, stepId, payload).subscribe({
        next: (res) => {
          this.submitting = false;
          if (res.isSuccessful) {
            this.toastr.success(res.message || 'Step updated successfully.');
            this.dialogRef.close(true);
          } else {
            this.toastr.error(res.message || 'Could not update step.');
          }
        },
        error: () => {
          this.submitting = false;
          this.toastr.error('Could not update step.');
        },
      });
      return;
    }

    const payload: PostServiceStepsRequest = {
      steps: [
        {
          stepName: raw.stepName.trim(),
          description: (raw.description ?? '').trim(),
          displayOrder: Number(raw.displayOrder),
        },
      ],
    };

    this.submitting = true;
    this.api.postServiceSteps(sid, payload).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.isSuccessful) {
          this.toastr.success(res.message || 'Step added successfully.');
          this.dialogRef.close(true);
        } else {
          this.toastr.error(res.message || 'Could not add step.');
        }
      },
      error: () => {
        this.submitting = false;
        this.toastr.error('Could not add step.');
      },
    });
  }
}
