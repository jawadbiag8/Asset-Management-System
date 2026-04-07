import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

export interface ServiceDialogAssetOption {
  label: string;
  value: number;
}

export interface ServiceDialogData {
  mode: 'create' | 'edit';
  assetOptions: ServiceDialogAssetOption[];
  serviceTypeOptions: { label: string; value: number }[];
  service?: {
    serviceName: string;
    description?: string;
    serviceTypeId?: number | null;
    assetIds?: number[];
    assetId?: number | null;
  };
}

export interface ServiceDialogResult {
  serviceName: string;
  description: string;
  serviceTypeId: number;
  assetIds: number[];
}

@Component({
  selector: 'app-service-dialog',
  templateUrl: './service-dialog.component.html',
  styleUrl: './service-dialog.component.scss',
  standalone: false,
})
export class ServiceDialogComponent {
  readonly form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ServiceDialogComponent, ServiceDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ServiceDialogData,
  ) {
    this.form = this.fb.group({
      serviceName: [data.service?.serviceName ?? '', Validators.required],
      description: [data.service?.description ?? ''],
      serviceTypeId: [data.service?.serviceTypeId ?? null, Validators.required],
      assetIds: [
        Array.isArray(data.service?.assetIds)
          ? data.service!.assetIds
          : data.service?.assetId != null
            ? [data.service.assetId]
            : [],
      ],
    });
  }

  getControl(name: string): FormControl {
    return this.form.get(name) as FormControl;
  }

  onClose(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.value as {
      serviceName: string;
      description?: string;
      serviceTypeId: number;
      assetIds: number[];
    };
    this.dialogRef.close({
      serviceName: raw.serviceName.trim(),
      description: (raw.description ?? '').trim(),
      serviceTypeId: Number(raw.serviceTypeId),
      assetIds: Array.isArray(raw.assetIds)
        ? raw.assetIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
        : [],
    });
  }
}
