import { Component, OnInit, signal } from '@angular/core';
import { BreadcrumbItem } from '../../reusable/reusable-breadcrum/reusable-breadcrum.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ApiResponse } from '../../../services/api.service';
import { UtilsService } from '../../../services/utils.service';

export interface PreviousPageMetadata {
  assetId: number;
}

export interface AssetControlPanelHeader {
  assetUrl: string;
  assetName: string;
  ministry: string;
  department: string;
  citizenImpactLevel: string;
  currentHealth: string;
  riskExposureIndex: string;
  currentStatus: string;
  lastOutage: string;
  ownerName: string;
  ownerEmail: string;
  ownerContact: string;
  technicalOwnerName: string;
  technicalOwnerEmail: string;
  technicalOwnerContact: string;
}

export interface KPI {
  kpiId: number;
  kpiName: string;
  target: string;
  currentValue: string;
  slaStatus: string;
  lastChecked: string;
  dataSource: string;
}

export interface KPICategory {
  categoryName: string;
  kpis: KPI[];
}

export interface AssetControlPanelData {
  header: AssetControlPanelHeader;
  kpiCategories: KPICategory[];
}


@Component({
  selector: 'app-asset-control-panel',
  templateUrl: './asset-control-panel.component.html',
  styleUrl: './asset-control-panel.component.scss',
  standalone: false,
})
export class AssetControlPanelComponent implements OnInit {

  previousPageMetadata = signal<PreviousPageMetadata>({
    assetId: 0
  });

  assetControlPanelData = signal<AssetControlPanelData | null>(null);

  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Ministries', path: '/assets/by-ministry' },
    { label: 'Ministry of Health', path: '/ministry-detail' },
    { label: 'Ministry Website', path: '/view-assets-detail' },
    { label: 'Compliance Report' }
  ];

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private api: ApiService,
    private utils: UtilsService
  ) { }

  ngOnInit(): void {
    // Fetch query parameters
    const assetId = this.activatedRoute.snapshot.queryParams['assetId'];
    this.previousPageMetadata.set({
      assetId: Number(assetId)
    });

    if (!assetId) {
      this.utils.showToast('Asset ID is required', 'Error', 'error');
      this.route.navigate(['/dashboard']);
      return;
    }

    this.loadAssetData();
  }

  loadAssetData(): void {
    this.api.getAssetControlPanelData(this.previousPageMetadata().assetId).subscribe({
      next: (response: ApiResponse<AssetControlPanelData>) => {
        if (response.isSuccessful) {
          this.assetControlPanelData.set(response.data as AssetControlPanelData);
          console.log(this.assetControlPanelData())
        } else {
          this.utils.showToast(response.message || 'Failed to load asset data', 'Error', 'error');
        }
      },
      error: (error: any) => {
        this.utils.showToast(error, 'Error loading asset data', 'error');
        this.route.navigate(['/dashboard']);
      }
    });
  }

  getBadgeColor(value: string | undefined | null, type: 'citizenImpact' | 'health' | 'risk'): string {
    if (!value) return 'var(--color-bg-quaternary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'health') {
      if (upperValue.includes('GOOD') || upperValue.includes('EXCELLENT')) return 'var(--color-green-light)';
      if (upperValue.includes('AVERAGE') || upperValue.includes('FAIR')) return 'var(--color-yellow-light)';
      if (upperValue.includes('POOR') || upperValue.includes('CRITICAL')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
      return 'var(--color-bg-quaternary)';
    }

    return 'var(--color-bg-quaternary)';
  }

  getBadgeTextColor(value: string | undefined | null, type: 'citizenImpact' | 'health' | 'risk'): string {
    if (!value) return 'var(--color-text-tertiary)';

    const upperValue = value.toUpperCase();

    // Check for unknown status
    if (upperValue.includes('UNKNOWN') || upperValue.includes('N/A')) {
      return 'var(--color-text-tertiary)';
    }

    if (type === 'citizenImpact') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'health') {
      if (upperValue.includes('GOOD') || upperValue.includes('EXCELLENT')) return 'var(--color-green-dark)';
      if (upperValue.includes('AVERAGE') || upperValue.includes('FAIR')) return 'var(--color-yellow)';
      if (upperValue.includes('POOR') || upperValue.includes('CRITICAL')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    if (type === 'risk') {
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
      return 'var(--color-text-tertiary)';
    }

    return 'var(--color-text-tertiary)';
  }

  getBadgeClass(badgeColor?: string): string {
    if (!badgeColor) return 'badge-success';

    // Extract color name from CSS variable to determine badge class
    if (badgeColor.includes('green')) return 'badge-success';
    if (badgeColor.includes('red')) return 'badge-danger';
    if (badgeColor.includes('yellow')) return 'badge-warning';

    return 'badge-success';
  }

  getStatusBoxClass(status: string | undefined | null): string {
    if (!status) return 'bg-light border border-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'bg-danger-subtle border border-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'bg-success-subtle border border-success';
    }
    return 'bg-light border border-secondary';
  }

  getStatusTextClass(status: string | undefined | null): string {
    if (!status) return 'text-secondary';

    const upperStatus = status.toUpperCase();
    if (upperStatus.includes('DOWN') || upperStatus.includes('OFFLINE')) {
      return 'text-danger';
    }
    if (upperStatus.includes('UP') || upperStatus.includes('ONLINE')) {
      return 'text-success';
    }
    return 'text-secondary';
  }

}
