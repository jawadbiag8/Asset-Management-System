import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbService } from '../../services/breadcrumb.service';
import { ApiService, VendorProfileAssetItem, VendorProfileData } from '../../services/api.service';

@Component({
  selector: 'app-vendor-detail',
  templateUrl: './vendor-detail.component.html',
  styleUrl: './vendor-detail.component.scss',
  standalone: false,
})
export class VendorDetailComponent implements OnInit, OnDestroy {
  loading = signal(false);
  error = signal<string | null>(null);
  detail = signal<VendorProfileData | null>(null);

  vendorId: number | null = null;

  readonly vendor = computed(() => this.detail()?.vendor ?? null);
  readonly summary = computed(() => this.detail()?.summary ?? null);
  readonly assets = computed(() => this.detail()?.assets?.data ?? []);

  readonly developedAssets = computed(() => this.assets().filter((a) => a.isDevelopmentVendor));
  readonly managedAssets = computed(() => this.assets().filter((a) => a.isManagingVendor));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly breadcrumb: BreadcrumbService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idRaw = params.get('id');
      const id = idRaw != null ? Number(idRaw) : NaN;
      this.vendorId = Number.isFinite(id) && id > 0 ? id : null;
      if (!this.vendorId) {
        this.error.set('Invalid vendor id.');
        this.detail.set(null);
        return;
      }
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.breadcrumb.setCurrentLabel(null);
  }

  load(): void {
    if (!this.vendorId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getVendorProfile(this.vendorId).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.isSuccessful && res.data) {
          this.detail.set(res.data);
          this.breadcrumb.setCurrentLabel(res.data.vendor?.vendorName || 'Vendor Detail');
        } else {
          this.detail.set(null);
          this.error.set(res.message || 'Could not load vendor profile.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.detail.set(null);
        this.error.set('Could not load vendor profile.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/setup/vendors']);
  }

  editVendor(): void {
    const v = this.vendor();
    if (!v) return;
    this.router.navigate(['/setup/vendors/new'], {
      state: { mode: 'edit', vendor: v },
    });
  }

  assetSubLine(a: VendorProfileAssetItem): string {
    const m = a.ministryName || 'N/A';
    const d = a.departmentName || '';
    return d ? `${m} / ${d}` : m;
  }
}
