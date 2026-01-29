import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { ApiService, ApiResponse } from '../../services/api.service';

@Component({
  selector: 'app-view-assets-detail',
  standalone: false,
  templateUrl: './view-assets-detail.component.html',
  styleUrl: './view-assets-detail.component.scss',
})
export class ViewAssetsDetailComponent implements OnInit {
  assetId: number | null = null;
  ministryId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
  ) {}

  ngOnInit() {
    // React only when id or ministryId change (not when incident filters change URL)
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      const ministryId = params['ministryId'];
      const idChanged = id != null && +id !== this.assetId;
      const ministryIdChanged =
        ministryId != null && +ministryId !== this.ministryId;
      if (id) this.assetId = +id;
      if (ministryId) this.ministryId = +ministryId;
      if (idChanged && this.assetId) this.loadAssetDashboard();
    });
  }

  /** Current route query params so incident filters can be initialised and stay in URL */
  get incidentQueryParams(): Params {
    return this.route.snapshot.queryParams;
  }

  /** When incident filters change, update URL query params. Empty/removed filters are removed from URL (null). */
  onIncidentQueryParamsChange(params: Params): void {
    const current = this.route.snapshot.queryParams;
    const merged: Params = { ...current, ...params };
    // Do not put pagination in URL for asset detail view
    const paginationKeys = ['pageNumber', 'pageSize', 'PageNumber', 'PageSize'];
    paginationKeys.forEach((k) => (merged[k] = null));
    // Remove incident filter keys from URL when value is empty so refresh doesn't re-apply them
    const keysToRemove = Object.keys(merged).filter(
      (k) =>
        k !== 'id' &&
        k !== 'ministryId' &&
        (merged[k] === '' || merged[k] == null),
    );
    keysToRemove.forEach((k) => (merged[k] = null));
    this.router.navigate([], {
      queryParams: merged,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Asset Details
  assetDetails = {
    assetName: '',
    url: '',
    ministry: '',
    department: '',
    citizenImpactLevel: '',
    currentStatus: '',
    lastOutage: '',
    currentHealth: '',
    riskExposureIndex: '',
  };

  // Summary KPIs
  summaryKpis = {
    citizenHappiness: 0,
    overallCompliance: 0,
    openIncidents: 0,
    highSeverityOpenIncidents: 0,
  };

  // Standards Compliance
  standardsCompliance: { name: string; status: string }[] = [];

  // Ownership & Accountability
  ownership = {
    ownerName: '',
    ownerEmail: '',
    ownerContact: '',
    technicalOwnerName: '',
    technicalOwnerEmail: '',
    technicalOwnerContact: '',
  };

  loadAssetDashboard() {
    if (!this.assetId) {
      console.error('Asset ID is required');
      return;
    }

    this.apiService.getAssetsDashboad(this.assetId).subscribe({
      next: (response: ApiResponse<any>) => {
        if (response.isSuccessful && response.data) {
          const d = response.data;

          // Map API response to assetDetails (dashboard header)
          this.assetDetails = {
            assetName: d.assetName ?? '',
            url: d.assetUrl ?? '',
            ministry: d.ministry ?? '',
            department: d.department ?? '',
            citizenImpactLevel: d.citizenImpactLevel ?? '',
            currentStatus: d.currentStatus ?? '',
            lastOutage: d.lastOutage ?? '',
            currentHealth: d.currentHealth ?? '',
            riskExposureIndex: d.riskExposureIndex ?? '',
          };

          // Map API response to summary KPIs
          this.summaryKpis = {
            citizenHappiness: Number(d.citizenHappinessMetric) ?? 0,
            overallCompliance: Number(d.overallComplianceMetric) ?? 0,
            openIncidents: Number(d.openIncidents) ?? 0,
            highSeverityOpenIncidents: Number(d.highSeverityOpenIncidents) ?? 0,
          };

          // Map API response to standards compliance (Compliance Overview)
          this.standardsCompliance = [
            {
              name: 'Accessibility & Inclusivity',
              status: d.accessibilityInclusivityStatus ?? 'N/A',
            },
            {
              name: 'Availability & Reliability',
              status: d.availabilityReliabilityStatus ?? 'N/A',
            },
            {
              name: 'Navigation & Discoverability',
              status: d.navigationDiscoverabilityStatus ?? 'N/A',
            },
            {
              name: 'Performance & Efficiency',
              status: d.performanceEfficiencyStatus ?? 'N/A',
            },
            {
              name: 'Security, Trust & Privacy',
              status: d.securityTrustPrivacyStatus ?? 'N/A',
            },
            {
              name: 'User Experience & Journey Quality',
              status: d.userExperienceJourneyQualityStatus ?? 'N/A',
            },
          ];

          // Map API response to ownership
          this.ownership = {
            ownerName: d.ownerName ?? '',
            ownerEmail: d.ownerEmail ?? '',
            ownerContact: d.ownerContact ?? '',
            technicalOwnerName: d.technicalOwnerName ?? '',
            technicalOwnerEmail: d.technicalOwnerEmail ?? '',
            technicalOwnerContact: d.technicalOwnerContact ?? '',
          };
        } else {
          console.error('API Error:', response.message);
        }
      },
      error: (error) => {
        console.error('Error loading asset dashboard:', error);
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'HIGH') {
      return 'status-badge-high';
    } else if (status === 'MEDIUM') {
      return 'status-badge-medium';
    } else if (status === 'LOW') {
      return 'status-badge-low';
    }
    return '';
  }

  /** Health / impact badge: show only LOW / HIGH / MEDIUM / UNKNOWN (strip extra text) */
  getHealthOrImpactBadgeLabel(value: string | undefined | null): string {
    if (!value) return 'UNKNOWN';
    const s = String(value).trim();
    const dash = s.indexOf(' - ');
    const short = dash >= 0 ? s.slice(0, dash).trim() : s;
    const upper = short.toUpperCase();
    if (
      upper === 'LOW' ||
      upper === 'HIGH' ||
      upper === 'MEDIUM' ||
      upper === 'UNKNOWN'
    )
      return upper;
    if (upper.includes('LOW')) return 'LOW';
    if (upper.includes('HIGH')) return 'HIGH';
    if (upper.includes('MEDIUM')) return 'MEDIUM';
    return 'UNKNOWN';
  }

  /** Citizen impact badge: show only LOW / HIGH / MEDIUM / UNKNOWN */
  getCitizenImpactBadgeLabel(value: string | undefined | null): string {
    return this.getHealthOrImpactBadgeLabel(value);
  }

  getBadgeColor(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk',
  ): string {
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
      // Same as citizen impact / risk: LOW=green, MEDIUM=yellow, HIGH=red, UNKNOWN=default
      if (upperValue.includes('LOW')) return 'var(--color-green-light)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow-light)';
      if (upperValue.includes('HIGH')) return 'var(--color-red-light)';
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

  getBadgeTextColor(
    value: string | undefined | null,
    type: 'citizenImpact' | 'health' | 'risk',
  ): string {
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
      // Same as citizen impact / risk: LOW=green, MEDIUM=yellow, HIGH=red, UNKNOWN=default
      if (upperValue.includes('LOW')) return 'var(--color-green-dark)';
      if (upperValue.includes('MEDIUM')) return 'var(--color-yellow)';
      if (upperValue.includes('HIGH')) return 'var(--color-red)';
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

  // Action Methods
  onAnalyze() {
    this.router.navigate(['/asset-control-panel'], {
      queryParams: {
        assetId: this.assetId != null ? this.assetId.toString() : '',
      },
    });
  }
}
