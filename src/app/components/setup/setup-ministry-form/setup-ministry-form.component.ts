import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService, UpsertMinistryApiRequest, CreateMinistryMultipartRequest } from '../../../services/api.service';
import { UploadDocumentDialogComponent } from '../../reusable/upload-document-dialog/upload-document-dialog.component';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-setup-ministry-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
  ],
  templateUrl: './setup-ministry-form.component.html',
  styleUrl: './setup-ministry-form.component.scss',
})
export class SetupMinistryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  saving = signal(false);
  loading = signal(false);
  error = signal('');
  formMode = signal<'add' | 'edit'>('add');
  ministryId = signal<number | null>(null);

  /** Ministry logo – optional; create: POST `logo` field; edit: PUT multipart when a new file is chosen. */
  logoFile = signal<File | null>(null);
  selectedLogoFileName = signal('No file Chosen');
  logoFileError = signal('');
  /** From API – show hint on edit when ministry already has a logo. */
  existingLogoAvailable = signal(false);

  form = this.fb.group({
    ministryName: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(500)]],
    contactName: ['', [Validators.required, Validators.maxLength(100)]],
    contactDesignation: ['', [Validators.required, Validators.maxLength(100)]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    contactPhone: ['', [Validators.required, Validators.maxLength(30), Validators.pattern(/^[0-9+\-() ]+$/)]],
  });

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private utils: UtilsService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (Number.isFinite(id) && id > 0) {
      this.formMode.set('edit');
      this.ministryId.set(id);
      this.loadMinistry(id);
    }
  }

  get isEditMode(): boolean {
    return this.formMode() === 'edit';
  }

  private loadMinistry(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.apiService.getMinistryById(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res?.isSuccessful) {
          this.error.set(res?.message || 'Failed to load ministry');
          return;
        }

        const data = (res.data as any)?.data ?? res.data ?? {};
        this.existingLogoAvailable.set(
          !!(data?.logoAvailable ?? data?.LogoAvailable ?? data?.hasLogo ?? data?.HasLogo),
        );
        this.form.patchValue({
          ministryName: data?.ministryName ?? '',
          description: data?.description ?? '',
          contactName: data?.contactName ?? '',
          contactDesignation: data?.contactDesignation ?? '',
          contactEmail: data?.contactEmail ?? '',
          contactPhone: data?.contactPhone ?? '',
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error loading ministry. Please try again.');
      },
    });
  }

  /**
   * Submit: open reference + file dialog (same as curl), then POST (add) or PUT multipart (edit) with refId, file, optional logo.
   */
  save(): void {
    this.error.set('');
    this.logoFileError.set('');
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.openUploadDocumentDialog();
  }

  onLogoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.logoFileError.set('');
    if (!file) {
      this.logoFile.set(null);
      this.selectedLogoFileName.set('No file Chosen');
      return;
    }
    const mime = (file.type || '').split(';')[0].trim().toLowerCase();
    const allowedMime = ['image/jpeg', 'image/png', 'image/gif'];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const okExt = ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
    if (!allowedMime.includes(mime) && !okExt) {
      this.logoFile.set(null);
      this.selectedLogoFileName.set('No file Chosen');
      input.value = '';
      this.logoFileError.set('Please select an image (.jpg, .jpeg, .png, .gif).');
      return;
    }
    this.logoFile.set(file);
    this.selectedLogoFileName.set(file.name);
  }

  /** Same dialog as Manage Digital Assets (`UploadDocumentDialogComponent`) – refId + reference file for API multipart. */
  private openUploadDocumentDialog(): void {
    const dialogRef = this.dialog.open(UploadDocumentDialogComponent, {
      width: '520px',
      disableClose: false,
      panelClass: 'upload-document-dialog-dark',
    });

    dialogRef.afterClosed().subscribe((result: { referenceNumber: string; file: File } | undefined) => {
      if (!result?.referenceNumber?.trim() || !result?.file) {
        return;
      }
      const body = this.buildMultipartBody(
        result.referenceNumber.trim(),
        result.file,
        this.logoFile(),
      );
      if (this.isEditMode && this.ministryId()) {
        this.runUpdateMultipart(body);
      } else {
        this.runCreateMultipart(body);
      }
    });
  }

  private buildMultipartBody(
    refId: string,
    dialogFile: File,
    logo: File | null,
  ): CreateMinistryMultipartRequest {
    const payload: UpsertMinistryApiRequest = {
      ministryName: this.form.value.ministryName?.trim() || '',
      contactName: this.form.value.contactName?.trim() || '',
      contactDesignation: this.form.value.contactDesignation?.trim() || '',
      contactEmail: this.form.value.contactEmail?.trim() || '',
      contactPhone: this.form.value.contactPhone?.trim() || '',
      description: this.form.value.description?.trim() || '',
    };

    return {
      ministryName: payload.ministryName,
      address: '',
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      contactDesignation: payload.contactDesignation,
      refId,
      file: dialogFile,
      ...(logo ? { logo } : {}),
      description: payload.description,
    };
  }

  private runCreateMultipart(body: CreateMinistryMultipartRequest): void {
    this.saving.set(true);
    this.error.set('');

    this.apiService.addMinistry(body).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (!res?.isSuccessful) {
          this.error.set(res?.message || 'Failed to add ministry');
          return;
        }
        this.utils.showToast(res?.message || 'Ministry created successfully.', 'Success', 'success');
        this.router.navigate(['/setup/ministries']);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Error adding ministry. Please try again.');
      },
    });
  }

  private runUpdateMultipart(body: CreateMinistryMultipartRequest): void {
    const id = this.ministryId();
    if (id == null) return;

    this.saving.set(true);
    this.error.set('');

    this.apiService.updateMinistry(id, body).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (!res?.isSuccessful) {
          this.error.set(res?.message || 'Failed to update ministry');
          return;
        }
        this.utils.showToast(res?.message || 'Ministry updated successfully.', 'Success', 'success');
        this.router.navigate(['/setup/ministries']);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Error updating ministry. Please try again.');
      },
    });
  }

  hasControlError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getControlError(controlName: string, label: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors || !(control.touched || control.dirty)) return '';
    return this.resolveErrorMessage(control, label);
  }

  private resolveErrorMessage(control: AbstractControl, label: string): string {
    const errors = control.errors;
    if (!errors) return '';
    if (errors['required']) return `${label} is required`;
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['maxlength']) return `${label} can be at most ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return 'Please enter a valid phone number';
    return 'Invalid value';
  }

}
