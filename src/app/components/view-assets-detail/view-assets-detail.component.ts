import { Component } from '@angular/core';

@Component({
  selector: 'app-view-assets-detail',
  standalone: false,
  templateUrl: './view-assets-detail.component.html',
  styleUrl: './view-assets-detail.component.scss',
})
export class ViewAssetsDetailComponent {
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

  // Action Methods
  onAnalyze() {
    console.log('Analyze clicked');
    // Implement analyze functionality
  }
}
