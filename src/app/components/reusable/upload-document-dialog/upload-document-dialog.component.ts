import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiService } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';

export interface UploadDocumentDialogData {
  mode?: 'asset' | 'correspondence';
  correspondenceId?: number;
  /** Ministry ID for dispatch API (required when mode is 'correspondence') */
  ministryId?: number;
  initialReferenceNumber?: string;
}

/** Allowed file extensions (no .gif; includes .xlsx). */
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'];

/** Allowed MIME types (whitelist). Server should also validate MIME to block .exe/.html renamed as .jpg. */
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
];

/** Dangerous MIMEs: executables/scripts. Show specific error when detected (e.g. .exe/.html renamed as .jpg). */
const BLOCKED_MIME = [
  'application/x-msdownload',
  'application/x-msdos-executable',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'text/html',
  'application/xhtml+xml',
  'text/x-script',
];

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xlsx,.txt,.jpg,.jpeg,.png';
const ACCEPTED_TYPES_LABEL = 'PDF (.pdf), Word (.doc, .docx), Excel (.xlsx), Text (.txt), Images (.jpg, .jpeg, .png)';

@Component({
  selector: 'app-upload-document-dialog',
  templateUrl: './upload-document-dialog.component.html',
  styleUrl: './upload-document-dialog.component.scss',
  standalone: false,
})
export class UploadDocumentDialogComponent {
  form: FormGroup;
  acceptedTypes = ACCEPTED_TYPES;
  acceptedTypesLabel = ACCEPTED_TYPES_LABEL;
  imagePreview: string | null = null;
  selectedFileName: string | null = null;
  /** Specific file validation error for UI: 'gif' | 'dangerous' | 'invalid' | null */
  fileError: 'gif' | 'dangerous' | 'invalid' | null = null;
  /** Submitting dispatch API (correspondence mode) */
  submitting = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UploadDocumentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UploadDocumentDialogData | undefined,
    private apiService: ApiService,
    private utils: UtilsService,
  ) {
    this.form = this.fb.group({
      referenceNumber: [data?.initialReferenceNumber ?? '', Validators.required],
      file: [null as File | null, Validators.required],
    });
  }

  get referenceNumber() {
    return this.form.get('referenceNumber');
  }
  get file() {
    return this.form.get('file');
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imagePreview = null;
    this.selectedFileName = null;
    this.fileError = null;

    if (!file) {
      this.form.patchValue({ file: null });
      this.form.get('file')?.setErrors(null);
      return;
    }

    const ext = this.getExtension(file.name);
    const mime = (file.type || '').toLowerCase().trim();

    // 1. Block GIF explicitly (including animated) with clear message
    if (ext === 'gif' || mime === 'image/gif') {
      this.form.patchValue({ file: null });
      input.value = '';
      this.form.get('file')?.setErrors({ invalidType: true });
      this.fileError = 'gif';
      return;
    }

    // 2. Block dangerous MIMEs (e.g. .exe or .html renamed as .jpg) – server also validates
    if (mime && BLOCKED_MIME.some((b) => mime === b || mime.startsWith(b))) {
      this.form.patchValue({ file: null });
      input.value = '';
      this.form.get('file')?.setErrors({ invalidType: true });
      this.fileError = 'dangerous';
      return;
    }

    // 3. Whitelist: extension and MIME must both be allowed (MIME may include charset, e.g. image/jpeg; charset=utf-8)
    const extOk = ALLOWED_EXTENSIONS.includes(ext);
    const mimeBase = mime.split(';')[0].trim();
    const mimeOk = ALLOWED_MIME.some((t) => mimeBase === t);
    if (!extOk || !mimeOk) {
      this.form.patchValue({ file: null });
      input.value = '';
      this.form.get('file')?.setErrors({ invalidType: true });
      this.fileError = 'invalid';
      return;
    }

    this.form.patchValue({ file });
    this.selectedFileName = file.name;
    this.form.get('file')?.setErrors(null);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  private getExtension(filename: string): string {
    const name = (filename || '').trim();
    const i = name.lastIndexOf('.');
    if (i < 0 || i === name.length - 1) return '';
    return name.slice(i + 1).toLowerCase();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const ref = (this.form.value.referenceNumber as string).trim();
    const f = this.form.value.file as File;

    if (this.data?.mode === 'correspondence') {
      if (this.data.ministryId == null) {
        this.utils.showToast('Ministry not found. Cannot dispatch.', 'Dispatch', 'error');
        return;
      }
      this.submitting = true;
      this.apiService.dispatchCorrespondenceReport(this.data.ministryId, ref, f).subscribe({
        next: (res) => {
          this.submitting = false;
          if (res?.isSuccessful) {
            this.dialogRef.close({
              referenceNumber: ref,
              file: f,
              correspondenceId: this.data?.correspondenceId,
              success: true,
            });
          } else {
            this.utils.showToast(res?.message ?? 'Failed to dispatch correspondence.', 'Dispatch', 'error');
          }
        },
        error: (err) => {
          this.submitting = false;
          const msg = err?.error?.message ?? err?.message ?? 'Failed to dispatch correspondence.';
          this.utils.showToast(msg, 'Dispatch', 'error');
        },
      });
      return;
    }

    // Non-correspondence mode (e.g. asset): just close with data for parent
    this.dialogRef.close({ referenceNumber: ref, file: f });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
