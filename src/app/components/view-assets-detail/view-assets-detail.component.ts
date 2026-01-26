import { Component, OnInit } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import {
  TableConfig,
  TableColumn,
} from '../reusable/reusable-table/reusable-table.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-view-assets-detail',
  standalone: false,
  templateUrl: './view-assets-detail.component.html',
  styleUrl: './view-assets-detail.component.scss',
})
export class ViewAssetsDetailComponent implements OnInit {
  constructor(private apiService: ApiService) {}
  // Asset Details
  assetDetails = {
    type: 'Website',
    url: 'Gwadarport.gov.pk',
    ministry: 'Ministry of Health',
    department: 'Health Service Department',
    lastAssessed: 'Never',
  };

  // Overall Compliance
  overallCompliance = 100;

  // Summary KPIs
  summaryKpis = {
    overallCompliance: 100,
    activeBreaches: 0,
    criticalBreaches: 0,
    slaViolations: 0,
  };

  // Standards Compliance
  standardsCompliance = [
    { name: 'Availability & Performance', status: 'COMPLIANT', breaches: 0 },
    { name: 'Accessibility', status: 'PARTIAL', breaches: 1 },
    { name: 'Security', status: 'PARTIAL', breaches: 1 },
    { name: 'Privacy', status: 'PARTIAL', breaches: 1 },
    { name: 'Content Accuracy', status: 'PARTIAL', breaches: 1 },
    { name: 'User Experience', status: 'PARTIAL', breaches: 0 },
  ];

  // Compliance Table Data
  complianceTableData = [
    // {
    //   kpiName: 'Uptime Percentage',
    //   standardCategory: 'Availability & Performance',
    //   target: '99%',
    //   currentValue: '0.00%',
    //   status: 'WARNING',
    //   lastMeasured: 'Today',
    //   dataSource: 'Auto'
    // },
    // {
    //   kpiName: 'HTTPS Enforcement',
    //   standardCategory: 'Security',
    //   target: '100%',
    //   currentValue: '0.00%',
    //   status: 'BREACHED',
    //   lastMeasured: 'Never',
    //   dataSource: 'Manual'
    // },
    // {
    //   kpiName: 'WCAG Compliance',
    //   standardCategory: 'Accessibility',
    //   target: 'AA',
    //   currentValue: 'Partial',
    //   status: 'WARNING',
    //   lastMeasured: 'Never',
    //   dataSource: 'Manual'
    // }
  ];

  totalTableItems = 0; // Total items from server for pagination

  complianceTableConfig: TableConfig = {
    columns: [],
    data: [],
  };

  // Active Breaches
  activeBreaches: any[] = [];

  // Ownership & Accountability
  ownership = {
    businessOwner: {
      name: 'Mr. Ahmed',
      email: 'N/A',
    },
    technicalOwner: {
      name: '',
    },
    escalationLevel: 'P3 - Operational',
    hostingAuthority: 'NTC',
  };

  // Reported Incidents
  reportedIncidents: any[] = [];

  // Activity Log
  activityLog = [
    {
      description: 'Asset created and added to monitoring system',
      date: 'Jan 08, 2026',
      by: 'System',
    },
  ];

  ngOnInit() {
    this.initializeComplianceTable();
    // Set total items for server-side pagination
    this.totalTableItems = this.complianceTableData.length;
  }

  initializeComplianceTable() {
    this.complianceTableConfig = {
      columns: [
        {
          key: 'kpiName',
          header: 'KPI NAME',
          cellType: 'text',
          primaryField: 'kpiName',
          sortable: false,
          width: '200px',
        },
        {
          key: 'standardCategory',
          header: 'STANDARD CATEGORY',
          cellType: 'text',
          primaryField: 'standardCategory',
          sortable: false,
          width: '200px',
        },
        {
          key: 'target',
          header: 'TARGET',
          cellType: 'text',
          primaryField: 'target',
          sortable: false,
          width: '120px',
        },
        {
          key: 'currentValue',
          header: 'CURRENT VALUE',
          cellType: 'text',
          primaryField: 'currentValue',
          sortable: false,
          width: '150px',
        },
        {
          key: 'status',
          header: 'STATUS',
          cellType: 'badge',
          badgeField: 'status',
          badgeColor: (row: any) => this.getStatusBadgeColor(row),
          badgeTextColor: (row: any) => this.getStatusBadgeTextColor(row),
          sortable: false,
          width: '150px',
        },
        {
          key: 'lastMeasured',
          header: 'LAST MEASURED',
          cellType: 'text',
          primaryField: 'lastMeasured',
          sortable: false,
          width: '150px',
        },
        {
          key: 'dataSource',
          header: 'DATA SOURCE',
          cellType: 'text',
          primaryField: 'dataSource',
          sortable: false,
          width: '150px',
        },
      ],
      data: this.complianceTableData,
      minWidth: '1200px',
      serverSideSearch: true,
      defaultPage: 1,
      defaultPageSize: 10,
      emptyStateMessage: 'No compliance data available at this time.',
    };
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'COMPLIANT') {
      return 'status-badge-compliant';
    } else if (status === 'PARTIAL') {
      return 'status-badge-partial';
    }
    return '';
  }

  getStatusBadgeColor(row: any): string {
    const status = row.status;
    if (status === 'BREACHED') {
      return 'var(--color-red-light)'; // #FEE2E2 - light red background
    } else if (status === 'WARNING') {
      return 'var(--color-yellow-light)'; // #FEF3C7 - light yellow background
    } else if (status === 'COMPLIANT') {
      return 'var(--color-green-light)'; // #D1FAE5 - light green background
    }
    return '#F3F4F6'; // Default light grey
  }

  getStatusBadgeTextColor(row: any): string {
    const status = row.status;
    if (status === 'BREACHED') {
      return 'var(--color-red)'; // #EF4444 - red text
    } else if (status === 'WARNING') {
      return 'var(--color-yellow)'; // #B45346 - yellow/brown text
    } else if (status === 'COMPLIANT') {
      return 'var(--color-green-dark)'; // #065F46 - dark green text
    }
    return '#6B7280'; // Default grey text
  }

  // Action Methods
  onAnalyze() {
    console.log('Analyze clicked');
    // Implement analyze functionality
  }

  onDownloadReport() {
    console.log('Download Summary Report clicked');
    // Implement download functionality
  }

  onAddNote() {
    console.log('Add Note clicked');
    // Implement add note functionality
  }

  onFlagForReview() {
    console.log('Flag for Review clicked');
    // Implement flag for review functionality
  }

  onTriggerEscalation() {
    console.log('Trigger Escalation clicked');
    // Implement escalation functionality
  }

  onRefreshIncidents() {
    console.log('Refresh Incidents clicked');
    // Implement refresh functionality
  }

  onTableSearch(params: HttpParams) {
    // Handle server-side search/pagination
    // This will be called when user searches, changes page, or changes page size
    console.log('Table search params:', params);

    // Example API call (uncomment and implement when API is ready):
    // this.apiService.getComplianceData(params).subscribe((response: any) => {
    //   this.complianceTableConfig.data = response.data;
    //   this.totalTableItems = response.total;
    //   // Update config to trigger change detection
    //   this.complianceTableConfig = { ...this.complianceTableConfig };
    // });

    // For now, using mock data
    // In real implementation, replace this with actual API call
  }
}
