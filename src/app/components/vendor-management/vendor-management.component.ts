import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiResponse, ApiService, VendorListData, VendorListItem } from '../../services/api.service';

type VendorFilter = 'all' | 'development' | 'hosting';

@Component({
  selector: 'app-vendor-management',
  templateUrl: './vendor-management.component.html',
  styleUrl: './vendor-management.component.scss',
  standalone: false,
})
export class VendorManagementComponent implements OnInit {
  loading = false;
  errorMessage = '';

  activeFilter: VendorFilter = 'all';
  vendors: VendorListItem[] = [];

  ngOnInit(): void {
    this.loadVendors('all');
  }

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {}

  setFilter(filter: VendorFilter): void {
    if (this.activeFilter === filter) return;
    this.loadVendors(filter);
  }

  onVendorNameClick(vendorId: number): void {
    if (!vendorId) return;
    this.router.navigate(['/vendor', vendorId]);
  }

  getLinkedWebsites(vendor: VendorListItem): number {
    const row = vendor as unknown as Record<string, unknown>;
    const value =
      row['linkedWebsiteCount'] ??
      row['linkedWebsitesCount'] ??
      row['websiteLinkedCount'] ??
      row['websitesCount'] ??
      row['linkedAsset'] ??
      row['linkedAssets'] ??
      row['linkedAssetsCount'] ??
      row['linkedAssetCount'] ??
      row['totalLinkedAssets'] ??
      row['totalLinkedAsset'] ??
      row['LinkedAssets'] ??
      row['LinkedAsset'] ??
      row['linked_Assets'] ??
      row['totalAssetsLinked'] ??
      row['assetsCount'] ??
      row['totalAssetsManaged'] ??
      0;
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getLinkedApps(vendor: VendorListItem): number {
    const row = vendor as unknown as Record<string, unknown>;
    const value =
      row['linkedAppsCount'] ??
      row['linkedApplicationsCount'] ??
      row['appLinkedCount'] ??
      row['appsCount'] ??
      row['linkedAsset'] ??
      row['linkedAssets'] ??
      row['linkedAssetsCount'] ??
      row['linkedAssetCount'] ??
      row['totalLinkedAssets'] ??
      row['totalLinkedAsset'] ??
      row['LinkedAssets'] ??
      row['LinkedAsset'] ??
      row['linked_Assets'] ??
      row['totalAssetsLinked'] ??
      row['assetsCount'] ??
      row['totalAssetsManaged'] ??
      0;
    const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getDevelopmentScore(vendor: VendorListItem): string {
    const row = vendor as unknown as Record<string, unknown>;
    const value =
      row['overallDevelopmentScore'] ??
      row['developmentScore'] ??
      row['overallDevScore'] ??
      row['compositeWebsiteScore'] ??
      row['websiteCompositeScore'] ??
      'N/A';
    return String(value);
  }

  getHostingScore(vendor: VendorListItem): string {
    const row = vendor as unknown as Record<string, unknown>;
    const value =
      row['overallHostingScore'] ??
      row['hostingScore'] ??
      row['overallHostScore'] ??
      row['compossiteAppsScore'] ??
      row['compositeAppsScore'] ??
      row['webAppCompositeScore'] ??
      'N/A';
    return String(value);
  }

  getVendorTypeClass(vendorType: string | null | undefined): string {
    const normalized = String(vendorType ?? '').trim().toLowerCase();
    if (normalized.includes('govt') || normalized.includes('government')) {
      return 'vendor-type-pill--govt';
    }
    if (normalized.includes('private')) {
      return 'vendor-type-pill--private';
    }
    return 'vendor-type-pill--default';
  }

  getScoreClass(scoreValue: string): string {
    const scoreText = String(scoreValue ?? '').replace('%', '').trim();
    const score = Number(scoreText);
    if (!Number.isFinite(score)) return 'score-default';
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  }

  private loadVendors(filter: VendorFilter): void {
    this.activeFilter = filter;
    this.loading = true;
    this.errorMessage = '';

    const request$ =
      filter === 'all'
        ? this.apiService.getVendorsByRole()
        : this.apiService.getVendorsByRole(filter);

    request$.subscribe({
      next: (response: ApiResponse<VendorListData>) => {
        this.loading = false;
        if (!response?.isSuccessful || !response?.data) {
          this.vendors = [];
          this.errorMessage = response?.message ?? 'Failed to load vendors.';
          return;
        }
        this.vendors = Array.isArray(response.data.data) ? response.data.data : [];
      },
      error: () => {
        this.loading = false;
        this.vendors = [];
        this.errorMessage = 'Failed to load vendors.';
      },
    });
  }
}

