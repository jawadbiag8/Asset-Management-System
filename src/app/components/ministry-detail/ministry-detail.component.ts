import {
  Component,
  signal,
  computed,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import {
  TableConfig,
  TableColumn,
  FilterPill,
} from '../reusable/reusable-table/reusable-table.component';

export interface AssetDetail {
  id: number;
  ministry: string;
  department: string;
  websiteName: string;
  websiteUrl: string;
  currentStatus: string;
  currentStatusChecked: string;
  lastOutage: string;
  currentHealthStatus: string;
  currentHealthIcon: string;
  currentHealthPercentage: string;
  performanceStatus: string;
  performancePercentage: string;
  complianceStatus: string;
  compliancePercentage: string;
  riskExposureIndex: string;
  citizenImpactLevel: string;
  openIncidents: number;
  highSeverityIncidents: number;
}

@Component({
  selector: 'app-ministry-detail',
  standalone: false,
  templateUrl: './ministry-detail.component.html',
  styleUrl: './ministry-detail.component.scss',
})
export class MinistryDetailComponent implements AfterViewInit {
  tableFilters = signal<FilterPill[]>([
    {
      id: 'status',
      label: 'Status: All',
      value: 'All',
      paramKey: 'status',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Up', value: 'Up' },
        { label: 'Down', value: 'Down' },
      ],
    },
    {
      id: 'health',
      label: 'Health: All',
      value: 'All',
      paramKey: 'health',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Healthy', value: 'Healthy' },
        { label: 'Critical', value: 'Critical' },
        { label: 'Unknown', value: 'Unknown' },
      ],
    },
    {
      id: 'performance',
      label: 'Performance: All',
      value: 'All',
      paramKey: 'performance',
      options: [
        { label: 'All', value: 'All' },
        { label: 'Performing Well', value: 'Performing Well' },
        { label: 'Average', value: 'Average' },
        { label: 'Poor', value: 'Poor' },
      ],
    },
    {
      id: 'compliance',
      label: 'Compliance: All',
      value: 'All',
      paramKey: 'compliance',
      options: [
        { label: 'All', value: 'All' },
        { label: 'High Compliance', value: 'High Compliance' },
        { label: 'Medium Compliance', value: 'Medium Compliance' },
        { label: 'Low Compliance', value: 'Low Compliance' },
      ],
    },
    {
      id: 'riskIndex',
      label: 'Risk Index: All',
      value: 'All',
      paramKey: 'riskIndex',
      options: [
        { label: 'All', value: 'All' },
        { label: 'LOW RISK', value: 'LOW RISK' },
        { label: 'MEDIUM RISK', value: 'MEDIUM RISK' },
        { label: 'HIGH RISK', value: 'HIGH RISK' },
      ],
    },
    {
      id: 'citizenImpact',
      label: 'Citizen Impact: All',
      value: 'All',
      paramKey: 'citizenImpact',
      options: [
        { label: 'All', value: 'All' },
        { label: 'LOW', value: 'LOW' },
        { label: 'MEDIUM', value: 'MEDIUM' },
        { label: 'HIGH', value: 'HIGH' },
      ],
    },
  ]);

  summaryCards = signal([
    {
      id: 1,
      value: '7',
      title: 'Total Assets',
      subTitle: 'Active monitoring across all departments',
      linkText: 'View All >',
    },
    {
      id: 2,
      value: '14',
      title: 'Total incidents',
      subTitle: 'Incidents across all departments',
      linkText: 'View all incidents >',
    },
    {
      id: 3,
      value: '8',
      badge: '8/14',
      title: 'Open incidents',
      subTitle: 'Active unresolved incidents',
      linkText: 'View open incidents >',
    },
    {
      id: 4,
      value: '2',
      badge: '2/8',
      badgeColor: 'red',
      title: 'High severity open incidents',
      subTitle: 'Active high severity unresolved incidents',
      linkText: 'View critical assets >',
    },
  ]);

  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  constructor(private router: Router) {}

  tableConfig = signal<TableConfig>({
    minWidth: '1400px',
    searchPlaceholder: 'Search assets',
    serverSideSearch: true,
    defaultPageSize: 10,
    columns: [
      {
        key: 'analyze',
        header: 'ANALYZE',
        cellType: 'icon',
        iconName: 'bar_chart',
        iconColor: 'var(--color-blue-dark)',
        iconBgColor: 'var(--color-blue-light)',
        sortable: true,
      },
      {
        key: 'ministryDepartment',
        header: 'MINISTRY / DEPARTMENT',
        cellType: 'two-line',
        primaryField: 'ministry',
        secondaryField: 'department',
        sortable: true,
      },
      {
        key: 'websiteApplication',
        header: 'WEBSITE / APPLICATION',
        cellType: 'link',
        primaryField: 'websiteName',
        linkField: 'websiteUrl',
        sortable: true,
      },
      {
        key: 'currentStatus',
        header: 'CURRENT STATUS',
        cellType: 'badge-with-subtext',
        badgeField: 'currentStatus',
        subtextField: 'currentStatusChecked',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
      {
        key: 'lastOutage',
        header: 'LAST OUTAGE',
        cellType: 'text',
        primaryField: 'lastOutage',
        sortable: true,
      },
      {
        key: 'currentHealth',
        header: 'CURRENT HEALTH',
        cellType: 'health-status',
        healthStatusField: 'currentHealthStatus',
        healthIconField: 'currentHealthIcon',
        healthPercentageField: 'currentHealthPercentage',
        sortable: true,
      },
      {
        key: 'performanceStatus',
        header: 'PERFORMANCE STATUS',
        cellType: 'two-line',
        primaryField: 'performanceStatus',
        secondaryField: 'performancePercentage',
        sortable: true,
      },
      {
        key: 'complianceStatus',
        header: 'COMPLIANCE STATUS',
        cellType: 'two-line',
        primaryField: 'complianceStatus',
        secondaryField: 'compliancePercentage',
        sortable: true,
      },
      {
        key: 'riskExposureIndex',
        header: 'RISK EXPOSURE INDEX',
        cellType: 'badge',
        badgeField: 'riskExposureIndex',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
      {
        key: 'citizenImpactLevel',
        header: 'CITIZEN IMPACT LEVEL',
        cellType: 'badge',
        badgeField: 'citizenImpactLevel',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
      {
        key: 'openIncidents',
        header: 'OPEN INCIDENTS',
        cellType: 'badge-with-subtext',
        badgeField: 'openIncidents',
        subtextField: 'highSeverityText',
        badgeColor: 'var(--color-green-light)',
        badgeTextColor: 'var(--color-green-dark)',
        sortable: true,
      },
    ],
    data: [],
  });

  assetDetails = signal<AssetDetail[]>([
    {
      id: 1,
      ministry: 'Ministry of Health',
      department: 'Health Service Department',
      websiteName: 'Department Website',
      websiteUrl: 'nespak.com.pk',
      currentStatus: 'Up',
      currentStatusChecked: 'Checked 2 hours ago',
      lastOutage: '5 hours ago',
      currentHealthStatus: 'Healthy',
      currentHealthIcon: 'check_circle',
      currentHealthPercentage: 'Health Index: 85%',
      performanceStatus: 'Performing Well',
      performancePercentage: 'Performance Index: 92%',
      complianceStatus: 'High Compliance',
      compliancePercentage: 'Compliance Index: 88%',
      riskExposureIndex: 'LOW RISK',
      citizenImpactLevel: 'LOW',
      openIncidents: 5,
      highSeverityIncidents: 2,
    },
    {
      id: 2,
      ministry: 'Ministry of Health',
      department: 'Health Service Department',
      websiteName: 'Department Website',
      websiteUrl: 'health.gov.pk',
      currentStatus: 'Down',
      currentStatusChecked: 'Checked 2 minutes ago',
      lastOutage: '2 minutes ago',
      currentHealthStatus: 'Critical',
      currentHealthIcon: 'error',
      currentHealthPercentage: 'Health Index: 45%',
      performanceStatus: 'Poor',
      performancePercentage: 'Performance Index: 38%',
      complianceStatus: 'Low Compliance',
      compliancePercentage: 'Compliance Index: 42%',
      riskExposureIndex: 'HIGH RISK',
      citizenImpactLevel: 'HIGH',
      openIncidents: 3,
      highSeverityIncidents: 1,
    },
    {
      id: 3,
      ministry: 'Ministry of Health',
      department: 'Health Service Department',
      websiteName: 'Department Website',
      websiteUrl: 'example.com',
      currentStatus: 'Up',
      currentStatusChecked: 'Checked 1 day ago',
      lastOutage: '1 day ago',
      currentHealthStatus: 'Average',
      currentHealthIcon: 'warning',
      currentHealthPercentage: 'Health Index: 72%',
      performanceStatus: 'Average',
      performancePercentage: 'Performance Index: 65%',
      complianceStatus: 'Medium Compliance',
      compliancePercentage: 'Compliance Index: 70%',
      riskExposureIndex: 'MEDIUM RISK',
      citizenImpactLevel: 'MEDIUM',
      openIncidents: 0,
      highSeverityIncidents: 0,
    },
  ]);

  // Computed signal to keep table config in sync with data
  tableConfigWithData = computed<TableConfig>(() => {
    const data = this.assetDetails().map((asset) => ({
      ...asset,
      highSeverityText: `High severity: ${asset.highSeverityIncidents}`,
    }));
    return {
      ...this.tableConfig(),
      data: data,
    };
  });

  loadAssets(searchParams: HttpParams) {
    // Handle server-side search if needed
    // API call will be made here when needed
    console.log('Search params:', searchParams);
  }

  onAddAsset() {
    // Navigate to add digital assets page
    this.router.navigate(['/add-digital-assets']);
  }

  ngAfterViewInit() {
    // Apply colors to badges based on values
    setTimeout(() => {
      this.applyBadgeColors();
    }, 0);
  }

  private applyBadgeColors() {
    if (!this.tableContainer) return;

    // Apply colors to CURRENT STATUS badges
    const statusBadges = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:nth-child(4) .badge',
    );
    statusBadges.forEach((badge: HTMLElement) => {
      const text = badge.textContent?.trim();
      if (text === 'Up') {
        badge.style.backgroundColor = 'var(--color-green-light)';
        badge.style.color = 'var(--color-green-dark)';
      } else if (text === 'Down') {
        badge.style.backgroundColor = 'var(--color-red-light)';
        badge.style.color = 'var(--color-red)';
      }
    });

    // Apply colors to RISK EXPOSURE INDEX badges
    const riskBadges = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:nth-child(9) .badge',
    );
    riskBadges.forEach((badge: HTMLElement) => {
      const text = badge.textContent?.trim();
      if (text === 'LOW RISK') {
        badge.style.backgroundColor = 'var(--color-green-light)';
        badge.style.color = 'var(--color-green-dark)';
      } else if (text === 'MEDIUM RISK') {
        badge.style.backgroundColor = 'var(--color-yellow-light)';
        badge.style.color = 'var(--color-yellow-dark)';
      } else if (text === 'HIGH RISK') {
        badge.style.backgroundColor = 'var(--color-red-light)';
        badge.style.color = 'var(--color-red)';
      } else if (text === 'UNKNOWN') {
        badge.style.backgroundColor = 'var(--color-gray-light)';
        badge.style.color = 'var(--color-gray-dark)';
      }
    });

    // Apply colors to CITIZEN IMPACT LEVEL badges
    const impactBadges = this.tableContainer.nativeElement.querySelectorAll(
      '.assets-table td[mat-cell]:nth-child(10) .badge',
    );
    impactBadges.forEach((badge: HTMLElement) => {
      const text = badge.textContent?.trim();
      if (text === 'LOW') {
        badge.style.backgroundColor = 'var(--color-green-light)';
        badge.style.color = 'var(--color-green-dark)';
      } else if (text === 'MEDIUM') {
        badge.style.backgroundColor = 'var(--color-yellow-light)';
        badge.style.color = 'var(--color-yellow-dark)';
      } else if (text === 'HIGH') {
        badge.style.backgroundColor = 'var(--color-red-light)';
        badge.style.color = 'var(--color-red)';
      }
    });
  }
}
