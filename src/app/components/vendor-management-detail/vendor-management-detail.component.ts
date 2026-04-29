import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ApiResponse,
  ApiService,
  VendorAssetScoreItem,
  VendorDetailData,
} from '../../services/api.service';

@Component({
  selector: 'app-vendor-management-detail',
  templateUrl: './vendor-management-detail.component.html',
  styleUrl: './vendor-management-detail.component.scss',
  standalone: false,
})
export class VendorManagementDetailComponent implements OnInit {
  loading = false;
  errorMessage = '';
  vendorId: number | null = null;
  vendor: VendorDetailData | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const parsed = Number(params.get('id'));
      this.vendorId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      if (!this.vendorId) {
        this.errorMessage = 'Valid vendor id is required.';
        this.vendor = null;
        return;
      }
      this.loadVendor(this.vendorId);
    });
  }

  get developedAssets(): VendorAssetScoreItem[] {
    return Array.isArray(this.vendor?.developedAssets) ? this.vendor!.developedAssets : [];
  }

  get hostingAssets(): VendorAssetScoreItem[] {
    return Array.isArray(this.vendor?.hostingAssets) ? this.vendor!.hostingAssets : [];
  }

  goBack(): void {
    this.router.navigate(['/vendor']);
  }

  getHostingTypeClass(hostingType: string | null | undefined): string {
    const normalized = String(hostingType ?? '').trim().toLowerCase();
    if (normalized.includes('on-prem') || normalized.includes('on premise') || normalized.includes('onprem')) {
      return 'hosting-pill--onprem';
    }
    if (normalized.includes('cloud')) {
      return 'hosting-pill--cloud';
    }
    if (normalized.includes('private') || normalized.includes('vendor')) {
      return 'hosting-pill--vendor';
    }
    return 'hosting-pill--default';
  }

  getScoreClass(score: string | null | undefined): string {
    const normalized = String(score ?? '').replace('%', '').trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return 'score-default';
    if (parsed >= 80) return 'score-good';
    if (parsed >= 50) return 'score-medium';
    return 'score-low';
  }

  getTopScoreToneClass(score: string | null | undefined): string {
    const normalized = String(score ?? '').replace('%', '').trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return 'top-score-na';
    if (parsed >= 80) return 'top-score-good';
    if (parsed >= 50) return 'top-score-warn';
    return 'top-score-bad';
  }

  getTopScoreBorderClass(score: string | null | undefined): string {
    const tone = this.getTopScoreToneClass(score);
    if (tone === 'top-score-good') return 'score-card-border-good';
    if (tone === 'top-score-warn') return 'score-card-border-warn';
    if (tone === 'top-score-bad') return 'score-card-border-bad';
    return 'score-card-border-na';
  }

  linkedWebsiteCount(): number {
    const value = this.vendor?.linkedWebsiteCount ?? this.vendor?.linkedAsset;
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  linkedAppsCount(): number {
    const value = this.vendor?.linkedAppsCount ?? this.vendor?.linkedAsset;
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  websiteScore(): string {
    return (
      this.vendor?.compositeWebsiteScore ??
      this.vendor?.overallDevelopmentScore ??
      'N/A'
    );
  }

  appsScore(): string {
    return (
      this.vendor?.compossiteAppsScore ??
      this.vendor?.overallHostingScore ??
      'N/A'
    );
  }

  private loadVendor(vendorId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.apiService.getVendorById(vendorId).subscribe({
      next: (response: ApiResponse<VendorDetailData>) => {
        this.loading = false;
        if (!response?.isSuccessful || !response?.data) {
          this.vendor = null;
          this.errorMessage = response?.message ?? 'Failed to load vendor details.';
          return;
        }
        this.vendor = response.data;
      },
      error: () => {
        this.loading = false;
        this.vendor = null;
        this.errorMessage = 'Failed to load vendor details.';
      },
    });
  }
}

