import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  ApiService,
  CreateVendorRequest,
  VendorListItem,
} from '../../services/api.service';

@Component({
  selector: 'app-add-vendor',
  templateUrl: './add-vendor.component.html',
  styleUrl: './add-vendor.component.scss',
  standalone: false,
})
export class AddVendorComponent implements OnInit {
  readonly form: FormGroup;

  loadingLookups = signal(false);
  submitting = signal(false);
  isEditMode = signal(false);
  editingVendorId = signal<number | null>(null);

  vendorTypeOptions: { label: string; value: number }[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.form = this.fb.group({
      vendorName: ['', Validators.required],
      vendorWebsite: ['', Validators.required],
      vendorEmail: ['', [Validators.required, Validators.email]],
      vendorPhone: ['', Validators.required],
      vendorTypeId: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.hydrateEditState();
    this.loadLookups();
  }

  get pageTitle(): string {
    return this.isEditMode() ? 'Edit Vendor' : 'Add a New Vendor';
  }

  get pageSubtitle(): string {
    return this.isEditMode()
      ? 'Review and update vendor details.'
      : 'Fill in the details below to add a new Vendor to the monitoring system';
  }

  get submitLabel(): string {
    return this.isEditMode() ? 'Update Vendor' : 'Add Vendor';
  }

  private hydrateEditState(): void {
    const state = (history.state ?? {}) as { mode?: string; vendor?: VendorListItem };
    const vendor = state.vendor;
    if (!vendor || state.mode !== 'edit') return;

    this.isEditMode.set(true);
    this.editingVendorId.set(Number(vendor.id));
    this.form.patchValue({
      vendorName: vendor.vendorName ?? '',
      vendorWebsite: vendor.vendorWebsite ?? '',
      vendorEmail: this.readVendorField(vendor, ['vendorEmail', 'email', 'contactEmail']),
      vendorPhone: this.readVendorField(vendor, ['vendorPhone', 'vendorPhoneNumber', 'phoneNumber', 'phone', 'contactPhone']),
      vendorTypeId: vendor.vendorTypeId ?? null,
    });
  }

  getControl(name: string): FormControl {
    return this.form.get(name) as FormControl;
  }

  private loadLookups(): void {
    this.loadingLookups.set(true);
    this.api.getCommonLookupByType('VendorType').subscribe({
      next: (res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        this.vendorTypeOptions = items.map((i) => ({ label: i.name, value: i.id }));
      },
      error: () => {},
      complete: () => this.loadingLookups.set(false),
    });
  }

  onCancel(): void {
    this.router.navigate(['/setup/vendors']);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;

    const raw = this.form.value as {
      vendorName: string;
      vendorWebsite: string;
      vendorEmail: string;
      vendorPhone: string;
      vendorTypeId: number;
    };

    const payload: CreateVendorRequest = {
      vendorName: raw.vendorName.trim(),
      vendorWebsite: raw.vendorWebsite.trim(),
      vendorEmail: raw.vendorEmail.trim(),
      vendorPhone: raw.vendorPhone.trim(),
      vendorTypeId: Number(raw.vendorTypeId),
    };

    this.submitting.set(true);

    if (this.isEditMode()) {
      const id = this.editingVendorId();
      if (id == null || !Number.isFinite(id)) {
        this.submitting.set(false);
        this.toastr.error('Invalid vendor id for update.');
        return;
      }
      this.api.updateVendor(id, payload).subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.isSuccessful) {
            this.toastr.success( 'Vendor updated successfully.');
            this.router.navigate(['/setup/vendors']);
          } else {
            this.toastr.error(res.message || 'Could not update vendor.');
          }
        },
        error: () => {
          this.submitting.set(false);
          this.toastr.error('Could not update vendor.');
        },
      });
      return;
    }

    this.api.createVendor(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.isSuccessful) {
          this.toastr.success('Vendor added successfully.');
          this.router.navigate(['/setup/vendors']);
        } else {
          this.toastr.error(res.message || 'Could not add vendor.');
        }
      },
      error: () => {
        this.submitting.set(false);
        this.toastr.error('Could not add vendor.');
      },
    });
  }

  private readVendorField(vendor: VendorListItem, keys: string[]): string {
    const row = vendor as unknown as Record<string, unknown>;
    for (const key of keys) {
      const value = row[key];
      if (value == null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return '';
  }
}
