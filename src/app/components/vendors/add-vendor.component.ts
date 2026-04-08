import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  ApiService,
  CommonLookupItem,
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
  vendorStatusOptions: { label: string; value: number }[] = [];
  offeringOptions: CommonLookupItem[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.form = this.fb.group({
      vendorName: ['', Validators.required],
      vendorWebsite: ['', Validators.required],
      vendorTypeId: [null, Validators.required],
      vendorStatusId: [null, Validators.required],
      offeringIds: [[], Validators.required],
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
      vendorTypeId: vendor.vendorTypeId ?? null,
      vendorStatusId: vendor.vendorStatusId ?? null,
      offeringIds: (vendor.offerings ?? []).map((o) => Number(o.id)),
    });
  }

  getControl(name: string): FormControl {
    return this.form.get(name) as FormControl;
  }

  private loadLookups(): void {
    this.loadingLookups.set(true);
    let completed = 0;
    const done = () => {
      completed += 1;
      if (completed >= 3) this.loadingLookups.set(false);
    };

    this.api.getCommonLookupByType('VendorType').subscribe({
      next: (res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        this.vendorTypeOptions = items.map((i) => ({ label: i.name, value: i.id }));
      },
      error: () => {},
      complete: done,
    });

    this.api.getCommonLookupByType('VendorStatus').subscribe({
      next: (res) => {
        const items = Array.isArray(res.data) ? res.data : [];
        this.vendorStatusOptions = items.map((i) => ({ label: i.name, value: i.id }));
      },
      error: () => {},
      complete: done,
    });

    this.api.getCommonLookupByType('VendorOffering').subscribe({
      next: (res) => {
        this.offeringOptions = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {},
      complete: done,
    });
  }

  onToggleOffering(offeringId: number, checked: boolean): void {
    const current = Array.isArray(this.getControl('offeringIds').value)
      ? ([...this.getControl('offeringIds').value] as number[])
      : [];

    if (checked && !current.includes(offeringId)) current.push(offeringId);
    if (!checked) {
      const idx = current.indexOf(offeringId);
      if (idx >= 0) current.splice(idx, 1);
    }

    this.getControl('offeringIds').setValue(current);
    this.getControl('offeringIds').markAsTouched();
  }

  isOfferingSelected(offeringId: number): boolean {
    const current = this.getControl('offeringIds').value as number[];
    return Array.isArray(current) && current.includes(offeringId);
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
      vendorTypeId: number;
      vendorStatusId: number;
      offeringIds: number[];
    };

    const payload: CreateVendorRequest = {
      vendorName: raw.vendorName.trim(),
      vendorWebsite: raw.vendorWebsite.trim(),
      vendorTypeId: Number(raw.vendorTypeId),
      vendorStatusId: Number(raw.vendorStatusId),
      offeringIds: (raw.offeringIds ?? []).map((x) => Number(x)),
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
            this.toastr.success(res.message || 'Vendor updated successfully.');
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
          this.toastr.success(res.message || 'Vendor added successfully.');
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
}
