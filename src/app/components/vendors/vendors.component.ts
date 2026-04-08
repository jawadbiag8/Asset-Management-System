import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApiService, VendorListItem, VendorSummary } from '../../services/api.service';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../reusable/confirmation-dialog/confirmation-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vendors',
  templateUrl: './vendors.component.html',
  styleUrl: './vendors.component.scss',
  standalone: false,
})
export class VendorsComponent implements OnInit, OnDestroy {
  loading = signal(false);
  errorMessage = signal('');

  vendors = signal<VendorListItem[]>([]);
  summary = signal<VendorSummary | null>(null);

  searchTerm = signal('');
  pageSize = signal(10);
  pageIndex = signal(0);

  readonly filteredVendors = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.vendors();
    if (!term) return list;
    return list.filter((v) => {
      const offerings = (v.offerings ?? []).map((o) => o.name).join(' ').toLowerCase();
      return (
        (v.vendorName ?? '').toLowerCase().includes(term) ||
        (v.vendorWebsite ?? '').toLowerCase().includes(term) ||
        (v.vendorTypeName ?? '').toLowerCase().includes(term) ||
        (v.vendorStatusName ?? '').toLowerCase().includes(term) ||
        offerings.includes(term)
      );
    });
  });

  readonly pagedVendors = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredVendors().slice(start, start + this.pageSize());
  });

  readonly totalFiltered = computed(() => this.filteredVendors().length);

  constructor(
    private readonly api: ApiService,
    private readonly breadcrumb: BreadcrumbService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.breadcrumb.setCurrentLabel('Vendors');
    this.loadVendors();
  }

  ngOnDestroy(): void {
    this.breadcrumb.setCurrentLabel(null);
  }

  loadVendors(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api.getVendors().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.isSuccessful && res.data) {
          this.summary.set(res.data.summary ?? null);
          this.vendors.set(Array.isArray(res.data.data) ? res.data.data : []);
        } else {
          this.summary.set(null);
          this.vendors.set([]);
          this.errorMessage.set(res.message || 'Failed to load vendors.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.summary.set(null);
        this.vendors.set([]);
        this.errorMessage.set('Failed to load vendors.');
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  onPageChange(nextIndex: number): void {
    const max = this.totalPages() - 1;
    this.pageIndex.set(Math.max(0, Math.min(nextIndex, Math.max(max, 0))));
  }

  totalPages(): number {
    const total = this.totalFiltered();
    if (total <= 0) return 1;
    return Math.ceil(total / this.pageSize());
  }

  paginationStart(): number {
    const total = this.totalFiltered();
    if (total === 0) return 0;
    return this.pageIndex() * this.pageSize() + 1;
  }

  paginationEnd(): number {
    return Math.min((this.pageIndex() + 1) * this.pageSize(), this.totalFiltered());
  }

  isActive(status: string | null | undefined): boolean {
    return (status || '').toLowerCase() === 'active';
  }

  vendorCategory(v: VendorListItem): string {
    return (v.offerings ?? []).map((o) => o.name).join(', ') || 'N/A';
  }

  onViewVendor(vendor: VendorListItem): void {
    this.router.navigate(['/setup/vendors', vendor.id, 'profile']);
  }

  onEditVendor(vendor: VendorListItem): void {
    this.router.navigate(['/setup/vendors/new'], {
      state: { mode: 'edit', vendor },
    });
  }

  onDeleteVendor(vendor: VendorListItem): void {
    const name = vendor.vendorName ?? 'this vendor';
    const data: ConfirmationDialogData = {
      title: 'Delete vendor',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };
    this.dialog
      .open(ConfirmationDialogComponent, {
        width: '400px',
        data,
        disableClose: true,
        panelClass: 'app-confirmation-dialog-dark',
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.loading.set(true);
        this.api.deleteVendor(Number(vendor.id)).subscribe({
          next: (res) => {
            this.loading.set(false);
            if (!res?.isSuccessful) {
              this.toastr.error(res?.message ?? 'Could not delete vendor.');
              return;
            }
            this.toastr.success(res?.message ?? 'Vendor deleted successfully.');
            this.loadVendors();
          },
          error: () => {
            this.loading.set(false);
            this.toastr.error('Could not delete vendor.');
          },
        });
      });
  }
}


