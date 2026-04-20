import { Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';

export interface ServiceDialogAssetOption {
  label: string;
  value: number;
}

export interface ServiceDialogData {
  mode: 'create' | 'edit';
  ministryId: number;
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
export class ServiceDialogComponent implements OnDestroy {
  readonly form: FormGroup;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ServiceDialogComponent, ServiceDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ServiceDialogData,
    private readonly api: ApiService,
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

    this.setupServiceNameUniquenessValidation();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupServiceNameUniquenessValidation(): void {
    if (this.data.mode !== 'create') return;
    if (!Number.isFinite(this.data.ministryId) || this.data.ministryId <= 0) return;

    const nameControl = this.getControl('serviceName');
    nameControl.valueChanges
      .pipe(
        map((value) => String(value ?? '').trim()),
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((serviceName) => {
          this.setControlError(nameControl, 'notUnique', false);
          if (!serviceName) {
            return of<boolean | null>(null);
          }
          return this.api.validateServiceNameUnique(this.data.ministryId, serviceName).pipe(
            map((res) => (res?.isSuccessful ? res.data?.isUnique !== false : null)),
            catchError(() => of<boolean | null>(null)),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((isUnique) => {
        if (isUnique === false) {
          this.setControlError(nameControl, 'notUnique', true);
          nameControl.markAsTouched();
          return;
        }
        if (isUnique === true || isUnique === null) {
          this.setControlError(nameControl, 'notUnique', false);
        }
      });
  }

  private setControlError(control: FormControl, key: string, enabled: boolean): void {
    const existing = control.errors ?? {};
    if (enabled) {
      control.setErrors({ ...existing, [key]: true });
      return;
    }
    if (!(key in existing)) return;
    const { [key]: _removed, ...rest } = existing;
    control.setErrors(Object.keys(rest).length ? rest : null);
  }
}
