import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-view-assets-detail',
  standalone: false,
  templateUrl: './view-assets-detail.component.html',
  styleUrl: './view-assets-detail.component.scss',
})
export class ViewAssetsDetailComponent {

  assetId = signal<number>(0);

  constructor(private route: Router, private activatedRoute: ActivatedRoute) { }

  ngOnInit() {
    this.assetId.set(Number(this.activatedRoute.snapshot.queryParams['id']));
  }

  // Asset Details
  assetDetails = {
    type: 'Website',
    url: 'nespak.com.pk',
    ministry: 'Ministry of Health',
    department: 'Department Name',
    lastAssessed: 'Never',
    citizenImpactLevel: 'LOW',
    currentStatus: 'Down',
    lastOutage: '5 hours ago',
    currentHealth: 'AVERAGE',
    riskExposureIndex: 'HIGH RISK',
  };

  // Summary KPIs
  summaryKpis = {
    citizenHappiness: 100,
    overallCompliance: 100,
    openIncidents: 3,
    highSeverityOpenIncidents: 5,
  };

  // Standards Compliance
  standardsCompliance = [
    { name: 'Accessibility & Inclusivity', status: 'HIGH' },
    { name: 'Availability & Reliability', status: 'MEDIUM' },
    { name: 'Navigation & Discoverability', status: 'LOW' },
    { name: 'Performance & Efficiency', status: 'HIGH' },
    { name: 'Security, Trust & Privacy', status: 'MEDIUM' },
    { name: 'User Experience & Journey Quality', status: 'LOW' },
  ];

  // Ownership & Accountability
  ownership = {
    ownerName: 'Owner name Here',
    ownerEmail: 'owneremail@gov.com.pk',
    ownerContact: '+92 321 123 4567',
    technicalOwnerName: '',
    technicalOwnerEmail: '',
    technicalOwnerContact: '',
  };


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

  // Action Methods
  onAnalyze() {
    this.route.navigate(['/asset-control-panel'], {
      queryParams: {
        assetId: this.assetId().toString(),
      },
    });
  }
}
