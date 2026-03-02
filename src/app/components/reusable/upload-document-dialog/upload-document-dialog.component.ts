import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif';
const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
];

@Component({
  selector: 'app-upload-document-dialog',
  templateUrl: './upload-document-dialog.component.html',
  styleUrl: './upload-document-dialog.component.scss',
  standalone: false,
})
export class UploadDocumentDialogComponent {
  form: FormGroup;
  acceptedTypes = ACCEPTED_TYPES;
  acceptedTypesLabel = 'PDF (.pdf), Word (.doc, .docx), Text (.txt), Images (.jpg, .jpeg, .png, .gif)';
  imagePreview: string | null = null;
  selectedFileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UploadDocumentDialogComponent>
  ) {
    this.form = this.fb.group({
      referenceNumber: ['', Validators.required],
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

    if (!file) {
      this.form.patchValue({ file: null });
      return;
    }

    const mime = file.type.toLowerCase();
    const allowed = ACCEPTED_MIME.some((t) => mime === t || mime.startsWith('image/'));
    if (!allowed) {
      this.form.patchValue({ file: null });
      this.form.get('file')?.setErrors({ invalidType: true });
      return;
    }

    this.form.patchValue({ file });
    this.selectedFileName = file.name;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const ref = this.form.value.referenceNumber as string;
    const f = this.form.value.file as File;
    const logPayload = {
      referenceNumber: ref,
      fileName: f.name,
      fileSize: f.size,
      fileType: f.type,
    };
    console.log(logPayload);
    // Return both for parent (edit form) and for logging
    this.dialogRef.close({ referenceNumber: ref, file: f });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
