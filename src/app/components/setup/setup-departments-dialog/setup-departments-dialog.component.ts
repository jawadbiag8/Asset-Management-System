import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../services/api.service';

export interface SetupDepartmentsDialogData {
  ministryId: number;
  ministryName: string;
}

interface DepartmentItem {
  id: number;
  ministryId: number;
  departmentName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-setup-departments-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './setup-departments-dialog.component.html',
  styleUrls: ['./setup-departments-dialog.component.scss'],
})
export class SetupDepartmentsDialogComponent implements OnInit {
  loading = signal(false);
  creating = signal(false);
  deletingDepartmentId = signal<number | null>(null);
  editingDepartmentId = signal<number | null>(null);
  editingDepartmentName = signal('');
  updatingDepartmentId = signal<number | null>(null);
  error = signal('');
  departments = signal<DepartmentItem[]>([]);
  newDepartmentName = signal('');

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SetupDepartmentsDialogData,
    private dialogRef: MatDialogRef<SetupDepartmentsDialogComponent>,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  close(): void {
    this.dialogRef.close();
  }

  loadDepartments(): void {
    this.loading.set(true);
    this.error.set('');
    this.apiService.getDepartmentsByMinistry(this.data.ministryId).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res?.isSuccessful) {
          this.error.set(res?.message || 'Failed to load departments');
          this.departments.set([]);
          return;
        }

        const raw = (res.data as any)?.data ?? res.data ?? [];
        this.departments.set(Array.isArray(raw) ? raw : []);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error loading departments. Please try again.');
        this.departments.set([]);
      },
    });
  }

  addLocalDepartment(): void {
    const name = this.newDepartmentName().trim();
    if (!name || this.creating()) return;

    this.creating.set(true);
    this.error.set('');
    this.apiService
      .addDepartment({
        ministryId: this.data.ministryId,
        departmentName: name,
        contactName: '',
        contactEmail: '',
        contactPhone: '',
      })
      .subscribe({
        next: (res) => {
          this.creating.set(false);
          if (!res?.isSuccessful) {
            this.error.set(res?.message || 'Failed to create department');
            return;
          }
          this.newDepartmentName.set('');
          this.loadDepartments();
        },
        error: () => {
          this.creating.set(false);
          this.error.set('Error creating department. Please try again.');
        },
      });
  }

  startEditDepartment(d: DepartmentItem): void {
    if (this.deletingDepartmentId() != null || this.updatingDepartmentId() != null) return;
    this.error.set('');
    this.editingDepartmentId.set(d.id);
    this.editingDepartmentName.set(d.departmentName ?? '');
  }

  cancelEditDepartment(): void {
    this.editingDepartmentId.set(null);
    this.editingDepartmentName.set('');
  }

  saveDepartmentEdit(d: DepartmentItem): void {
    const updatedName = this.editingDepartmentName().trim();
    if (!updatedName || this.updatingDepartmentId() != null) return;

    this.error.set('');
    this.updatingDepartmentId.set(d.id);

    this.apiService
      .updateDepartment(d.id, {
        ministryId: d.ministryId || this.data.ministryId,
        departmentName: updatedName,
        contactName: d.contactName ?? '',
        contactEmail: d.contactEmail ?? '',
        contactPhone: d.contactPhone ?? '',
      })
      .subscribe({
        next: (res) => {
          this.updatingDepartmentId.set(null);
          if (!res?.isSuccessful) {
            this.error.set(res?.message || 'Failed to update department');
            return;
          }
          this.departments.update((list) =>
            list.map((item) =>
              item.id === d.id ? { ...item, departmentName: updatedName } : item,
            ),
          );
          this.cancelEditDepartment();
        },
        error: () => {
          this.updatingDepartmentId.set(null);
          this.error.set('Error updating department. Please try again.');
        },
      });
  }

  removeLocalDepartment(id: number): void {
    if (this.deletingDepartmentId() != null || this.updatingDepartmentId() != null) return;
    this.error.set('');
    this.deletingDepartmentId.set(id);
    this.apiService.deleteDepartment(id).subscribe({
      next: (res) => {
        this.deletingDepartmentId.set(null);
        if (!res?.isSuccessful) {
          this.error.set(res?.message || 'Failed to delete department');
          return;
        }
        this.departments.update((list) => list.filter((d) => d.id !== id));
      },
      error: () => {
        this.deletingDepartmentId.set(null);
        this.error.set('Error deleting department. Please try again.');
      },
    });
  }

  formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

